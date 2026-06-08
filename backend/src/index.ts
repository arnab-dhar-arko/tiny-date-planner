import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { pool } from "./db/pool.js";
import { authenticate } from "./middleware/auth.js";
import { errorHandler } from "./middleware/error.js";
import { authRoutes } from "./routes/auth.routes.js";
import { expensesRoutes } from "./routes/expenses.routes.js";
import { settlementsRoutes } from "./routes/settlements.routes.js";
import { syncRoutes } from "./routes/sync.routes.js";
import { tripsRoutes } from "./routes/trips.routes.js";

const app = express();
const corsOrigins = env.CORS_ORIGIN === "*" ? "*" : env.CORS_ORIGIN.split(",").map((origin) => origin.trim());

app.use(helmet());
app.use(cors({ origin: corsOrigins }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/health", async (_req, res) => {
  await pool.query("SELECT 1");
  res.json({ ok: true, service: "roam-budget-api" });
});

app.use("/auth", authRoutes);
app.use("/trips", authenticate, tripsRoutes);
app.use("/expenses", authenticate, expensesRoutes);
app.use("/settlements", authenticate, settlementsRoutes);
app.use("/sync", authenticate, syncRoutes);
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Roam Budget API listening on :${env.PORT}`);
});
