import { motion } from "framer-motion";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { categoryMeta } from "../data/categories";
import type { Expense, Trip } from "../types";
import { localMoney, money } from "../utils/format";

export function ExpenseCard({ expense, trip, onEdit, onDelete }: { expense: Expense; trip: Trip; onEdit: () => void; onDelete: () => void }) {
  const [actions, setActions] = useState(false);
  const meta = categoryMeta[expense.category];
  const Icon = meta.Icon;
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -50, height: 0 }}
      className={`expense-card ${actions ? "actions-open" : ""}`}
      whileTap={{ scale: 0.995 }}
    >
      <button className="expense-main" onClick={onEdit} aria-label={`Edit ${expense.title}`}>
        <span className="category-orb" style={{ background: meta.color }}><Icon size={20} /></span>
        <span className="expense-copy">
          <strong>{expense.title}</strong>
          <small>{meta.label}{expense.location ? ` · ${expense.location}` : ""}</small>
        </span>
        <span className="expense-amount">
          <strong>{money(expense.amount_home, trip.home_currency)}</strong>
          <small>{localMoney(expense.amount_local, expense.local_currency)}</small>
        </span>
      </button>
      <button className="more-button" onClick={() => setActions((value) => !value)} aria-label={`Actions for ${expense.title}`}><MoreHorizontal size={18} /></button>
      {actions && (
        <div className="expense-actions">
          <button onClick={onEdit}><Pencil size={14} /> Edit</button>
          <button className="danger" onClick={onDelete}><Trash2 size={14} /> Delete</button>
        </div>
      )}
    </motion.article>
  );
}
