import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { clearOutbox, initDatabase, removeDemoSeedData, rows, saveSettlement, saveTrip } from "../storage/database";
import { pullTripsFromCloud, registerConnectivitySync, syncAllLocalTripsFromCloud, syncNow, syncTripFromCloud } from "../sync/syncEngine";
import type { Expense, ExpenseSplit, Settlement, Trip, TripMember } from "../types";
import { useAuth } from "./AuthContext";
import { uuid } from "../utils/id";
import { api } from "../api/client";

type AppState = {
  trips: Trip[];
  currentTrip?: Trip;
  members: TripMember[];
  expenses: Expense[];
  splits: ExpenseSplit[];
  settlements: Settlement[];
  reload(): Promise<void>;
  createTrip(name: string): Promise<void>;
  inviteFriend(email: string): Promise<void>;
  refreshFromCloud(): Promise<void>;
  resetLocalQueue(): Promise<void>;
  settle(from_user_id: string, to_user_id: string, amount: number): Promise<void>;
};

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const { token, user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [splits, setSplits] = useState<ExpenseSplit[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);

  async function reload() {
    const rawTrips = await rows<Omit<Trip, "is_group"> & { is_group: number }>("SELECT * FROM trips ORDER BY start_date ASC");
    const nextTrips = rawTrips.map((trip) => ({ ...trip, is_group: trip.is_group === 1 }));
    const trip = nextTrips[0];
    setTrips(nextTrips);
    if (!trip) {
      setMembers([]);
      setExpenses([]);
      setSplits([]);
      setSettlements([]);
      return;
    }
    setMembers(await rows<TripMember>("SELECT * FROM trip_members WHERE trip_id = ?", [trip.id]));
    setExpenses(await rows<Expense>("SELECT * FROM expenses WHERE trip_id = ? ORDER BY created_at DESC", [trip.id]));
    setSplits(await rows<ExpenseSplit>("SELECT es.* FROM expense_splits es JOIN expenses e ON e.id = es.expense_id WHERE e.trip_id = ?", [trip.id]));
    setSettlements(await rows<Settlement>("SELECT * FROM settlements WHERE trip_id = ? ORDER BY timestamp DESC", [trip.id]));
  }

  useEffect(() => {
    let unsubscribe: () => void = () => undefined;
    initDatabase()
      .then(async () => {
        await removeDemoSeedData();
        if (token && user) await pullTripsFromCloud().catch(() => undefined);
        await reload();
        if (token && user) {
          unsubscribe = registerConnectivitySync();
          syncNow().then(() => syncAllLocalTripsFromCloud()).then(reload).catch(() => undefined);
        }
      });
    return () => unsubscribe();
  }, [token, user?.id]);

  const currentTrip = trips[0];

  const value = useMemo<AppState>(() => ({
    trips,
    currentTrip,
    members,
    expenses,
    splits,
    settlements,
    reload,
    async createTrip(name) {
      if (!user) throw new Error("Please log in again before creating a trip.");
      const ownerId = user.id;
      const now = new Date();
      const end = new Date(now);
      end.setDate(end.getDate() + 14);
      const input = {
        name: name.trim() || "Untitled trip",
        total_budget: 0,
        start_date: now.toISOString().slice(0, 10),
        end_date: end.toISOString().slice(0, 10),
        base_currency: user?.currency_preference ?? "USD",
        is_group: false
      };
      let trip: Trip;
      try {
        const response = await api<{ trip: Trip }>("/trips", { method: "POST", body: JSON.stringify(input) });
        trip = { ...response.trip, is_group: Boolean(response.trip.is_group) };
      } catch {
        trip = { id: uuid(), owner_user_id: ownerId, ...input };
      }
      await saveTrip(trip, [{ trip_id: trip.id, user_id: ownerId, display_name: user?.name ?? "Me", role: "owner" }]);
      await syncNow().catch(() => undefined);
      await syncTripFromCloud(trip.id).catch(() => undefined);
      await reload();
    },
    async inviteFriend(email) {
      if (!currentTrip) throw new Error("Create a trip first.");
      await syncNow();
      await api<{ member: TripMember }>(`/trips/${currentTrip.id}/members`, {
        method: "POST",
        body: JSON.stringify({ email })
      });
      await syncTripFromCloud(currentTrip.id);
      await reload();
    },
    async refreshFromCloud() {
      try {
        await syncNow();
      } catch (error) {
        console.warn("Push sync failed; pulling cloud data anyway", error);
      }
      await syncAllLocalTripsFromCloud();
      await reload();
    },
    async resetLocalQueue() {
      await clearOutbox();
      await syncAllLocalTripsFromCloud();
      await reload();
    },
    async settle(from_user_id, to_user_id, amount) {
      if (!currentTrip) return;
      await saveSettlement({
        id: uuid(),
        trip_id: currentTrip.id,
        from_user_id,
        to_user_id,
        amount,
        timestamp: new Date().toISOString()
      });
      await syncNow().catch(() => undefined);
      await reload();
    }
  }), [currentTrip, expenses, members, settlements, splits, trips, user]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
}
