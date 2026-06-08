import { Text, View } from "react-native";
import { colors } from "../theme";
import { money } from "../utils/money";
import type { CurrencyCode } from "../types";

export function KpiCard({ label, value, target, currency }: { label: string; value: number; target: number; currency: CurrencyCode }) {
  const progress = target > 0 ? Math.min(value / target, 1) : 0;
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: 12 }}>
      <Text style={{ color: colors.muted, fontSize: 11, textTransform: "uppercase" }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: "800", marginTop: 8 }}>
        {money(value, currency)}
        <Text style={{ fontSize: 16, fontWeight: "500" }}>/{money(target, currency).replace(/^[^\d-]+/, "")}</Text>
      </Text>
      <View style={{ height: 8, borderRadius: 99, backgroundColor: colors.pinkSoft, overflow: "hidden", marginTop: 12 }}>
        <View style={{ width: `${progress * 100}%`, height: 8, backgroundColor: colors.pink }} />
      </View>
    </View>
  );
}
