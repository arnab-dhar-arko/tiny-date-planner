import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useState } from "react";
import { ExpenseCard } from "../components/ExpenseCard";
import { KpiCard } from "../components/KpiCard";
import { useApp } from "../context/AppContext";
import { colors } from "../theme";
import { money } from "../utils/money";

export function EntriesScreen() {
  const { currentTrip, expenses, members, createTrip } = useApp();
  const [tripName, setTripName] = useState("");
  const total = expenses.reduce((sum, item) => sum + item.amount_base, 0);
  const daily = total / 9;

  if (!currentTrip) {
    return (
      <View style={{ flex: 1, padding: 24, justifyContent: "center", gap: 14 }}>
        <Text style={{ color: colors.text, fontSize: 30, fontWeight: "900" }}>Start clean</Text>
        <Text style={{ color: colors.muted, fontSize: 16 }}>No demo trips or sample expenses are loaded. Create your first real trip to begin.</Text>
        <TextInput value={tripName} onChangeText={setTripName} placeholder="Trip name" style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16 }} />
        <Pressable onPress={() => createTrip(tripName)} style={{ backgroundColor: colors.pink, borderRadius: 16, padding: 16, alignItems: "center" }}>
          <Text style={{ color: "#fff", fontWeight: "900" }}>Create trip</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 18, gap: 14, paddingBottom: 110 }}>
      <Text style={{ color: colors.text, fontSize: 19, fontWeight: "900", textAlign: "center" }}>{currentTrip.name}</Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <KpiCard label="Total" value={total} target={currentTrip.total_budget} currency={currentTrip.base_currency} />
        <KpiCard label="Daily Average" value={daily} target={75} currency={currentTrip.base_currency} />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
        <Text style={{ color: colors.muted }}>Today</Text>
        <Text style={{ color: colors.muted }}>{money(total, currentTrip.base_currency)}</Text>
      </View>
      <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16 }}>
        <Text style={{ color: colors.text, fontWeight: "900" }}>No demo expenses</Text>
        <Text style={{ color: colors.muted, marginTop: 4 }}>Use the expense form flow from the full app to record real spending.</Text>
      </View>
      {expenses.map((expense) => (
        <ExpenseCard key={expense.id} expense={expense} payer={members.find((member) => member.user_id === expense.paid_by_user_id)} />
      ))}
    </ScrollView>
  );
}
