import { ArrowRight, CheckCircle2, HandCoins, ReceiptText, Scale, Trash2, WalletCards } from "lucide-react";
import { motion } from "framer-motion";
import type { Expense, ExpenseSplit, Participant, Transfer, Trip } from "../types";
import { calculateBalances, simplifyDebts, type SettlementSuggestion } from "../utils/group";
import { money } from "../utils/format";

export function BalancesPanel({ trip, participants, expenses, splits, transfers, onSettle, onDeleteTransfer }: {
  trip: Trip;
  participants: Participant[];
  expenses: Expense[];
  splits: ExpenseSplit[];
  transfers: Transfer[];
  onSettle: (suggestion: SettlementSuggestion) => void;
  onDeleteTransfer: (transfer: Transfer) => void;
}) {
  const balances = calculateBalances(participants, expenses, splits, transfers);
  const suggestions = simplifyDebts(balances);
  const settled = suggestions.length === 0 && expenses.length > 0;
  return (
    <div className="balances-layout">
      <section className="balance-summary-grid">
        {balances.map((balance, index) => (
          <motion.article key={balance.participant.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}>
            <span className="person-avatar large">{balance.participant.name.slice(0, 1).toUpperCase()}</span>
            <div><strong>{balance.participant.name}</strong><small>paid {money(balance.paid, trip.home_currency)}</small></div>
            <b className={balance.net > 0.009 ? "positive" : balance.net < -0.009 ? "negative" : ""}>{balance.net > 0.009 ? `gets ${money(balance.net, trip.home_currency)}` : balance.net < -0.009 ? `owes ${money(-balance.net, trip.home_currency)}` : "settled"}</b>
          </motion.article>
        ))}
      </section>
      <section className="panel person-breakdown">
        <div className="section-heading"><div><p className="eyebrow">Per person</p><h2>Spending breakdown</h2></div></div>
        {balances.map((balance) => (
          <div className="person-ledger-row" key={balance.participant.id}>
            <span className="person-avatar">{balance.participant.name.slice(0, 1).toUpperCase()}</span>
            <strong>{balance.participant.name}</strong>
            <span><WalletCards size={13} /> paid <b>{money(balance.paid, trip.home_currency)}</b></span>
            <span><ReceiptText size={13} /> share <b>{money(balance.owed, trip.home_currency)}</b></span>
          </div>
        ))}
      </section>
      <section className="panel settlement-panel">
        <div className="section-heading"><div><p className="eyebrow">Debt simplification</p><h2>Settle in fewer moves</h2></div><Scale size={20} /></div>
        {suggestions.length ? <div className="settlement-list">{suggestions.map((suggestion, index) => (
          <motion.article key={`${suggestion.from.id}-${suggestion.to.id}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.06 }}>
            <div className="settlement-people"><span className="person-avatar">{suggestion.from.name.slice(0, 1)}</span><ArrowRight size={15} /><span className="person-avatar creditor">{suggestion.to.name.slice(0, 1)}</span></div>
            <p><strong>{suggestion.from.name}</strong> pays <strong>{suggestion.to.name}</strong><small>{money(suggestion.amount, trip.home_currency)}</small></p>
            <button className="button primary small" onClick={() => onSettle(suggestion)}><HandCoins size={14} /> Settle up</button>
          </motion.article>
        ))}</div> : (
          <div className="all-settled"><CheckCircle2 size={28} /><h3>{settled ? "Everyone is settled up" : "No group expenses yet"}</h3><p>{settled ? "There are no outstanding group balances." : "Group expenses will create simplified payment instructions here."}</p></div>
        )}
      </section>
      {transfers.length > 0 && <section className="panel transfer-history"><div className="section-heading"><div><p className="eyebrow">Recorded locally</p><h2>Settlement history</h2></div></div>{transfers.slice().reverse().map((transfer) => { const from = participants.find((item) => item.id === transfer.from_participant_id); const to = participants.find((item) => item.id === transfer.to_participant_id); return <div key={transfer.id}><span><HandCoins size={14} /></span><p><strong>{from?.name} paid {to?.name}</strong><small>{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(transfer.timestamp))}</small></p><b>{money(transfer.amount, trip.home_currency)}</b><button onClick={() => onDeleteTransfer(transfer)} aria-label={`Delete ${from?.name} to ${to?.name} settlement`}><Trash2 size={14} /></button></div>; })}</section>}
    </div>
  );
}
