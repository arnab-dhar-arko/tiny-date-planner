import { BarChart3, ListFilter, Map, Search, Settings } from "lucide-react";
import { motion } from "framer-motion";
import type { View } from "../types";

const items = [
  { id: "entries", label: "Entries", Icon: ListFilter },
  { id: "stats", label: "Stats", Icon: BarChart3 },
  { id: "search", label: "Search", Icon: Search },
  { id: "map", label: "Map", Icon: Map },
  { id: "settings", label: "Settings", Icon: Settings },
] as const;

export function BottomNav({ active, onChange }: { active: View; onChange: (view: View) => void }) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {items.map(({ id, label, Icon }) => (
        <button key={id} onClick={() => onChange(id)} className={active === id ? "active" : ""} aria-current={active === id ? "page" : undefined}>
          <span className="nav-icon">
            {active === id && <motion.span layoutId="nav-active" className="nav-active-pill" />}
            <Icon size={20} strokeWidth={active === id ? 2.5 : 1.8} />
          </span>
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
