import { Router } from "express";
import { createSettlement } from "../controllers/settlements.controller.js";

export const settlementsRoutes = Router();

settlementsRoutes.post("/", createSettlement);
