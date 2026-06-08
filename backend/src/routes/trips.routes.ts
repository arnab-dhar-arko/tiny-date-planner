import { Router } from "express";
import { addTripMemberByEmail, createTrip, getTripMembers, getTripSnapshot, listTrips, removeTripMember } from "../controllers/trips.controller.js";
import { getBalances, listExpenses } from "../controllers/expenses.controller.js";
import { listSettlements } from "../controllers/settlements.controller.js";

export const tripsRoutes = Router();

tripsRoutes.get("/", listTrips);
tripsRoutes.post("/", createTrip);
tripsRoutes.get("/:tripId", getTripSnapshot);
tripsRoutes.get("/:tripId/members", getTripMembers);
tripsRoutes.post("/:tripId/members", addTripMemberByEmail);
tripsRoutes.delete("/:tripId/members/:userId", removeTripMember);
tripsRoutes.get("/:tripId/expenses", listExpenses);
tripsRoutes.get("/:tripId/balances", getBalances);
tripsRoutes.get("/:tripId/settlements", listSettlements);
