import type { Response } from "express";
import { z } from "zod";
import type pg from "pg";
import { pool, withTransaction } from "../db/pool.js";
import type { AuthRequest } from "../types.js";
import { requireUser } from "../utils/http.js";

const syncPushSchema = z.object({
  events: z.array(z.object({
    entity_type: z.enum(["trips", "expenses", "expense_splits", "settlements"]),
    entity_id: z.string().uuid(),
    operation: z.enum(["upsert", "delete"]),
    payload: z.record(z.unknown())
  })).max(200)
});

export async function pushSyncEvents(req: AuthRequest, res: Response) {
  const user = requireUser(req.user);
  const input = syncPushSchema.parse(req.body);
  const ids = await withTransaction(async (client) => {
    const eventIds: number[] = [];

    for (const event of input.events) {
      await applySyncEvent(client, user.id, event);
      const inserted = await client.query(
        `INSERT INTO sync_events (user_id, entity_type, entity_id, operation, payload)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [user.id, event.entity_type, event.entity_id, event.operation, event.payload]
      );
      eventIds.push(inserted.rows[0].id);
    }

    return eventIds;
  });

  res.status(202).json({ accepted: ids.length, event_ids: ids });
}

export async function pullSyncEvents(req: AuthRequest, res: Response) {
  const user = requireUser(req.user);
  const since = z.coerce.number().int().nonnegative().default(0).parse(req.query.since ?? 0);
  const events = await pool.query(
    `SELECT id, entity_type, entity_id, operation, payload, created_at
     FROM sync_events
     WHERE user_id = $1 AND id > $2
     ORDER BY id ASC
     LIMIT 500`,
    [user.id, since]
  );
  res.json({ events: events.rows, cursor: events.rows.at(-1)?.id ?? since });
}

async function applySyncEvent(
  client: pg.PoolClient,
  userId: string,
  event: z.infer<typeof syncPushSchema>["events"][number]
) {
  if (event.operation === "delete") {
    const table = event.entity_type;
    await client.query(`DELETE FROM ${table} WHERE id = $1`, [event.entity_id]);
    return;
  }

  if (event.entity_type === "trips") {
    const payload = event.payload as Record<string, unknown> & { members?: Array<Record<string, unknown>> };
    await client.query(
      `INSERT INTO trips (id, owner_user_id, name, total_budget, start_date, end_date, base_currency, is_group)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         total_budget = EXCLUDED.total_budget,
         start_date = EXCLUDED.start_date,
         end_date = EXCLUDED.end_date,
         base_currency = EXCLUDED.base_currency,
         is_group = EXCLUDED.is_group`,
      [
        event.entity_id,
        payload.owner_user_id ?? userId,
        payload.name,
        payload.total_budget,
        payload.start_date,
        payload.end_date,
        payload.base_currency,
        payload.is_group
      ]
    );
    for (const member of payload.members ?? []) {
      await client.query(
        `INSERT INTO trip_members (trip_id, user_id, display_name, role)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (trip_id, user_id) DO UPDATE SET
           display_name = EXCLUDED.display_name,
           role = EXCLUDED.role`,
        [event.entity_id, member.user_id, member.display_name, member.role ?? "member"]
      );
    }
    return;
  }

  if (event.entity_type === "expenses") {
    const payload = event.payload as Record<string, unknown> & { splits?: Array<Record<string, unknown>> };
    await client.query(
      `INSERT INTO expenses
       (id, trip_id, paid_by_user_id, title, category, amount_base, amount_local, local_currency, exchange_rate, split_type, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,COALESCE($11::timestamptz, now()))
       ON CONFLICT (id) DO UPDATE SET
         paid_by_user_id = EXCLUDED.paid_by_user_id,
         title = EXCLUDED.title,
         category = EXCLUDED.category,
         amount_base = EXCLUDED.amount_base,
         amount_local = EXCLUDED.amount_local,
         local_currency = EXCLUDED.local_currency,
         exchange_rate = EXCLUDED.exchange_rate,
         split_type = EXCLUDED.split_type`,
      [
        event.entity_id,
        payload.trip_id,
        payload.paid_by_user_id,
        payload.title,
        payload.category,
        payload.amount_base,
        payload.amount_local,
        payload.local_currency,
        payload.exchange_rate,
        payload.split_type,
        payload.created_at
      ]
    );
    await client.query("DELETE FROM expense_splits WHERE expense_id = $1", [event.entity_id]);
    for (const split of payload.splits ?? []) {
      await client.query(
        `INSERT INTO expense_splits (id, expense_id, user_id, amount_owed)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (expense_id, user_id) DO UPDATE SET amount_owed = EXCLUDED.amount_owed`,
        [split.id, event.entity_id, split.user_id, split.amount_owed]
      );
    }
    return;
  }

  if (event.entity_type === "settlements") {
    const payload = event.payload as Record<string, unknown>;
    await client.query(
      `INSERT INTO settlements (id, trip_id, from_user_id, to_user_id, amount, timestamp)
       VALUES ($1,$2,$3,$4,$5,COALESCE($6::timestamptz, now()))
       ON CONFLICT (id) DO UPDATE SET amount = EXCLUDED.amount`,
      [event.entity_id, payload.trip_id, payload.from_user_id, payload.to_user_id, payload.amount, payload.timestamp]
    );
  }
}
