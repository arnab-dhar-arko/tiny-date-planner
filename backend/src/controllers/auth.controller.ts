import type { Request, Response } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { signAccessToken } from "../utils/jwt.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { HttpError } from "../utils/http.js";

const signupSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  currency_preference: z.string().length(3).default("USD")
});

const loginSchema = signupSchema.pick({ email: true, password: true });

export async function signup(req: Request, res: Response) {
  const input = signupSchema.parse(req.body);
  const passwordHash = await hashPassword(input.password);

  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, currency_preference)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, currency_preference`,
    [input.name, input.email, passwordHash, input.currency_preference.toUpperCase()]
  );
  const user = result.rows[0];
  res.status(201).json({ user, token: signAccessToken(user) });
}

export async function login(req: Request, res: Response) {
  const input = loginSchema.parse(req.body);
  const result = await pool.query(
    "SELECT id, name, email, password_hash, currency_preference FROM users WHERE email = $1",
    [input.email]
  );
  const row = result.rows[0];
  if (!row || !(await verifyPassword(input.password, row.password_hash))) {
    throw new HttpError(401, "Invalid email or password");
  }

  const user = {
    id: row.id,
    name: row.name,
    email: row.email,
    currency_preference: row.currency_preference
  };
  res.json({ user, token: signAccessToken(user) });
}
