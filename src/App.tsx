import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Plus, Sparkles } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useRef, useState } from "react";
import { BottomNav } from "./components/BottomNav";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { ExpenseForm } from "./components/ExpenseForm";
import { Header } from "./components/Header";
import { Modal } from "./components/Modal";
import { RateForm } from "./components/RateForm";
import { SettlementForm } from "./components/SettlementForm";
import { TripForm } from "./components/TripForm";
import { TripSwitcher } from "./components/TripSwitcher";
import { db, deleteExpenseWithSplits, deleteTripWithGroupData, exportBackup, importBackup, initializeDatabase } from "./db/database";
import { EntriesScreen } from "./screens/EntriesScreen";
import { MapScreen } from "./screens/MapScreen";
import { SearchScreen } from "./screens/SearchScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { StatsScreen } from "./screens/StatsScreen";
import type { Category, ExchangeRate, Expense, ExpenseSplit, Participant, Toast, Transfer, Trip, View } from "./types";
import type { SettlementSuggestion } from "./utils/group";

type ModalState =
  | { type: "expense"; expense?: Expense }
  | { type: "trip"; trip?: Trip }
  | { type: "switch" }
  | { type: "rate"; rate?: ExchangeRate }
  | { type: "delete-expense"; expense: Expense }
  | { type: "delete-trip"; trip: Trip }
  | { type: "delete-rate"; rate: ExchangeRate }
  | { type: "delete-transfer"; transfer: Transfer }
  | { type: "settlement"; suggestion: SettlementSuggestion }
  | { type: "clear" }
  | null;

export default function App() {
  const reduceMotion = useReducedMotion();
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>("entries");
  const [modal, setModal] = useState<ModalState>(null);
  const [currentTripId, setCurrentTripId] = useState(() => localStorage.getItem("roam-current-trip") ?? "");
  const [theme, setTheme] = useState<"light" | "dark">(() => localStorage.getItem("roam-theme") === "dark" ? "dark" : "light");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const importRef = useRef<HTMLInputElement>(null);
  const trips = useLiveQuery(() => db.trips.orderBy("created_at").reverse().toArray(), [], []);
  const currentTrip = trips.find((trip) => trip.id === currentTripId) ?? trips[0];
  const expenses = useLiveQuery(() => currentTrip ? db.expenses.where("trip_id").equals(currentTrip.id).reverse().sortBy("timestamp") : [], [currentTrip?.id], []);
  const rates = useLiveQuery(() => db.exchangeRates.orderBy("date").reverse().toArray(), [], []);
  const allParticipants = useLiveQuery(() => db.participants.toArray(), [], []);
  const allSplits = useLiveQuery(() => db.expenseSplits.toArray(), [], []);
  const transfers = useLiveQuery(() => currentTrip ? db.transfers.where("trip_id").equals(currentTrip.id).sortBy("timestamp") : [], [currentTrip?.id], []);
  const participants: Participant[] = currentTrip ? allParticipants.filter((participant) => participant.trip_id === currentTrip.id) : [];
  const expenseIds = new Set(expenses.map((expense) => expense.id));
  const expenseSplits: ExpenseSplit[] = allSplits.filter((split) => expenseIds.has(split.expense_id));

  useEffect(() => { initializeDatabase().finally(() => setReady(true)); }, []);
  useEffect(() => {
    if (currentTrip && currentTrip.id !== currentTripId) setCurrentTripId(currentTrip.id);
  }, [currentTrip, currentTripId]);
  useEffect(() => {
    if (currentTripId) localStorage.setItem("roam-current-trip", currentTripId);
  }, [currentTripId]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("roam-theme", theme);
  }, [theme]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view, reduceMotion]);

  const metrics = useMemo(() => {
    const total = expenses.reduce((sum, item) => sum + item.amount_home, 0);
    const activeDays = new Set(expenses.map((item) => item.timestamp.slice(0, 10))).size || 1;
    const start = new Date(`${currentTrip?.start_date ?? new Date().toISOString().slice(0, 10)}T00:00:00`);
    const end = currentTrip ? new Date(`${currentTrip.end_date}T23:59:59`) : new Date();
    const tripDays = Math.max(1, Math.ceil((Math.min(Date.now(), end.getTime()) - start.getTime()) / 86_400_000));
    const categoryTotals = Object.fromEntries(["food", "drinks", "lodging", "transit", "entertainment", "shopping"].map((item) => [item, 0])) as Record<Category, number>;
    expenses.forEach((item) => { categoryTotals[item.category] += item.amount_home; });
    return { total, dailyAverage: total / tripDays, activeDays, categoryTotals };
  }, [currentTrip, expenses]);

  function notify(message: string, tone: "success" | "error" = "success") {
    const toast = { id: crypto.randomUUID(), message, tone };
    setToasts((items) => [...items, toast]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== toast.id)), 3200);
  }

  async function confirmDeleteExpense(expense: Expense) {
    await deleteExpenseWithSplits(expense.id);
    setModal(null);
    notify("Expense deleted.");
  }

  async function confirmDeleteTrip(trip: Trip) {
    await deleteTripWithGroupData(trip.id);
    setModal(null);
    notify("Trip and its expenses deleted.");
  }

  async function confirmDeleteRate(rate: ExchangeRate) {
    await db.exchangeRates.delete(rate.id);
    setModal(null);
    notify("Exchange rate deleted.");
  }

  async function confirmDeleteTransfer(transfer: Transfer) {
    await db.transfers.delete(transfer.id);
    setModal(null);
    notify("Settlement deleted.");
  }

  async function clearData() {
    await db.transaction("rw", [db.trips, db.expenses, db.exchangeRates, db.participants, db.expenseSplits, db.transfers], async () => {
      await Promise.all([db.trips.clear(), db.expenses.clear(), db.exchangeRates.clear(), db.participants.clear(), db.expenseSplits.clear(), db.transfers.clear()]);
    });
    setCurrentTripId("");
    setModal(null);
    notify("All local data cleared.");
  }

  async function downloadBackup() {
    const data = await exportBackup();
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `roam-budget-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    notify("Backup exported.");
  }

  async function uploadBackup(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await importBackup(JSON.parse(await file.text()));
      notify("Backup imported successfully.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not import backup.", "error");
    }
    event.target.value = "";
  }

  function chooseTrip(id: string) {
    setCurrentTripId(id);
    setModal(null);
    setView("entries");
  }

  if (!ready) return <div className="loading-screen"><span><Sparkles size={24} /></span><p>Preparing your travel journal…</p></div>;

  if (!currentTrip) {
    return (
      <main className="welcome-screen">
        <div className="brand-mark"><span>R</span><strong>Roam Budget</strong></div>
        <section><p className="eyebrow">Local-first travel finance</p><h1>Your next adventure<br /><em>starts here.</em></h1><p>Create a trip to begin tracking expenses privately on this device.</p><button className="button primary" onClick={() => setModal({ type: "trip" })}><Plus size={17} /> Create your first trip</button></section>
        <Modal open={modal?.type === "trip"} onClose={() => setModal(null)} title="Create your first trip" eyebrow="New adventure"><TripForm onDone={chooseTrip} onCancel={() => setModal(null)} notify={notify} /></Modal>
      </main>
    );
  }

  return (
    <div className="app-background">
      <div className="desktop-brand"><span>R</span><div><strong>Roam Budget</strong><small>Travel farther, spend smarter.</small></div></div>
      <main className="app-shell">
        <Header trip={currentTrip} onMenu={() => setView("settings")} onAddTrip={() => setModal({ type: "trip" })} onSwitchTrip={() => setModal({ type: "switch" })} />
        <div className="app-content">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={view} initial={reduceMotion ? false : { opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={reduceMotion ? undefined : { opacity: 0, x: -8 }} transition={{ duration: 0.18 }}>
              {view === "entries" && <EntriesScreen trip={currentTrip} expenses={expenses} total={metrics.total} dailyAverage={metrics.dailyAverage} categoryTotals={metrics.categoryTotals} onAdd={() => setModal({ type: "expense" })} onEdit={(expense) => setModal({ type: "expense", expense })} onDelete={(expense) => setModal({ type: "delete-expense", expense })} onStats={() => setView("stats")} />}
              {view === "stats" && <StatsScreen trip={currentTrip} total={metrics.total} dailyAverage={metrics.dailyAverage} activeDays={metrics.activeDays} categoryTotals={metrics.categoryTotals} participants={participants} expenses={expenses} splits={expenseSplits} transfers={transfers as Transfer[]} onSettle={(suggestion) => setModal({ type: "settlement", suggestion })} onDeleteTransfer={(transfer) => setModal({ type: "delete-transfer", transfer })} />}
              {view === "search" && <SearchScreen trip={currentTrip} expenses={expenses} onEdit={(expense) => setModal({ type: "expense", expense })} onDelete={(expense) => setModal({ type: "delete-expense", expense })} />}
              {view === "map" && <MapScreen trip={currentTrip} expenses={expenses} />}
              {view === "settings" && <SettingsScreen trips={trips} currentTrip={currentTrip} rates={rates} theme={theme} onTheme={() => setTheme(theme === "light" ? "dark" : "light")} onAddTrip={() => setModal({ type: "trip" })} onEditTrip={(trip) => setModal({ type: "trip", trip })} onDeleteTrip={(trip) => setModal({ type: "delete-trip", trip })} onRate={(rate) => setModal({ type: "rate", rate })} onDeleteRate={(rate) => setModal({ type: "delete-rate", rate })} onExport={downloadBackup} onImport={() => importRef.current?.click()} onClear={() => setModal({ type: "clear" })} />}
            </motion.div>
          </AnimatePresence>
        </div>
        <BottomNav active={view} onChange={setView} />
      </main>

      <input ref={importRef} className="sr-only" type="file" accept="application/json" onChange={uploadBackup} />
      <Modal open={modal?.type === "expense"} onClose={() => setModal(null)} title={modal?.type === "expense" && modal.expense ? "Edit expense" : "Add an expense"} eyebrow="Trip entry" wide><ExpenseForm key={modal?.type === "expense" ? modal.expense?.id ?? "new" : "closed"} trip={currentTrip} participants={participants} expenseSplits={modal?.type === "expense" && modal.expense ? expenseSplits.filter((split) => split.expense_id === modal.expense!.id) : []} expense={modal?.type === "expense" ? modal.expense : undefined} onDone={() => setModal(null)} onCancel={() => setModal(null)} notify={notify} /></Modal>
      <Modal open={modal?.type === "trip"} onClose={() => setModal(null)} title={modal?.type === "trip" && modal.trip ? "Edit trip" : "Plan a new trip"} eyebrow="Trip details"><TripForm key={modal?.type === "trip" ? modal.trip?.id ?? "new" : "closed"} trip={modal?.type === "trip" ? modal.trip : undefined} participants={modal?.type === "trip" && modal.trip ? allParticipants.filter((participant) => participant.trip_id === modal.trip!.id) : []} onDone={chooseTrip} onCancel={() => setModal(null)} notify={notify} /></Modal>
      <Modal open={modal?.type === "switch"} onClose={() => setModal(null)} title="Choose a trip" eyebrow="Your adventures"><TripSwitcher trips={trips} currentId={currentTrip.id} onChoose={chooseTrip} onAdd={() => setModal({ type: "trip" })} onEdit={(trip) => setModal({ type: "trip", trip })} onDelete={(trip) => setModal({ type: "delete-trip", trip })} /></Modal>
      <Modal open={modal?.type === "rate"} onClose={() => setModal(null)} title={modal?.type === "rate" && modal.rate ? "Edit exchange rate" : "Add exchange rate"} eyebrow="Manual conversion"><RateForm key={modal?.type === "rate" ? modal.rate?.id ?? "new" : "closed"} exchangeRate={modal?.type === "rate" ? modal.rate : undefined} onDone={() => setModal(null)} onCancel={() => setModal(null)} notify={notify} /></Modal>
      <Modal open={modal?.type === "delete-expense"} onClose={() => setModal(null)} title="Delete entry"><ConfirmDialog title="Delete this expense?" text="This entry will be removed from your local travel journal." confirmLabel="Delete expense" onCancel={() => setModal(null)} onConfirm={() => modal?.type === "delete-expense" && confirmDeleteExpense(modal.expense)} /></Modal>
      <Modal open={modal?.type === "delete-trip"} onClose={() => setModal(null)} title="Delete trip"><ConfirmDialog title="Delete this trip?" text="The trip and every expense inside it will be permanently removed from this device." confirmLabel="Delete trip" onCancel={() => setModal(null)} onConfirm={() => modal?.type === "delete-trip" && confirmDeleteTrip(modal.trip)} /></Modal>
      <Modal open={modal?.type === "delete-rate"} onClose={() => setModal(null)} title="Delete exchange rate"><ConfirmDialog title="Delete this rate?" text="The saved conversion rate will be removed from this device." confirmLabel="Delete rate" onCancel={() => setModal(null)} onConfirm={() => modal?.type === "delete-rate" && confirmDeleteRate(modal.rate)} /></Modal>
      <Modal open={modal?.type === "delete-transfer"} onClose={() => setModal(null)} title="Delete settlement"><ConfirmDialog title="Delete this settlement?" text="This repayment record will be removed from your local balance sheet." confirmLabel="Delete settlement" onCancel={() => setModal(null)} onConfirm={() => modal?.type === "delete-transfer" && confirmDeleteTransfer(modal.transfer)} /></Modal>
      <Modal open={modal?.type === "settlement"} onClose={() => setModal(null)} title="Settle up" eyebrow="Record repayment">{modal?.type === "settlement" && <SettlementForm key={`${modal.suggestion.from.id}-${modal.suggestion.to.id}`} trip={currentTrip} suggestion={modal.suggestion} onDone={() => setModal(null)} onCancel={() => setModal(null)} notify={notify} />}</Modal>
      <Modal open={modal?.type === "clear"} onClose={() => setModal(null)} title="Clear local data"><ConfirmDialog title="Clear everything?" text="All trips, expenses, and saved exchange rates will be permanently removed from this browser." confirmLabel="Clear all data" onCancel={() => setModal(null)} onConfirm={clearData} /></Modal>
      <div className="toast-stack" aria-live="polite">{toasts.map((toast) => <motion.div key={toast.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={toast.tone === "error" ? "error" : ""}>{toast.message}</motion.div>)}</div>
    </div>
  );
}
