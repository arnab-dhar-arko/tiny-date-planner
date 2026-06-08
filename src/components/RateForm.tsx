import { useState } from "react";
import { currencies } from "../data/categories";
import { db } from "../db/database";
import type { ExchangeRate } from "../types";
import { dateInputValue } from "../utils/format";

export function RateForm({ exchangeRate, onDone, onCancel, notify }: {
  exchangeRate?: ExchangeRate;
  onDone: () => void;
  onCancel: () => void;
  notify: (message: string, tone?: "success" | "error") => void;
}) {
  const [base, setBase] = useState(exchangeRate?.base_currency ?? "VND");
  const [target, setTarget] = useState(exchangeRate?.target_currency ?? "USD");
  const [rate, setRate] = useState(String(exchangeRate?.rate ?? ""));
  const [date, setDate] = useState(exchangeRate?.date ?? dateInputValue());
  const valid = base !== target && Number(rate) > 0 && date;
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid) return;
    await db.exchangeRates.put({ id: exchangeRate?.id ?? crypto.randomUUID(), base_currency: base, target_currency: target, rate: Number(rate), date, source: "manual", created_at: exchangeRate?.created_at ?? new Date().toISOString() });
    notify(exchangeRate ? "Exchange rate updated." : "Manual exchange rate saved.");
    onDone();
  }
  return (
    <form className="form-stack" onSubmit={submit}>
      <div className="form-grid">
        <label className="field"><span>From currency</span><select value={base} onChange={(event) => setBase(event.target.value)}>{currencies.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="field"><span>To currency</span><select value={target} onChange={(event) => setTarget(event.target.value)}>{currencies.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="field"><span>Rate</span><input type="number" min="0" step="any" value={rate} onChange={(event) => setRate(event.target.value)} placeholder="0.000039" required /></label>
        <label className="field"><span>Date</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></label>
      </div>
      <div className="conversion-preview"><span>Conversion</span><strong>1 {base} = {rate || "—"} {target}</strong></div>
      <div className="form-actions"><button type="button" className="button secondary" onClick={onCancel}>Cancel</button><button className="button primary" disabled={!valid}>{exchangeRate ? "Save changes" : "Save rate"}</button></div>
    </form>
  );
}
