import { Text, View } from "react-native";
import { CategoryIcon } from "./CategoryIcon";
import { colors, shadow } from "../theme";
import type { Expense, TripMember } from "../types";
import { money } from "../utils/money";

export function ExpenseCard({ expense, payer }: { expense: Expense; payer?: TripMember }) {
  return (
    <View style={[{ backgroundColor: colors.surface, borderRadius: 14, padding: 14, flexDirection: "row", gap: 14, alignItems: "center" }, shadow]}>
      <CategoryIcon category={expense.category} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>{expense.title}</Text>
        <Text style={{ color: colors.muted, fontSize: 13 }}>{expense.category} · paid by {payer?.display_name ?? "Unknown"}</Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: "700" }}>{money(expense.amount_base, "USD")}</Text>
        <Text style={{ color: colors.muted, fontSize: 13 }}>{money(expense.amount_local, expense.local_currency)}</Text>
      </View>
    </View>
  );
}
