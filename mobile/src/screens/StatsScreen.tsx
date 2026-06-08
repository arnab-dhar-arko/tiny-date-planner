import { ScrollView, Text, View } from "react-native";
import { DonutChart } from "../components/DonutChart";
import { useApp } from "../context/AppContext";
import { colors } from "../theme";
import { money } from "../utils/money";

export function StatsScreen() {
  const { currentTrip, expenses } = useApp();
  const categoryMap = new Map<string, number>();
  for (const expense of expenses) categoryMap.set(expense.category, (categoryMap.get(expense.category) ?? 0) + expense.amount_base);
  const data = Array.from(categoryMap, ([label, value]) => ({ label, value }));

  if (!currentTrip) return null;

  return (
    <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 110 }}>
      <Text style={{ color: colors.text, fontSize: 25, fontWeight: "900" }}>Budget analytics</Text>
      <Text style={{ color: colors.muted, marginTop: 4 }}>Base vs local currencies stay linked by exchange rate.</Text>
      <DonutChart data={data.length ? data : [{ label: "No spend", value: 1 }]} />
      {data.map((item) => (
        <View key={item.label} style={{ flexDirection: "row", justifyContent: "space-between", backgroundColor: colors.surface, padding: 14, borderRadius: 14, marginTop: 10 }}>
          <Text style={{ color: colors.text, fontWeight: "800" }}>{item.label}</Text>
          <Text style={{ color: colors.muted }}>{money(item.value, currentTrip.base_currency)}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
