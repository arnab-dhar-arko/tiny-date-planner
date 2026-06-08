import { Router } from "express";
import { createExpense } from "../controllers/expenses.controller.js";

export const expensesRoutes = Router();

expensesRoutes.post("/", createExpense);
