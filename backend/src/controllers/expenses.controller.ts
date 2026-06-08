import type { Response } from "express";
import { z } from "zod";
import { pool, withTransaction } from "../db/pool.js";
import type { AuthRequest } from "../types.js";
import { HttpError, requireUser } from "../utils/http.js";
import { calculateNetBalances, simplifyDebts } from "../utils/balances.js";

const splitSchema = z.object({
  user_id: z.string().uuid(),
  amount_owed: z.number().nonnegative()
});

const expenseSchema = z.object({
  trip_id: z.string().uuid(),
  paid_by_user_id: z.string().uuid(),
  title: z.string().min(1).max(140),
  category: z.string().min(1).max(60),
  amount_base: z.number().nonnegative(),
  amount_local: z.number().nonnegative(),
  local_currency: z.string().length(3),
  exchange_rate: z.number().positive(),
  split_type: z.enum(["equal", "exact", "percentage"]).default("equal"),
  splits: z.array(splitSchema).min(1).max(5)
});

export async function listExpenses(req: AuthRequest, res: Response) {
  const user = requireUser(req.user);
  const tripId = z.string().uuid().parse(req.params.tripId);
  await assertTripMember(tripId, user.id);
  const expenses = await pool.query(
    `SELECT e.*, COALESCE(json_agg(es.*) FILTER (WHERE es.id IS NOT NULL), '[]') AS splits
     FROM expenses e
     LEFT JOIN expense_splits es ON es.expense_id = e.id
     WHERE e.trip_id = $1
     GROUP BY e.id
     ORDER BY e.created_at DESC`,
    [tripId]
  );
  res.json({ expenses: expenses.rows });
}

export async function createExpense(req: AuthRequest, res: Response) {
  const user = requireUser(req.user);
  const input = expenseSchema.parse(req.body);
  await assertTripMember(input.trip_id, user.id);
  const owedTotal = input.splits.reduce((sum, split) => sum + Math.round(split.amount_owed * 100), 0);
  if (owedTotal !== Math.round(input.amount_base * 100)) {
    throw new HttpError(400, "Split amounts must equal the base expense amount");
  }

  const expense = await withTransaction(async (client) => {
    const created = await client.query(
      `INSERT INTO expenses
       (trip_id, paid_by_user_id, title, category, amount_base, amount_local, local_currency, exchange_rate, split_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        input.trip_id,
        input.paid_by_user_id,
        input.title,
        input.category,
        input.amount_base,
        input.amount_local,
        input.local_currency.toUpperCase(),
        input.exchange_rate,
        input.split_type
      ]
    );

    for (const split of input.splits) {
      await client.query(
        `INSERT INTO expense_splits (expense_id, user_id, amount_owed)
         VALUES ($1, $2, $3)`,
        [created.rows[0].id, split.user_id, split.amount_owed]
      );
    }

    return created.rows[0];
  });

  res.status(201).json({ expense });
}

export async function getBalances(req: AuthRequest, res: Response) {
  const user = requireUser(req.user);
  const tripId = z.string().uuid().parse(req.params.tripId);
  await assertTripMember(tripId, user.id);

  const rows = await pool.query(
    `SELECT
      tm.user_id,
      COALESCE(paid.total, 0)::float AS paid,
      COALESCE(owed.total, 0)::float AS owed,
      COALESCE(sent.total, 0)::float AS sent,
      COALESCE(received.total, 0)::float AS received
     FROM trip_members tm
     LEFT JOIN (
       SELECT paid_by_user_id AS user_id, SUM(amount_base) AS total FROM expenses WHERE trip_id = $1 GROUP BY paid_by_user_id
     ) paid ON paid.user_id = tm.user_id
     LEFT JOIN (
       SELECT es.user_id, SUM(es.amount_owed) AS total
       FROM expense_splits es JOIN expenses e ON e.id = es.expense_id
       WHERE e.trip_id = $1 GROUP BY es.user_id
     ) owed ON owed.user_id = tm.user_id
     LEFT JOIN (
       SELECT from_user_id AS user_id, SUM(amount) AS total FROM settlements WHERE trip_id = $1 GROUP BY from_user_id
     ) sent ON sent.user_id = tm.user_id
     LEFT JOIN (
       SELECT to_user_id AS user_id, SUM(amount) AS total FROM settlements WHERE trip_id = $1 GROUP BY to_user_id
     ) received ON received.user_id = tm.user_id
     WHERE tm.trip_id = $1
     ORDER BY tm.joined_at ASC`,
    [tripId]
  );

  const balances = calculateNetBalances(rows.rows);
  res.json({ balances, suggestions: simplifyDebts(balances) });
}

async function assertTripMember(tripId: string, userId: string) {
  const result = await pool.query("SELECT 1 FROM trip_members WHERE trip_id = $1 AND user_id = $2", [tripId, userId]);
  if (result.rowCount === 0) throw new HttpError(403, "You are not a member of this trip.");
}
