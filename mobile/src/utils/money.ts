import type { CurrencyCode } from "../types";

export function money(value: number, currency: CurrencyCode = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: value >= 1000 ? 0 : 2
  }).format(value);
}

export function shortDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(value));
}
