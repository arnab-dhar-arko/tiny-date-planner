import { ChevronDown, Gauge, WalletCards } from "lucide-react";
import { motion } from "framer-motion";
import type { Trip } from "../types";
import { clamp, money } from "../utils/format";

interface KpiCardsProps {
  trip: Trip;
  total: number;
  dailyAverage: number;
  compact?: boolean;
}

export function KpiCards({ trip, total, dailyAverage, compact }: KpiCardsProps) {
  const cards = [
    {
      label: "Total spend",
      icon: WalletCards,
      value: money(total, trip.home_currency, true),
      target: `of ${money(trip.total_budget, trip.home_currency, true)}`,
      percent: (total / trip.total_budget) * 100,
    },
    {
      label: "Daily average",
      icon: Gauge,
      value: money(dailyAverage, trip.home_currency, true),
      target: `of ${money(trip.daily_budget, trip.home_currency, true)}`,
      percent: (dailyAverage / trip.daily_budget) * 100,
    },
  ];
  return (
    <section className={`kpi-grid ${compact ? "compact" : ""}`} aria-label="Budget summary">
      {cards.map((card) => {
        const Icon = card.icon;
        const over = card.percent > 100;
        return (
          <motion.article key={card.label} className="kpi-card" whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
            <div className="kpi-label">
              <span><Icon size={14} /> {card.label}</span>
              <ChevronDown size={14} />
            </div>
            <div className="kpi-value"><strong>{card.value}</strong><span>{card.target}</span></div>
            <div className="progress-track" aria-label={`${Math.round(card.percent)} percent`}>
              <motion.div className={over ? "over" : ""} initial={{ width: 0 }} animate={{ width: `${clamp(card.percent)}%` }} transition={{ duration: 0.7, ease: "easeOut" }} />
            </div>
          </motion.article>
        );
      })}
    </section>
  );
}
