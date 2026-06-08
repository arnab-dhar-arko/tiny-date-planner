import Dexie, { type EntityTable } from "dexie";
import type { BackupData, ExchangeRate, Expense, ExpenseSplit, Participant, Transfer, Trip } from "../types";

class RoamDatabase extends Dexie {
  trips!: EntityTable<Trip, "id">;
  expenses!: EntityTable<Expense, "id">;
  exchangeRates!: EntityTable<ExchangeRate, "id">;
  participants!: EntityTable<Participant, "id">;
  expenseSplits!: EntityTable<ExpenseSplit, "id">;
  transfers!: EntityTable<Transfer, "id">;

  constructor() {
    super("roam-budget");
    this.version(1).stores({
      trips: "id, created_at, updated_at",
      expenses: "id, trip_id, category, timestamp, local_currency, [trip_id+timestamp]",
      exchangeRates: "id, [base_currency+target_currency+date], date",
    });
    this.version(2).stores({
      trips: "id, created_at, updated_at",
      expenses: "id, trip_id, category, timestamp, local_currency, paid_by_participant_id, [trip_id+timestamp]",
      exchangeRates: "id, [base_currency+target_currency+date], date",
      participants: "id, trip_id, [trip_id+name]",
      expenseSplits: "id, expense_id, participant_id, [expense_id+participant_id]",
      transfers: "id, trip_id, from_participant_id, to_participant_id, timestamp",
    });
  }
}

export const db = new RoamDatabase();

let initPromise: Promise<void> | undefined;

export function initializeDatabase() {
  initPromise ??= removeDemoSeedData();
  return initPromise;
}

async function removeDemoSeedData() {
  const demoTrips = await db.trips.filter((trip) => trip.name === "Around the World").toArray();
  for (const trip of demoTrips) {
    await deleteTripWithGroupData(trip.id);
  }
}

export async function saveExpenseWithSplits(expense: Expense, splits: ExpenseSplit[]) {
  await db.transaction("rw", db.expenses, db.expenseSplits, async () => {
    await db.expenses.put(expense);
    await db.expenseSplits.where("expense_id").equals(expense.id).delete();
    if (splits.length) await db.expenseSplits.bulkAdd(splits.map((split) => ({ ...split, expense_id: expense.id })));
  });
}

export async function deleteExpenseWithSplits(expenseId: string) {
  await db.transaction("rw", db.expenses, db.expenseSplits, async () => {
    await db.expenseSplits.where("expense_id").equals(expenseId).delete();
    await db.expenses.delete(expenseId);
  });
}

export async function deleteTripWithGroupData(tripId: string) {
  await db.transaction("rw", [db.trips, db.expenses, db.participants, db.expenseSplits, db.transfers], async () => {
    const expenseIds = await db.expenses.where("trip_id").equals(tripId).primaryKeys();
    if (expenseIds.length) await db.expenseSplits.where("expense_id").anyOf(expenseIds).delete();
    await db.expenses.where("trip_id").equals(tripId).delete();
    await db.participants.where("trip_id").equals(tripId).delete();
    await db.transfers.where("trip_id").equals(tripId).delete();
    await db.trips.delete(tripId);
  });
}

export async function getMockRate(base: string, target: string, date = new Date().toISOString().slice(0, 10)) {
  if (base === target) return 1;
  const cached = await db.exchangeRates.where("[base_currency+target_currency+date]").equals([base, target, date]).first();
  if (cached) return cached.rate;
  const usdValue: Record<string, number> = { USD: 1, EUR: 1.08, GBP: 1.27, JPY: 0.0065, VND: 0.000039, THB: 0.0275, AUD: 0.65, CAD: 0.73, INR: 0.012, KRW: 0.00073 };
  if (!usdValue[base] || !usdValue[target]) return null;
  const rate = Number((usdValue[base] / usdValue[target]).toPrecision(7));
  await db.exchangeRates.add({ id: crypto.randomUUID(), base_currency: base, target_currency: target, rate, date, source: "mock", created_at: new Date().toISOString() });
  return rate;
}

export async function exportBackup(): Promise<BackupData> {
  return {
    version: 2,
    exported_at: new Date().toISOString(),
    trips: await db.trips.toArray(),
    expenses: await db.expenses.toArray(),
    exchangeRates: await db.exchangeRates.toArray(),
    participants: await db.participants.toArray(),
    expenseSplits: await db.expenseSplits.toArray(),
    transfers: await db.transfers.toArray(),
  };
}

export async function importBackup(value: unknown) {
  const data = value as {
    version?: number;
    trips?: Trip[];
    expenses?: Expense[];
    exchangeRates?: ExchangeRate[];
    participants?: Participant[];
    expenseSplits?: ExpenseSplit[];
    transfers?: Transfer[];
  };
  const baseValid = (data.version === 1 || data.version === 2) && Array.isArray(data.trips) && Array.isArray(data.expenses) && Array.isArray(data.exchangeRates);
  if (!baseValid) {
    throw new Error("This does not look like a valid Roam Budget backup.");
  }
  const participants = Array.isArray(data.participants) ? data.participants : [];
  const expenseSplits = Array.isArray(data.expenseSplits) ? data.expenseSplits : [];
  const transfers = Array.isArray(data.transfers) ? data.transfers : [];
  await db.transaction("rw", [db.trips, db.expenses, db.exchangeRates, db.participants, db.expenseSplits, db.transfers], async () => {
    await db.trips.bulkPut(data.trips!);
    await db.expenses.bulkPut(data.expenses!);
    await db.exchangeRates.bulkPut(data.exchangeRates!);
    await db.participants.bulkPut(participants);
    await db.expenseSplits.bulkPut(expenseSplits);
    await db.transfers.bulkPut(transfers);
  });
}
