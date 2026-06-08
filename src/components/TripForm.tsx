import { Plus, Users, X } from "lucide-react";
import { useState } from "react";
import { currencies } from "../data/categories";
import { db } from "../db/database";
import type { Participant, Trip } from "../types";
import { dateInputValue } from "../utils/format";

export function TripForm({ trip, participants: initialParticipants = [], onDone, onCancel, notify }: {
  trip?: Trip;
  participants?: Participant[];
  onDone: (tripId: string) => void;
  onCancel: () => void;
  notify: (message: string, tone?: "success" | "error") => void;
}) {
  const future = new Date();
  future.setMonth(future.getMonth() + 2);
  const [name, setName] = useState(trip?.name ?? "");
  const [totalBudget, setTotalBudget] = useState(String(trip?.total_budget ?? ""));
  const [dailyBudget, setDailyBudget] = useState(String(trip?.daily_budget ?? ""));
  const [startDate, setStartDate] = useState(trip?.start_date ?? dateInputValue());
  const [endDate, setEndDate] = useState(trip?.end_date ?? dateInputValue(future));
  const [currency, setCurrency] = useState(trip?.home_currency ?? "USD");
  const [isGroup, setIsGroup] = useState(Boolean(trip?.is_group));
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants.length ? initialParticipants : []);
  const namedParticipants = participants.filter((participant) => participant.name.trim());
  const groupValid = !isGroup || (namedParticipants.length >= 2 && namedParticipants.length <= 5);
  const valid = name.trim() && Number(totalBudget) > 0 && Number(dailyBudget) > 0 && startDate && endDate && endDate >= startDate && groupValid;

  function addParticipant() {
    if (participants.length >= 5) return;
    setParticipants((items) => [...items, { id: crypto.randomUUID(), trip_id: trip?.id ?? "", name: "", created_at: new Date().toISOString() }]);
  }

  function toggleGroup() {
    setIsGroup((value) => {
      if (!value && participants.length === 0) {
        const created = new Date().toISOString();
        setParticipants([
          { id: crypto.randomUUID(), trip_id: trip?.id ?? "", name: "", created_at: created },
          { id: crypto.randomUUID(), trip_id: trip?.id ?? "", name: "", created_at: created },
        ]);
      }
      return !value;
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid) return;
    const now = new Date().toISOString();
    const id = trip?.id ?? crypto.randomUUID();
    await db.transaction("rw", [db.trips, db.participants, db.expenses, db.expenseSplits, db.transfers], async () => {
      await db.trips.put({
        id, name: name.trim(), total_budget: Number(totalBudget), daily_budget: Number(dailyBudget),
        start_date: startDate, end_date: endDate, home_currency: currency, is_group: isGroup,
        created_at: trip?.created_at ?? now, updated_at: now,
      });
      const existingIds = await db.participants.where("trip_id").equals(id).primaryKeys();
      const keepIds = namedParticipants.map((participant) => participant.id);
      const removedIds = existingIds.filter((participantId) => !keepIds.includes(participantId));
      if (removedIds.length) {
        const removedSplits = await db.expenseSplits.where("participant_id").anyOf(removedIds).toArray();
        await db.expenseSplits.where("participant_id").anyOf(removedIds).delete();
        await db.transfers.where("from_participant_id").anyOf(removedIds).delete();
        await db.transfers.where("to_participant_id").anyOf(removedIds).delete();
        const affectedExpenseIds = [...new Set(removedSplits.map((split) => split.expense_id))];
        for (const expenseId of affectedExpenseIds) {
          const removedTotal = removedSplits.filter((split) => split.expense_id === expenseId).reduce((sum, split) => sum + split.amount_owed, 0);
          const remainingSplits = await db.expenseSplits.where("expense_id").equals(expenseId).toArray();
          if (remainingSplits.length) {
            const totalCents = Math.round(removedTotal * 100);
            const baseCents = Math.floor(totalCents / remainingSplits.length);
            let remainder = totalCents - baseCents * remainingSplits.length;
            await db.expenseSplits.bulkPut(remainingSplits.map((split) => ({ ...split, amount_owed: Number((split.amount_owed + (baseCents + (remainder-- > 0 ? 1 : 0)) / 100).toFixed(2)) })));
          }
        }
        if (namedParticipants[0]) await db.expenses.where("trip_id").equals(id).and((expense) => Boolean(expense.paid_by_participant_id && removedIds.includes(expense.paid_by_participant_id))).modify({ paid_by_participant_id: namedParticipants[0].id });
      }
      await db.participants.where("trip_id").equals(id).delete();
      if (isGroup) await db.participants.bulkAdd(namedParticipants.map((participant) => ({ ...participant, trip_id: id, name: participant.name.trim() })));
      if (!isGroup) {
        const expenseIds = await db.expenses.where("trip_id").equals(id).primaryKeys();
        if (expenseIds.length) await db.expenseSplits.where("expense_id").anyOf(expenseIds).delete();
        await db.expenses.where("trip_id").equals(id).modify({ paid_by_participant_id: undefined, split_type: undefined });
        await db.transfers.where("trip_id").equals(id).delete();
      }
    });
    notify(trip ? "Trip updated." : "New trip created.");
    onDone(id);
  }

  return (
    <form className="form-stack" onSubmit={submit}>
      <label className="field full"><span>Trip name</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Summer in Japan" required /></label>
      <div className="form-grid">
        <label className="field"><span>Total budget</span><input type="number" min="0" step="any" value={totalBudget} onChange={(event) => setTotalBudget(event.target.value)} placeholder="10,000" required /></label>
        <label className="field"><span>Daily target</span><input type="number" min="0" step="any" value={dailyBudget} onChange={(event) => setDailyBudget(event.target.value)} placeholder="100" required /></label>
        <label className="field"><span>Start date</span><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required /></label>
        <label className="field"><span>End date</span><input type="date" min={startDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} required /></label>
      </div>
      <label className="field full"><span>Home currency</span><select value={currency} onChange={(event) => setCurrency(event.target.value)}>{currencies.map((item) => <option key={item}>{item}</option>)}</select></label>
      <button type="button" className={`group-trip-toggle ${isGroup ? "active" : ""}`} onClick={toggleGroup} aria-pressed={isGroup}>
        <span><Users size={18} /></span><p><strong>Group trip</strong><small>Split expenses and settle balances with 2 to 5 people.</small></p><i />
      </button>
      {isGroup && (
        <section className="participant-editor">
          <div><span>Participants</span><small>{namedParticipants.length}/5 people</small></div>
          {participants.map((participant, index) => (
            <label key={participant.id}><span>{index + 1}</span><input value={participant.name} onChange={(event) => setParticipants((items) => items.map((item) => item.id === participant.id ? { ...item, name: event.target.value } : item))} placeholder={`Participant ${index + 1}`} aria-label={`Participant ${index + 1} name`} /><button type="button" onClick={() => setParticipants((items) => items.filter((item) => item.id !== participant.id))} aria-label={`Remove participant ${index + 1}`}><X size={14} /></button></label>
          ))}
          {participants.length < 5 && <button type="button" className="add-participant" onClick={addParticipant}><Plus size={14} /> Add participant</button>}
          {namedParticipants.length < 2 && <p className="form-error">A group trip needs at least two named participants.</p>}
        </section>
      )}
      {endDate < startDate && <p className="form-error">End date must be after the start date.</p>}
      <div className="form-actions"><button type="button" className="button secondary" onClick={onCancel}>Cancel</button><button className="button primary" disabled={!valid}>{trip ? "Save trip" : "Create trip"}</button></div>
    </form>
  );
}
