import type { SettlementSuggestion } from "../types.js";

export type BalanceInput = {
  user_id: string;
  paid: number;
  owed: number;
  sent: number;
  received: number;
};

export type NetBalance = BalanceInput & {
  net: number;
};

const cents = (value: number) => Math.round(value * 100);
const money = (value: number) => Math.round(value) / 100;

export function calculateNetBalances(rows: BalanceInput[]): NetBalance[] {
  return rows.map((row) => ({
    ...row,
    net: money(cents(row.paid) - cents(row.owed) + cents(row.sent) - cents(row.received))
  }));
}

export function simplifyDebts(balances: NetBalance[]): SettlementSuggestion[] {
  const debtors = balances
    .filter((balance) => cents(balance.net) < 0)
    .map((balance) => ({ user_id: balance.user_id, amount: -cents(balance.net) }))
    .sort((a, b) => b.amount - a.amount);
  const creditors = balances
    .filter((balance) => cents(balance.net) > 0)
    .map((balance) => ({ user_id: balance.user_id, amount: cents(balance.net) }))
    .sort((a, b) => b.amount - a.amount);

  const suggestions: SettlementSuggestion[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = Math.min(debtor.amount, creditor.amount);

    if (amount > 0) {
      suggestions.push({
        from_user_id: debtor.user_id,
        to_user_id: creditor.user_id,
        amount: money(amount)
      });
    }

    debtor.amount -= amount;
    creditor.amount -= amount;

    if (debtor.amount === 0) debtorIndex += 1;
    if (creditor.amount === 0) creditorIndex += 1;
  }

  return suggestions;
}
