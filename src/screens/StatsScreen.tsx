import { motion } from "framer-motion";
import { CalendarDays, Crown, PiggyBank, TrendingUp, Users } from "lucide-react";
import { useState } from "react";
import { BalancesPanel } from "../components/BalancesPanel";
import { DonutChart } from "../components/DonutChart";
import { KpiCards } from "../components/KpiCards";
import { categoryMeta } from "../data/categories";
import type { Category, Expense, ExpenseSplit, Participant, Transfer, Trip } from "../types";
import type { SettlementSuggestion } from "../utils/group";
import { money } from "../utils/format";

export function StatsScreen({ trip, total, dailyAverage, categoryTotals, activeDays, participants, expenses, splits, transfers, onSettle, onDeleteTransfer }: {
  trip: Trip;
  total: number;
  dailyAverage: number;
  categoryTotals: Record<Category, number>;
  activeDays: number;
  participants: Participant[];
  expenses: Expense[];
  splits: ExpenseSplit[];
  transfers: Transfer[];
  onSettle: (suggestion: SettlementSuggestion) => void;
  onDeleteTransfer: (transfer: Transfer) => void;
}) {
  const [tab, setTab] = useState<"overview" | "balances">("overview");
  const top = (Object.entries(categoryTotals) as [Category, number][]).sort((a, b) => b[1] - a[1])[0];
  return (
    <motion.div className="screen" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="page-heading stats-heading"><div><p className="eyebrow">Trip intelligence</p><h1>{tab === "overview" ? "Spending stats" : "Group balances"}</h1><p>{tab === "overview" ? "A clear view of what your adventure costs." : "See who paid, who owes, and settle in fewer moves."}</p></div>{trip.is_group && <div className="stats-tabs"><button className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}>Overview</button><button className={tab === "balances" ? "active" : ""} onClick={() => setTab("balances")}><Users size={14} /> Balances</button></div>}</div>
      {tab === "balances" && trip.is_group ? <BalancesPanel trip={trip} participants={participants} expenses={expenses} splits={splits} transfers={transfers} onSettle={onSettle} onDeleteTransfer={onDeleteTransfer} /> : <>
        <KpiCards trip={trip} total={total} dailyAverage={dailyAverage} compact />
        <section className="panel chart-panel"><div className="section-heading"><div><p className="eyebrow">Category split</p><h2>Every dollar, mapped</h2></div></div><DonutChart values={categoryTotals} currency={trip.home_currency} /></section>
        <div className="stat-grid">
          <article><span><PiggyBank size={18} /></span><small>Remaining</small><strong>{money(Math.max(0, trip.total_budget - total), trip.home_currency, true)}</strong></article>
          <article><span><CalendarDays size={18} /></span><small>Active days</small><strong>{activeDays}</strong></article>
          <article><span><Crown size={18} /></span><small>Top category</small><strong>{top ? categoryMeta[top[0]].shortLabel : "—"}</strong></article>
          <article><span><TrendingUp size={18} /></span><small>Budget used</small><strong>{Math.round((total / trip.total_budget) * 100)}%</strong></article>
        </div>
        <section className="panel breakdown-panel"><div className="section-heading"><div><p className="eyebrow">Breakdown</p><h2>Category totals</h2></div></div>{(Object.entries(categoryTotals) as [Category, number][]).sort((a, b) => b[1] - a[1]).map(([category, value]) => { const meta = categoryMeta[category]; const Icon = meta.Icon; return <div className="breakdown-row" key={category}><span className="legend-icon" style={{ background: meta.color }}><Icon size={14} /></span><span>{meta.label}</span><div><i style={{ width: `${total ? (value / total) * 100 : 0}%`, background: meta.color }} /></div><strong>{money(value, trip.home_currency)}</strong></div>; })}</section>
      </>}
    </motion.div>
  );
}
