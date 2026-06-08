import { motion } from "framer-motion";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { ExpenseCard } from "../components/ExpenseCard";
import { categoryMeta, currencies } from "../data/categories";
import { categories, type Category, type Expense, type Trip } from "../types";

export function SearchScreen({ trip, expenses, onEdit, onDelete }: {
  trip: Trip;
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");
  const [currency, setCurrency] = useState("all");
  const [after, setAfter] = useState("");
  const [before, setBefore] = useState("");
  const results = useMemo(() => expenses.filter((expense) => {
    const haystack = `${expense.title} ${expense.category} ${expense.local_currency} ${expense.location ?? ""} ${expense.notes ?? ""}`.toLowerCase();
    return (!query || haystack.includes(query.toLowerCase())) && (category === "all" || expense.category === category) && (currency === "all" || expense.local_currency === currency) && (!after || expense.timestamp.slice(0, 10) >= after) && (!before || expense.timestamp.slice(0, 10) <= before);
  }), [after, before, category, currency, expenses, query]);
  const filtering = query || category !== "all" || currency !== "all" || after || before;
  const clear = () => { setQuery(""); setCategory("all"); setCurrency("all"); setAfter(""); setBefore(""); };
  return (
    <motion.div className="screen" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="page-heading"><p className="eyebrow">Find anything</p><h1>Search entries</h1><p>Filter every expense stored on this device.</p></div>
      <section className="search-panel">
        <label className="search-input"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, location, notes…" /><kbd>⌘ K</kbd></label>
        <div className="filters">
          <label><SlidersHorizontal size={15} /><select value={category} onChange={(event) => setCategory(event.target.value as Category | "all")}><option value="all">All categories</option>{categories.map((item) => <option value={item} key={item}>{categoryMeta[item].label}</option>)}</select></label>
          <label><select value={currency} onChange={(event) => setCurrency(event.target.value)}><option value="all">All currencies</option>{currencies.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><input type="date" value={after} onChange={(event) => setAfter(event.target.value)} aria-label="Expenses after date" /></label>
          <label><input type="date" value={before} onChange={(event) => setBefore(event.target.value)} aria-label="Expenses before date" /></label>
          {filtering && <button className="text-button" onClick={clear}><X size={14} /> Clear</button>}
        </div>
      </section>
      <div className="result-heading"><strong>{results.length} result{results.length === 1 ? "" : "s"}</strong><span>Newest first</span></div>
      <div className="search-results">
        {results.length ? results.map((expense) => <ExpenseCard key={expense.id} expense={expense} trip={trip} onEdit={() => onEdit(expense)} onDelete={() => onDelete(expense)} />) : <EmptyState title="Nothing found" text="Try a broader search or clear the active filters." />}
      </div>
    </motion.div>
  );
}
