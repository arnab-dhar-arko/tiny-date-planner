import { ArrowRight, HandCoins } from "lucide-react";
import { useState } from "react";
import { db } from "../db/database";
import type { Transfer, Trip } from "../types";
import type { SettlementSuggestion } from "../utils/group";
import { money } from "../utils/format";

export function SettlementForm({ trip, suggestion, onDone, onCancel, notify }: {
  trip: Trip;
  suggestion: SettlementSuggestion;
  onDone: () => void;
  onCancel: () => void;
  notify: (message: string, tone?: "success" | "error") => void;
}) {
  const [amount, setAmount] = useState(String(suggestion.amount));
  const valid = Number(amount) > 0 && Number(amount) <= suggestion.amount + 0.01;
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid) return;
    const transfer: Transfer = { id: crypto.randomUUID(), trip_id: trip.id, from_participant_id: suggestion.from.id, to_participant_id: suggestion.to.id, amount: Number(amount), timestamp: new Date().toISOString() };
    await db.transfers.add(transfer);
    notify("Settlement recorded locally.");
    onDone();
  }
  return (
    <form className="form-stack settlement-form" onSubmit={submit}>
      <div className="settlement-preview"><span className="person-avatar">{suggestion.from.name.slice(0, 1)}</span><div><strong>{suggestion.from.name}</strong><small>pays</small></div><ArrowRight size={18} /><span className="person-avatar creditor">{suggestion.to.name.slice(0, 1)}</span><div><strong>{suggestion.to.name}</strong><small>receives</small></div></div>
      <label className="field full"><span>Settlement amount ({trip.home_currency})</span><input autoFocus type="number" min="0.01" max={suggestion.amount} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
      <p className="settlement-help"><HandCoins size={15} /> Outstanding instruction: {money(suggestion.amount, trip.home_currency)}</p>
      <div className="form-actions"><button type="button" className="button secondary" onClick={onCancel}>Cancel</button><button className="button primary" disabled={!valid}>Record settlement</button></div>
    </form>
  );
}
