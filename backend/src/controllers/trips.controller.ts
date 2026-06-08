import type { Response } from "express";
import { z } from "zod";
import { pool, withTransaction } from "../db/pool.js";
import type { AuthRequest } from "../types.js";
import { HttpError, requireUser } from "../utils/http.js";

const tripSchema = z.object({
  name: z.string().min(1).max(120),
  total_budget: z.number().nonnegative(),
  start_date: z.string(),
  end_date: z.string(),
  base_currency: z.string().length(3),
  is_group: z.boolean().default(false),
  member_user_ids: z.array(z.string().uuid()).max(5).default([])
});

export async function listTrips(req: AuthRequest, res: Response) {
  const user = requireUser(req.user);
  const trips = await pool.query(
    `SELECT t.*
     FROM trips t
     JOIN trip_members tm ON tm.trip_id = t.id
     WHERE tm.user_id = $1
     ORDER BY t.created_at DESC`,
    [user.id]
  );
  res.json({ trips: trips.rows });
}

export async function getTripSnapshot(req: AuthRequest, res: Response) {
  const user = requireUser(req.user);
  const tripId = z.string().uuid().parse(req.params.tripId);
  await assertTripMember(tripId, user.id);

  const [trip, members, expenses, settlements] = await Promise.all([
    pool.query("SELECT * FROM trips WHERE id = $1", [tripId]),
    pool.query(
      `SELECT tm.trip_id, tm.user_id, tm.display_name, tm.role, u.email
       FROM trip_members tm
       JOIN users u ON u.id = tm.user_id
       WHERE tm.trip_id = $1
       ORDER BY tm.joined_at ASC`,
      [tripId]
    ),
    pool.query(
      `SELECT e.*, COALESCE(json_agg(es.*) FILTER (WHERE es.id IS NOT NULL), '[]') AS splits
       FROM expenses e
       LEFT JOIN expense_splits es ON es.expense_id = e.id
       WHERE e.trip_id = $1
       GROUP BY e.id
       ORDER BY e.created_at DESC`,
      [tripId]
    ),
    pool.query("SELECT * FROM settlements WHERE trip_id = $1 ORDER BY timestamp DESC", [tripId])
  ]);

  if (trip.rowCount === 0) throw new HttpError(404, "Trip not found");
  res.json({ trip: trip.rows[0], members: members.rows, expenses: expenses.rows, settlements: settlements.rows });
}

export async function createTrip(req: AuthRequest, res: Response) {
  const user = requireUser(req.user);
  const input = tripSchema.parse(req.body);
  const memberIds = Array.from(new Set([user.id, ...input.member_user_ids])).slice(0, 5);

  const trip = await withTransaction(async (client) => {
    const created = await client.query(
      `INSERT INTO trips (owner_user_id, name, total_budget, start_date, end_date, base_currency, is_group)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [user.id, input.name, input.total_budget, input.start_date, input.end_date, input.base_currency.toUpperCase(), input.is_group]
    );

    for (const userId of memberIds) {
      const member = await client.query("SELECT name FROM users WHERE id = $1", [userId]);
      if (member.rowCount === 0) continue;
      await client.query(
        `INSERT INTO trip_members (trip_id, user_id, display_name, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (trip_id, user_id) DO NOTHING`,
        [created.rows[0].id, userId, member.rows[0].name, userId === user.id ? "owner" : "member"]
      );
    }

    return created.rows[0];
  });

  res.status(201).json({ trip });
}

export async function getTripMembers(req: AuthRequest, res: Response) {
  const user = requireUser(req.user);
  const tripId = z.string().uuid().parse(req.params.tripId);
  await assertTripMember(tripId, user.id);
  const members = await pool.query(
    `SELECT tm.trip_id, tm.user_id, tm.display_name, tm.role, u.email
     FROM trip_members tm
     JOIN users u ON u.id = tm.user_id
     WHERE tm.trip_id = $1
     ORDER BY tm.joined_at ASC`,
    [tripId]
  );
  res.json({ members: members.rows });
}

const addMemberSchema = z.object({
  email: z.string().email()
});

export async function addTripMemberByEmail(req: AuthRequest, res: Response) {
  const user = requireUser(req.user);
  const tripId = z.string().uuid().parse(req.params.tripId);
  const input = addMemberSchema.parse(req.body);
  await assertTripOwner(tripId, user.id);

  const added = await withTransaction(async (client) => {
    const target = await client.query("SELECT id, name, email FROM users WHERE email = $1", [input.email]);
    if (target.rowCount === 0) throw new HttpError(404, "No user found with that email. Ask your friend to sign up first.");

    const count = await client.query("SELECT COUNT(*)::int AS count FROM trip_members WHERE trip_id = $1", [tripId]);
    if (count.rows[0].count >= 5) throw new HttpError(400, "Group trips support up to 5 people.");

    await client.query(
      `INSERT INTO trip_members (trip_id, user_id, display_name, role)
       VALUES ($1, $2, $3, 'member')
       ON CONFLICT (trip_id, user_id) DO UPDATE SET display_name = EXCLUDED.display_name`,
      [tripId, target.rows[0].id, target.rows[0].name]
    );
    await client.query("UPDATE trips SET is_group = true WHERE id = $1", [tripId]);

    return {
      trip_id: tripId,
      user_id: target.rows[0].id,
      display_name: target.rows[0].name,
      email: target.rows[0].email,
      role: "member"
    };
  });

  res.status(201).json({ member: added });
}

export async function removeTripMember(req: AuthRequest, res: Response) {
  const user = requireUser(req.user);
  const tripId = z.string().uuid().parse(req.params.tripId);
  const memberId = z.string().uuid().parse(req.params.userId);
  await assertTripOwner(tripId, user.id);
  if (memberId === user.id) throw new HttpError(400, "Owner cannot remove themselves.");
  await pool.query("DELETE FROM trip_members WHERE trip_id = $1 AND user_id = $2", [tripId, memberId]);
  res.status(204).send();
}

async function assertTripMember(tripId: string, userId: string) {
  const result = await pool.query("SELECT 1 FROM trip_members WHERE trip_id = $1 AND user_id = $2", [tripId, userId]);
  if (result.rowCount === 0) throw new HttpError(403, "You are not a member of this trip.");
}

async function assertTripOwner(tripId: string, userId: string) {
  const result = await pool.query("SELECT 1 FROM trip_members WHERE trip_id = $1 AND user_id = $2 AND role = 'owner'", [tripId, userId]);
  if (result.rowCount === 0) throw new HttpError(403, "Only the trip owner can manage members.");
}
