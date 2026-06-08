import type { Request } from "express";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  currency_preference: string;
};

export type AuthRequest = Request & {
  user?: AuthUser;
};

export type SettlementSuggestion = {
  from_user_id: string;
  to_user_id: string;
  amount: number;
};
