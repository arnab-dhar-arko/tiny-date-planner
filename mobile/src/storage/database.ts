import * as SQLite from "expo-sqlite";
import type { Expense, ExpenseSplit, ServerExpense, Settlement, Trip, TripMember } from "../types";

const db = SQLite.openDatabaseSync("roam_budget.db");

export async function initDatabase() {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS trips (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      total_budget REAL NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      base_currency TEXT NOT NULL,
      is_group INTEGER NOT NULL,
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS trip_members (
      trip_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL,
      email TEXT,
      PRIMARY KEY (trip_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL,
      paid_by_user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      amount_base REAL NOT NULL,
      amount_local REAL NOT NULL,
      local_currency TEXT NOT NULL,
      exchange_rate REAL NOT NULL,
      split_type TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS expense_splits (
      id TEXT PRIMARY KEY,
      expense_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      amount_owed REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settlements (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL,
      from_user_id TEXT NOT NULL,
      to_user_id TEXT NOT NULL,
      amount REAL NOT NULL,
      timestamp TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS outbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sync_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  const columns = await rows<{ name: string }>("PRAGMA table_info(trip_members)");
  if (!columns.some((column) => column.name === "email")) {
    await run("ALTER TABLE trip_members ADD COLUMN email TEXT");
  }
}

export async function rows<T>(sql: string, params: SQLite.SQLiteBindParams = []) {
  return db.getAllAsync<T>(sql, params);
}

export async function run(sql: string, params: SQLite.SQLiteBindParams = []) {
  return db.runAsync(sql, params);
}

async function enqueue(entityType: string, entityId: string, operation: "upsert" | "delete", payload: unknown) {
  await run(
    "INSERT INTO outbox (entity_type, entity_id, operation, payload, created_at) VALUES (?, ?, ?, ?, ?)",
    [entityType, entityId, operation, JSON.stringify(payload), new Date().toISOString()]
  );
}

export async function saveTrip(trip: Trip, members: TripMember[]) {
  await persistTrip(trip, members);
  await enqueue("trips", trip.id, "upsert", { ...trip, members });
}

async function persistTrip(trip: Trip, members: TripMember[]) {
  await run(
    `INSERT OR REPLACE INTO trips (id, owner_user_id, name, total_budget, start_date, end_date, base_currency, is_group, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [trip.id, trip.owner_user_id, trip.name, trip.total_budget, trip.start_date, trip.end_date, trip.base_currency, trip.is_group ? 1 : 0, trip.updated_at ?? new Date().toISOString()]
  );
  for (const member of members) {
    await run(
      "INSERT OR REPLACE INTO trip_members (trip_id, user_id, display_name, role, email) VALUES (?, ?, ?, ?, ?)",
      [member.trip_id, member.user_id, member.display_name, member.role, member.email ?? null]
    );
  }
}

export async function deleteTripCascade(tripId: string) {
  const expenseIds = await rows<{ id: string }>("SELECT id FROM expenses WHERE trip_id = ?", [tripId]);
  for (const expense of expenseIds) {
    await run("DELETE FROM expense_splits WHERE expense_id = ?", [expense.id]);
  }
  await run("DELETE FROM expenses WHERE trip_id = ?", [tripId]);
  await run("DELETE FROM settlements WHERE trip_id = ?", [tripId]);
  await run("DELETE FROM trip_members WHERE trip_id = ?", [tripId]);
  await run("DELETE FROM trips WHERE id = ?", [tripId]);
  await enqueue("trips", tripId, "delete", { id: tripId });
}

export async function removeDemoSeedData() {
  const demoTrips = await rows<{ id: string }>("SELECT id FROM trips WHERE name = ?", ["Around the World"]);
  for (const trip of demoTrips) {
    await deleteTripCascade(trip.id);
  }
}

export async function saveExpense(expense: Expense, splits: ExpenseSplit[]) {
  await persistExpense(expense, splits);
  await enqueue("expenses", expense.id, "upsert", { ...expense, splits });
}

async function persistExpense(expense: Expense, splits: ExpenseSplit[]) {
  await run(
    `INSERT OR REPLACE INTO expenses
     (id, trip_id, paid_by_user_id, title, category, amount_base, amount_local, local_currency, exchange_rate, split_type, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      expense.id,
      expense.trip_id,
      expense.paid_by_user_id,
      expense.title,
      expense.category,
      expense.amount_base,
      expense.amount_local,
      expense.local_currency,
      expense.exchange_rate,
      expense.split_type,
      expense.created_at
    ]
  );
  await run("DELETE FROM expense_splits WHERE expense_id = ?", [expense.id]);
  for (const split of splits) {
    await run(
      "INSERT OR REPLACE INTO expense_splits (id, expense_id, user_id, amount_owed) VALUES (?, ?, ?, ?)",
      [split.id, split.expense_id, split.user_id, split.amount_owed]
    );
  }
}

export async function saveSettlement(settlement: Settlement) {
  await persistSettlement(settlement);
  await enqueue("settlements", settlement.id, "upsert", settlement);
}

async function persistSettlement(settlement: Settlement) {
  await run(
    "INSERT OR REPLACE INTO settlements (id, trip_id, from_user_id, to_user_id, amount, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
    [settlement.id, settlement.trip_id, settlement.from_user_id, settlement.to_user_id, settlement.amount, settlement.timestamp]
  );
}

export async function applyTripSnapshot(trip: Trip, members: TripMember[], expenses: ServerExpense[], settlements: Settlement[]) {
  await persistTrip({ ...trip, is_group: Boolean(trip.is_group) }, members);
  await run("DELETE FROM trip_members WHERE trip_id = ?", [trip.id]);
  for (const member of members) {
    await run(
      "INSERT OR REPLACE INTO trip_members (trip_id, user_id, display_name, role, email) VALUES (?, ?, ?, ?, ?)",
      [member.trip_id, member.user_id, member.display_name, member.role, member.email ?? null]
    );
  }
  const localExpenseIds = await rows<{ id: string }>("SELECT id FROM expenses WHERE trip_id = ?", [trip.id]);
  for (const expense of localExpenseIds) {
    await run("DELETE FROM expense_splits WHERE expense_id = ?", [expense.id]);
  }
  await run("DELETE FROM expenses WHERE trip_id = ?", [trip.id]);
  await run("DELETE FROM settlements WHERE trip_id = ?", [trip.id]);
  for (const expense of expenses) {
    const { splits, ...baseExpense } = expense;
    await persistExpense(baseExpense, splits);
  }
  for (const settlement of settlements) {
    await persistSettlement(settlement);
  }
}

export async function readOutbox() {
  return rows<{ id: number; entity_type: string; entity_id: string; operation: "upsert" | "delete"; payload: string }>(
    "SELECT * FROM outbox ORDER BY id ASC LIMIT 200"
  );
}

export async function deleteOutbox(ids: number[]) {
  if (ids.length === 0) return;
  await run(`DELETE FROM outbox WHERE id IN (${ids.map(() => "?").join(",")})`, ids);
}

export async function clearOutbox() {
  await run("DELETE FROM outbox");
}

export async function getSyncCursor() {
  const meta = await rows<{ value: string }>("SELECT value FROM sync_meta WHERE key = 'cursor'");
  return Number(meta[0]?.value ?? 0);
}

export async function setSyncCursor(cursor: number) {
  await run("INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('cursor', ?)", [String(cursor)]);
}
