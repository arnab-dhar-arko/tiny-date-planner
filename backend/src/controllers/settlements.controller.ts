import type { Response } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import type { AuthRequest } from "../types.js";
import { HttpError, requireUser } from "../utils/http.js";

const settlementSchema = z.object({
  trip_id: z.string().uuid(),
  from_user_id: z.string().uuid(),
  to_user_id: z.string().uuid(),
  amount: z.number().positive()
});

export async function createSettlement(req: AuthRequest, res: Response) {
  const user = requireUser(req.user);
  const input = settlementSchema.parse(req.body);
  await assertTripMember(input.trip_id, user.id);
  const created = await pool.query(
    `INSERT INTO settlements (trip_id, from_user_id, to_user_id, amount)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.trip_id, input.from_user_id, input.to_user_id, input.amount]
  );
  res.status(201).json({ settlement: created.rows[0] });
}

export async function listSettlements(req: AuthRequest, res: Response) {
  const user = requireUser(req.user);
  const tripId = z.string().uuid().parse(req.params.tripId);
  await assertTripMember(tripId, user.id);
  const settlements = await pool.query(
    "SELECT * FROM settlements WHERE trip_id = $1 ORDER BY timestamp DESC",
    [tripId]
  );
  res.json({ settlements: settlements.rows });
}

async function assertTripMember(tripId: string, userId: string) {
  const result = await pool.query("SELECT 1 FROM trip_members WHERE trip_id = $1 AND user_id = $2", [tripId, userId]);
  if (result.rowCount === 0) throw new HttpError(403, "You are not a member of this trip.");
}
