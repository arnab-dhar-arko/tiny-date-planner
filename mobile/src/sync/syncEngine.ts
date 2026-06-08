import NetInfo from "@react-native-community/netinfo";
import { api } from "../api/client";
import { applyTripSnapshot, deleteOutbox, getSyncCursor, readOutbox, rows, setSyncCursor } from "../storage/database";
import type { Trip, TripSnapshot } from "../types";

export async function syncNow() {
  const network = await NetInfo.fetch();
  if (!network.isConnected) return { pushed: 0, pulled: 0 };

  const pending = await readOutbox();
  if (pending.length > 0) {
    await api<{ accepted: number }>("/sync/push", {
      method: "POST",
      body: JSON.stringify({
        events: pending.map((item) => ({
          entity_type: item.entity_type,
          entity_id: item.entity_id,
          operation: item.operation,
          payload: JSON.parse(item.payload)
        }))
      })
    });
    await deleteOutbox(pending.map((item) => item.id));
  }

  const cursor = await getSyncCursor();
  const pulled = await api<{ events: unknown[]; cursor: number }>(`/sync/pull?since=${cursor}`);
  await setSyncCursor(pulled.cursor);

  return { pushed: pending.length, pulled: pulled.events.length };
}

export async function pullTripsFromCloud() {
  const network = await NetInfo.fetch();
  if (!network.isConnected) return { trips: 0 };
  const response = await api<{ trips: Trip[] }>("/trips");
  for (const trip of response.trips) {
    const snapshot = await api<TripSnapshot>(`/trips/${trip.id}`);
    await applyTripSnapshot(snapshot.trip, snapshot.members, snapshot.expenses, snapshot.settlements);
  }
  return { trips: response.trips.length };
}

export async function syncTripFromCloud(tripId: string) {
  const snapshot = await api<TripSnapshot>(`/trips/${tripId}`);
  await applyTripSnapshot(snapshot.trip, snapshot.members, snapshot.expenses, snapshot.settlements);
}

export async function syncAllLocalTripsFromCloud() {
  const trips = await rows<Trip>("SELECT * FROM trips");
  for (const trip of trips) {
    await syncTripFromCloud(trip.id);
  }
  await pullTripsFromCloud();
}

export function registerConnectivitySync() {
  return NetInfo.addEventListener((state) => {
    if (state.isConnected) {
      syncNow().catch((error) => console.warn("Sync failed", error));
    }
  });
}
