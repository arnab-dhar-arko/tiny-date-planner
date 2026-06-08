import { Router } from "express";
import { pullSyncEvents, pushSyncEvents } from "../controllers/sync.controller.js";

export const syncRoutes = Router();

syncRoutes.post("/push", pushSyncEvents);
syncRoutes.get("/pull", pullSyncEvents);
