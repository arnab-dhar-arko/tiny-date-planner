import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Plus } from "lucide-react";
import { DonutChart } from "../components/DonutChart";
import { EmptyState } from "../components/EmptyState";
import { ExpenseCard } from "../components/ExpenseCard";
import { KpiCards } from "../components/KpiCards";
import type { Category, Expense, Trip } from "../types";
import { groupExpenses, money } from "../utils/format";

export function EntriesScreen({ trip, expenses, total, dailyAverage, categoryTotals, onAdd, onEdit, onDelete, onStats }: {
  trip: Trip;
  expenses: Expense[];
  total: number;
  dailyAverage: number;
  categoryTotals: Record<Category, number>;
  onAdd: () => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  onStats: () => void;
}) {
  const groups = groupExpenses(expenses);
  return (
    <motion.div className="screen entries-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="hero-copy">
        <div><p className="eyebrow">Current adventure</p><h1>Spend well,<br /><em>travel farther.</em></h1></div>
        <p>{money(Math.max(0, trip.total_budget - total), trip.home_currency, true)} left in your trip budget.</p>
      </div>
      <KpiCards trip={trip} total={total} dailyAverage={dailyAverage} />
      <div className="section-heading">
        <div><p className="eyebrow">Recent activity</p><h2>Your entries</h2></div>
        <button className="button primary small" onClick={onAdd}><Plus size={16} /> Add expense</button>
      </div>
      {expenses.length === 0 ? <EmptyState title="No expenses yet" text="Add your first entry and the dashboard will come to life." /> : (
        <div className="expense-groups">
          {Object.entries(groups).map(([label, group]) => (
            <section key={label} className="expense-group">
              <div className="group-title"><h3>{label}</h3><span>{money(group.reduce((sum, item) => sum + item.amount_home, 0), trip.home_currency)}</span></div>
              <AnimatePresence>{group.map((expense) => <ExpenseCard key={expense.id} expense={expense} trip={trip} onEdit={() => onEdit(expense)} onDelete={() => onDelete(expense)} />)}</AnimatePresence>
            </section>
          ))}
        </div>
      )}
      <section className="entries-analytics">
        <div className="section-heading">
          <div><p className="eyebrow">At a glance</p><h2>Where it went</h2></div>
          <button className="text-button" onClick={onStats}>View stats <ArrowUpRight size={15} /></button>
        </div>
        <DonutChart values={categoryTotals} currency={trip.home_currency} />
      </section>
    </motion.div>
  );
}
