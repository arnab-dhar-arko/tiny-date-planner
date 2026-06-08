import type { Expense, ExpenseSplit, Participant, Transfer } from "../types";

export interface ParticipantBalance {
  participant: Participant;
  paid: number;
  owed: number;
  sent: number;
  received: number;
  net: number;
}

export interface SettlementSuggestion {
  from: Participant;
  to: Participant;
  amount: number;
}

const cents = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function equalSplit(total: number, participants: Participant[]): ExpenseSplit[] {
  if (!participants.length) return [];
  const totalCents = Math.round(total * 100);
  const base = Math.floor(totalCents / participants.length);
  let remainder = totalCents - base * participants.length;
  return participants.map((participant) => ({
    id: crypto.randomUUID(),
    expense_id: "",
    participant_id: participant.id,
    amount_owed: (base + (remainder-- > 0 ? 1 : 0)) / 100,
  }));
}

export function calculateBalances(
  participants: Participant[],
  expenses: Expense[],
  splits: ExpenseSplit[],
  transfers: Transfer[],
): ParticipantBalance[] {
  const balances = new Map(participants.map((participant) => [participant.id, {
    participant, paid: 0, owed: 0, sent: 0, received: 0, net: 0,
  }]));

  expenses.forEach((expense) => {
    if (expense.paid_by_participant_id) {
      const balance = balances.get(expense.paid_by_participant_id);
      if (balance) balance.paid += expense.amount_home;
    }
  });
  splits.forEach((split) => {
    const balance = balances.get(split.participant_id);
    if (balance) balance.owed += split.amount_owed;
  });
  transfers.forEach((transfer) => {
    const sender = balances.get(transfer.from_participant_id);
    const receiver = balances.get(transfer.to_participant_id);
    if (sender) sender.sent += transfer.amount;
    if (receiver) receiver.received += transfer.amount;
  });
  return [...balances.values()].map((balance) => ({
    ...balance,
    paid: cents(balance.paid),
    owed: cents(balance.owed),
    sent: cents(balance.sent),
    received: cents(balance.received),
    net: cents(balance.paid - balance.owed + balance.sent - balance.received),
  }));
}

export function simplifyDebts(balances: ParticipantBalance[]): SettlementSuggestion[] {
  const creditors = balances.filter((item) => item.net > 0.009).map((item) => ({ ...item, remaining: item.net })).sort((a, b) => b.remaining - a.remaining);
  const debtors = balances.filter((item) => item.net < -0.009).map((item) => ({ ...item, remaining: -item.net })).sort((a, b) => b.remaining - a.remaining);
  const suggestions: SettlementSuggestion[] = [];

  while (creditors.length && debtors.length) {
    creditors.sort((a, b) => b.remaining - a.remaining);
    debtors.sort((a, b) => b.remaining - a.remaining);
    const creditor = creditors[0];
    const debtor = debtors[0];
    const amount = cents(Math.min(creditor.remaining, debtor.remaining));
    suggestions.push({ from: debtor.participant, to: creditor.participant, amount });
    creditor.remaining = cents(creditor.remaining - amount);
    debtor.remaining = cents(debtor.remaining - amount);
    if (creditor.remaining < 0.01) creditors.shift();
    if (debtor.remaining < 0.01) debtors.shift();
  }
  return suggestions;
}
