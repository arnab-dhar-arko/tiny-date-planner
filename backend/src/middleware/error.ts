import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { env } from "../config/env.js";
import { HttpError } from "../utils/http.js";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    return res.status(400).json({ error: "Validation failed", details: error.flatten() });
  }
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.message });
  }
  console.error(error);
  res.status(500).json({
    error: "Internal server error",
    details: env.NODE_ENV === "development" ? String(error) : undefined
  });
};
