import { RefreshCw, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { currencies, categoryMeta } from "../data/categories";
import { getMockRate, saveExpenseWithSplits } from "../db/database";
import { categories, type Category, type Expense, type ExpenseSplit, type Participant, type SplitType, type Trip } from "../types";
import { dateInputValue, expenseTimestamp, money, timeInputValue } from "../utils/format";
import { equalSplit } from "../utils/group";

export function ExpenseForm({ trip, participants, expenseSplits = [], expense, onDone, onCancel, notify }: {
  trip: Trip;
  participants: Participant[];
  expenseSplits?: ExpenseSplit[];
  expense?: Expense;
  onDone: () => void;
  onCancel: () => void;
  notify: (message: string, tone?: "success" | "error") => void;
}) {
  const initialDate = expense ? new Date(expense.timestamp) : new Date();
  const [title, setTitle] = useState(expense?.title ?? "");
  const [category, setCategory] = useState<Category>(expense?.category ?? "food");
  const [amountLocal, setAmountLocal] = useState(String(expense?.amount_local ?? ""));
  const [localCurrency, setLocalCurrency] = useState(expense?.local_currency ?? trip.home_currency);
  const [rate, setRate] = useState(String(expense?.exchange_rate ?? (trip.home_currency === localCurrency ? 1 : "")));
  const [date, setDate] = useState(dateInputValue(initialDate));
  const [time, setTime] = useState(timeInputValue(initialDate));
  const [location, setLocation] = useState(expense?.location ?? "");
  const [notes, setNotes] = useState(expense?.notes ?? "");
  const [loadingRate, setLoadingRate] = useState(false);
  const [paidBy, setPaidBy] = useState(expense?.paid_by_participant_id ?? participants[0]?.id ?? "");
  const [splitType, setSplitType] = useState<SplitType>(expense?.split_type ?? "equal");
  const [customSplits, setCustomSplits] = useState<Record<string, string>>(() => Object.fromEntries(expenseSplits.map((split) => [split.participant_id, String(expense?.split_type === "percentage" && expense.amount_home ? Number(((split.amount_owed / expense.amount_home) * 100).toFixed(2)) : split.amount_owed)])));
  const amountHome = Number(amountLocal) * Number(rate);
  const isGroup = Boolean(trip.is_group && participants.length);
  const customTotal = participants.reduce((sum, participant) => sum + Number(customSplits[participant.id] || 0), 0);
  const expectedCustomTotal = splitType === "percentage" ? 100 : amountHome;
  const customValid = splitType === "equal" || Math.abs(customTotal - expectedCustomTotal) < 0.01;
  const valid = title.trim() && Number(amountLocal) > 0 && Number(rate) > 0 && date && (!isGroup || (paidBy && customValid));

  useEffect(() => {
    if (localCurrency === trip.home_currency) setRate("1");
  }, [localCurrency, trip.home_currency]);

  useEffect(() => {
    if (splitType === "equal") return;
    if (!Object.keys(customSplits).length && participants.length) {
      const equal = splitType === "percentage" ? 100 / participants.length : amountHome / participants.length;
      setCustomSplits(Object.fromEntries(participants.map((participant) => [participant.id, String(Number(equal.toFixed(2)))])));
    }
  }, [amountHome, customSplits, participants, splitType]);

  const rateHint = useMemo(() => `1 ${localCurrency} = ${rate || "—"} ${trip.home_currency}`, [localCurrency, rate, trip.home_currency]);

  async function fetchRate() {
    setLoadingRate(true);
    const fetched = await getMockRate(localCurrency, trip.home_currency, date);
    setLoadingRate(false);
    if (!fetched) return notify("No cached mock rate for this pair. Enter one manually.", "error");
    setRate(String(fetched));
    notify("Daily mock rate loaded.");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid) return;
    const now = new Date().toISOString();
    const data: Expense = {
      id: expense?.id ?? crypto.randomUUID(), trip_id: trip.id, title: title.trim(), category,
      amount_home: Number(amountHome.toFixed(4)), amount_local: Number(amountLocal), local_currency: localCurrency,
      exchange_rate: Number(rate), timestamp: expenseTimestamp(date, time), location: location.trim() || undefined,
      notes: notes.trim() || undefined, paid_by_participant_id: isGroup ? paidBy : undefined,
      split_type: isGroup ? splitType : undefined, created_at: expense?.created_at ?? now, updated_at: now,
    };
    let splits: ExpenseSplit[] = [];
    if (isGroup && splitType === "equal") splits = equalSplit(data.amount_home, participants);
    if (isGroup && splitType === "exact") splits = participants.map((participant) => ({ id: crypto.randomUUID(), expense_id: data.id, participant_id: participant.id, amount_owed: Number(customSplits[participant.id] || 0) }));
    if (isGroup && splitType === "percentage") {
      splits = participants.map((participant) => ({ id: crypto.randomUUID(), expense_id: data.id, participant_id: participant.id, amount_owed: Number(((Number(customSplits[participant.id] || 0) / 100) * data.amount_home).toFixed(2)) }));
      const roundedDifference = Number((data.amount_home - splits.reduce((sum, split) => sum + split.amount_owed, 0)).toFixed(2));
      if (splits.length) splits[splits.length - 1].amount_owed = Number((splits[splits.length - 1].amount_owed + roundedDifference).toFixed(2));
    }
    await saveExpenseWithSplits(data, splits);
    notify(expense ? "Expense and split updated." : "Expense added and split.");
    onDone();
  }

  return (
    <form className="form-stack" onSubmit={submit}>
      <label className="field full"><span>Expense title</span><input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What did you spend on?" required /></label>
      <fieldset className="category-picker"><legend>Category</legend><div>{categories.map((item) => { const meta = categoryMeta[item]; const Icon = meta.Icon; return <button type="button" key={item} className={category === item ? "selected" : ""} style={{ "--category": meta.color } as React.CSSProperties} onClick={() => setCategory(item)}><Icon size={18} /><span>{meta.shortLabel}</span></button>; })}</div></fieldset>
      <div className="form-grid">
        <label className="field"><span>Local amount</span><input type="number" min="0" step="any" value={amountLocal} onChange={(event) => setAmountLocal(event.target.value)} placeholder="0.00" required /></label>
        <label className="field"><span>Local currency</span><select value={localCurrency} onChange={(event) => setLocalCurrency(event.target.value)}>{currencies.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="field"><span>Exchange rate</span><input type="number" min="0" step="any" value={rate} onChange={(event) => setRate(event.target.value)} placeholder="0.00" required /></label>
        <div className="rate-card"><span>{rateHint}</span><button type="button" onClick={fetchRate} disabled={loadingRate || localCurrency === trip.home_currency}><RefreshCw size={14} className={loadingRate ? "spin" : ""} /> Mock rate</button></div>
      </div>
      <div className="conversion-preview"><span>Converted amount</span><strong>{money(Number.isFinite(amountHome) ? amountHome : 0, trip.home_currency)}</strong></div>
      {isGroup && (
        <section className="split-editor">
          <div className="split-heading"><span><Users size={16} /> Group split</span><small>{participants.length} people</small></div>
          <label className="field full"><span>Paid by</span><select value={paidBy} onChange={(event) => setPaidBy(event.target.value)}>{participants.map((participant) => <option value={participant.id} key={participant.id}>{participant.name}</option>)}</select></label>
          <div className="segmented-control" role="group" aria-label="Split type">
            <button type="button" className={splitType === "equal" ? "active" : ""} onClick={() => setSplitType("equal")}>Equally</button>
            <button type="button" className={splitType === "exact" ? "active" : ""} onClick={() => setSplitType("exact")}>Exact</button>
            <button type="button" className={splitType === "percentage" ? "active" : ""} onClick={() => setSplitType("percentage")}>Percent</button>
          </div>
          {splitType === "equal" ? <p className="equal-split-note">Each person owes about {money(amountHome / participants.length || 0, trip.home_currency)}.</p> : (
            <div className="custom-splits">
              {participants.map((participant) => <label key={participant.id}><span className="person-avatar">{participant.name.slice(0, 1).toUpperCase()}</span><strong>{participant.name}</strong><div>{splitType === "exact" && <i>{trip.home_currency}</i>}<input type="number" min="0" step="any" value={customSplits[participant.id] ?? ""} onChange={(event) => setCustomSplits((items) => ({ ...items, [participant.id]: event.target.value }))} aria-label={`${participant.name} ${splitType === "exact" ? "amount" : "percentage"}`} />{splitType === "percentage" && <i>%</i>}</div></label>)}
              <p className={customValid ? "split-total valid" : "split-total"}><span>Total</span><strong>{splitType === "percentage" ? `${customTotal.toFixed(2)}%` : money(customTotal, trip.home_currency)}</strong><small>needs {splitType === "percentage" ? "100%" : money(amountHome || 0, trip.home_currency)}</small></p>
            </div>
          )}
        </section>
      )}
      <div className="form-grid"><label className="field"><span>Date</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></label><label className="field"><span>Time</span><input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label></div>
      <label className="field full"><span>Location <em>optional</em></span><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Hanoi, Vietnam" /></label>
      <label className="field full"><span>Notes <em>optional</em></span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="A useful detail to remember" rows={2} /></label>
      <div className="form-actions"><button type="button" className="button secondary" onClick={onCancel}>Cancel</button><button className="button primary" disabled={!valid}>{expense ? "Save changes" : "Add expense"}</button></div>
    </form>
  );
}
