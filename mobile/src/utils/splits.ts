import type { Balance, Expense, ExpenseSplit, Settlement, SettlementSuggestion, TripMember } from "../types";

const cents = (value: number) => Math.round(value * 100);
const dollars = (value: number) => Math.round(value) / 100;

export function equalSplits(total: number, members: TripMember[], expenseId: string): ExpenseSplit[] {
  const totalCents = cents(total);
  const base = Math.floor(totalCents / members.length);
  let remainder = totalCents - base * members.length;
  return members.map((member) => {
    const owed = base + (remainder > 0 ? 1 : 0);
    remainder -= 1;
    return {
      id: `${expenseId}-${member.user_id}`,
      expense_id: expenseId,
      user_id: member.user_id,
      amount_owed: dollars(owed)
    };
  });
}

export function calculateBalances(
  members: TripMember[],
  expenses: Expense[],
  splits: ExpenseSplit[],
  settlements: Settlement[]
): Balance[] {
  return members.map((member) => {
    const paid = expenses.filter((expense) => expense.paid_by_user_id === member.user_id).reduce((sum, item) => sum + item.amount_base, 0);
    const owed = splits.filter((split) => split.user_id === member.user_id).reduce((sum, item) => sum + item.amount_owed, 0);
    const sent = settlements.filter((settlement) => settlement.from_user_id === member.user_id).reduce((sum, item) => sum + item.amount, 0);
    const received = settlements.filter((settlement) => settlement.to_user_id === member.user_id).reduce((sum, item) => sum + item.amount, 0);
    return {
      user_id: member.user_id,
      paid: dollars(cents(paid)),
      owed: dollars(cents(owed)),
      sent: dollars(cents(sent)),
      received: dollars(cents(received)),
      net: dollars(cents(paid) - cents(owed) + cents(sent) - cents(received))
    };
  });
}

export function simplifyDebts(balances: Balance[]): SettlementSuggestion[] {
  const debtors = balances.filter((item) => cents(item.net) < 0).map((item) => ({ user_id: item.user_id, amount: -cents(item.net) })).sort((a, b) => b.amount - a.amount);
  const creditors = balances.filter((item) => cents(item.net) > 0).map((item) => ({ user_id: item.user_id, amount: cents(item.net) })).sort((a, b) => b.amount - a.amount);
  const suggestions: SettlementSuggestion[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const amount = Math.min(debtors[debtorIndex].amount, creditors[creditorIndex].amount);
    if (amount > 0) {
      suggestions.push({
        from_user_id: debtors[debtorIndex].user_id,
        to_user_id: creditors[creditorIndex].user_id,
        amount: dollars(amount)
      });
    }
    debtors[debtorIndex].amount -= amount;
    creditors[creditorIndex].amount -= amount;
    if (debtors[debtorIndex].amount === 0) debtorIndex += 1;
    if (creditors[creditorIndex].amount === 0) creditorIndex += 1;
  }

  return suggestions;
}
