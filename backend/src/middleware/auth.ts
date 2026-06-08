import type { NextFunction, Response } from "express";
import { pool } from "../db/pool.js";
import type { AuthRequest } from "../types.js";
import { verifyAccessToken } from "../utils/jwt.js";

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;
  if (!token) return res.status(401).json({ error: "Missing bearer token" });

  try {
    const payload = verifyAccessToken(token);
    const userId = String(payload.sub);
    const user = await pool.query(
      "SELECT id, email, name, currency_preference FROM users WHERE id = $1",
      [userId]
    );
    if (user.rowCount === 0) return res.status(401).json({ error: "Invalid token user" });
    req.user = user.rows[0];
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
