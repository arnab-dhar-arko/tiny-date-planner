export const categories = ["food", "drinks", "lodging", "transit", "entertainment", "shopping"] as const;
export type Category = (typeof categories)[number];
export type View = "entries" | "stats" | "search" | "map" | "settings";

export interface Trip {
  id: string;
  name: string;
  total_budget: number;
  daily_budget: number;
  start_date: string;
  end_date: string;
  home_currency: string;
  is_group?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  trip_id: string;
  title: string;
  category: Category;
  amount_home: number;
  amount_local: number;
  local_currency: string;
  exchange_rate: number;
  timestamp: string;
  notes?: string;
  location?: string;
  paid_by_participant_id?: string;
  split_type?: SplitType;
  created_at: string;
  updated_at: string;
}

export type SplitType = "equal" | "exact" | "percentage";

export interface Participant {
  id: string;
  trip_id: string;
  name: string;
  created_at: string;
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  participant_id: string;
  amount_owed: number;
}

export interface Transfer {
  id: string;
  trip_id: string;
  from_participant_id: string;
  to_participant_id: string;
  amount: number;
  timestamp: string;
}

export interface ExchangeRate {
  id: string;
  base_currency: string;
  target_currency: string;
  rate: number;
  date: string;
  source: "manual" | "mock";
  created_at: string;
}

export interface BackupData {
  version: 2;
  exported_at: string;
  trips: Trip[];
  expenses: Expense[];
  exchangeRates: ExchangeRate[];
  participants: Participant[];
  expenseSplits: ExpenseSplit[];
  transfers: Transfer[];
}

export interface Toast {
  id: string;
  message: string;
  tone?: "success" | "error";
}
