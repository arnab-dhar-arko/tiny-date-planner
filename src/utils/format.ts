import type { Expense } from "../types";

const symbols: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", JPY: "¥", VND: "₫", THB: "฿", AUD: "A$", CAD: "C$", INR: "₹", KRW: "₩",
};

export function money(value: number, currency = "USD", compact = false) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: compact && value >= 100 ? 0 : 2,
    notation: compact && value >= 100_000 ? "compact" : "standard",
  }).format(value);
}

export function currencySymbol(currency: string) {
  return symbols[currency] ?? currency;
}

export function localMoney(value: number, currency: string) {
  const fractionless = ["VND", "JPY", "KRW"].includes(currency);
  return `${currencySymbol(currency)}${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: fractionless ? 0 : 2,
  }).format(value)}`;
}

export function shortDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(date));
}

export function groupLabel(timestamp: string) {
  const date = new Date(timestamp);
  const now = new Date();
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diff = Math.round((today - day) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(date);
}

export function groupExpenses(expenses: Expense[]) {
  return expenses.reduce<Record<string, Expense[]>>((groups, expense) => {
    const label = groupLabel(expense.timestamp);
    (groups[label] ??= []).push(expense);
    return groups;
  }, {});
}

export function dateInputValue(date = new Date()) {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 10);
}

export function timeInputValue(date = new Date()) {
  return date.toTimeString().slice(0, 5);
}

export function expenseTimestamp(date: string, time: string) {
  return new Date(`${date}T${time || "12:00"}`).toISOString();
}

export function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}
