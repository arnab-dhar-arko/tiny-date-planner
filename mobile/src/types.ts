export type CurrencyCode = "USD" | "EUR" | "GBP" | "JPY" | "THB" | "VND";
export type SplitType = "equal" | "exact" | "percentage";

export type User = {
  id: string;
  name: string;
  email: string;
  currency_preference: CurrencyCode;
};

export type Trip = {
  id: string;
  owner_user_id: string;
  name: string;
  total_budget: number;
  start_date: string;
  end_date: string;
  base_currency: CurrencyCode;
  is_group: boolean;
  updated_at?: string;
};

export type TripMember = {
  trip_id: string;
  user_id: string;
  display_name: string;
  role: "owner" | "member";
  email?: string;
};

export type ServerExpense = Expense & {
  splits: ExpenseSplit[];
};

export type TripSnapshot = {
  trip: Trip;
  members: TripMember[];
  expenses: ServerExpense[];
  settlements: Settlement[];
};

export type Expense = {
  id: string;
  trip_id: string;
  paid_by_user_id: string;
  title: string;
  category: string;
  amount_base: number;
  amount_local: number;
  local_currency: CurrencyCode;
  exchange_rate: number;
  split_type: SplitType;
  created_at: string;
};

export type ExpenseSplit = {
  id: string;
  expense_id: string;
  user_id: string;
  amount_owed: number;
};

export type Settlement = {
  id: string;
  trip_id: string;
  from_user_id: string;
  to_user_id: string;
  amount: number;
  timestamp: string;
};

export type Balance = {
  user_id: string;
  paid: number;
  owed: number;
  sent: number;
  received: number;
  net: number;
};

export type SettlementSuggestion = {
  from_user_id: string;
  to_user_id: string;
  amount: number;
};
