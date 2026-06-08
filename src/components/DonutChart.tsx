import { motion } from "framer-motion";
import { categoryMeta } from "../data/categories";
import type { Category } from "../types";
import { money } from "../utils/format";

interface DonutChartProps {
  values: Record<Category, number>;
  currency: string;
}

export function DonutChart({ values, currency }: DonutChartProps) {
  const entries = (Object.entries(values) as [Category, number][]).filter(([, value]) => value > 0).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  let offset = 0;
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="donut-wrap">
      <div className="donut-chart">
        <svg viewBox="0 0 180 180" role="img" aria-label="Spending by category">
          <circle cx="90" cy="90" r={radius} fill="none" stroke="var(--line)" strokeWidth="24" />
          {entries.map(([category, value], index) => {
            const percent = value / total;
            const dash = percent * circumference;
            const currentOffset = offset;
            offset += dash;
            return (
              <motion.circle
                key={category}
                cx="90" cy="90" r={radius}
                fill="none"
                stroke={categoryMeta[category].color}
                strokeWidth="24"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-currentOffset}
                transform="rotate(-90 90 90)"
                initial={{ strokeDasharray: `0 ${circumference}` }}
                animate={{ strokeDasharray: `${dash} ${circumference - dash}` }}
                transition={{ duration: 0.8, delay: index * 0.08 }}
              />
            );
          })}
        </svg>
        <div className="donut-center"><strong>{money(total, currency, true)}</strong><span>all time</span></div>
      </div>
      <div className="donut-legend">
        {entries.map(([category, value]) => {
          const meta = categoryMeta[category];
          const Icon = meta.Icon;
          return (
            <div key={category} className="legend-row">
              <span className="legend-icon" style={{ background: meta.color }}><Icon size={13} /></span>
              <span>{meta.shortLabel}</span>
              <strong>{total ? Math.round((value / total) * 100) : 0}%</strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}
