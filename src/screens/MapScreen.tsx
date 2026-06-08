import { motion } from "framer-motion";
import { MapPinned, Navigation, ShieldCheck } from "lucide-react";
import { categoryMeta } from "../data/categories";
import type { Expense, Trip } from "../types";
import { money } from "../utils/format";

export function MapScreen({ trip, expenses }: { trip: Trip; expenses: Expense[] }) {
  const locations = Object.values(expenses.reduce<Record<string, { total: number; count: number; expense: Expense }>>((result, expense) => {
    if (!expense.location) return result;
    const item = result[expense.location] ?? { total: 0, count: 0, expense };
    item.total += expense.amount_home;
    item.count += 1;
    result[expense.location] = item;
    return result;
  }, {}));
  return (
    <motion.div className="screen" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="page-heading"><p className="eyebrow">Your route</p><h1>Travel map</h1><p>Places from your saved expenses, kept completely local.</p></div>
      <section className="mock-map">
        <div className="map-grid" />
        <div className="map-route route-one" />
        <div className="map-route route-two" />
        {locations.slice(0, 5).map((item, index) => {
          const meta = categoryMeta[item.expense.category];
          const Icon = meta.Icon;
          return <motion.div key={item.expense.location} className={`map-pin pin-${index + 1}`} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: index * 0.12, type: "spring" }}><span style={{ background: meta.color }}><Icon size={16} /></span><small>{item.expense.location?.split(",")[0]}</small></motion.div>;
        })}
        <div className="map-badge"><Navigation size={16} /><span><strong>{locations.length} saved places</strong><small>No external map connection</small></span></div>
      </section>
      <div className="privacy-note"><ShieldCheck size={18} /><p><strong>Private by design.</strong> Locations are read only from your local expense notes and never leave this device.</p></div>
      <div className="location-grid">
        {locations.map((item) => {
          const meta = categoryMeta[item.expense.category];
          const Icon = meta.Icon;
          return <article key={item.expense.location}><span style={{ background: meta.color }}><Icon size={17} /></span><div><strong>{item.expense.location}</strong><small>{item.count} entr{item.count === 1 ? "y" : "ies"}</small></div><b>{money(item.total, trip.home_currency)}</b></article>;
        })}
      </div>
    </motion.div>
  );
}
