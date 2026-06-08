import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { AuthUser } from "../types.js";

export function signAccessToken(user: AuthUser) {
  const options: jwt.SignOptions = { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] };
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      currency_preference: user.currency_preference
    },
    env.JWT_SECRET,
    options
  );
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
}
