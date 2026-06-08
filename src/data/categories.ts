import {
  BedDouble,
  Clapperboard,
  Martini,
  Plane,
  ShoppingBag,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import type { Category } from "../types";

export const categoryMeta: Record<Category, { label: string; shortLabel: string; color: string; Icon: LucideIcon }> = {
  food: { label: "Food & Restaurants", shortLabel: "Food", color: "#079d91", Icon: Utensils },
  drinks: { label: "Drinks", shortLabel: "Drinks", color: "#7540c8", Icon: Martini },
  lodging: { label: "Accommodation", shortLabel: "Lodging", color: "#e44739", Icon: BedDouble },
  transit: { label: "Transit & Flights", shortLabel: "Transit", color: "#4382eb", Icon: Plane },
  entertainment: { label: "Entertainment", shortLabel: "Fun", color: "#ffad00", Icon: Clapperboard },
  shopping: { label: "Shopping", shortLabel: "Shopping", color: "#16a867", Icon: ShoppingBag },
};

export const currencies = ["USD", "EUR", "GBP", "JPY", "VND", "THB", "AUD", "CAD", "INR", "KRW"];
