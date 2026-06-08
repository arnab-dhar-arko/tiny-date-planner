import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useApp } from "../context/AppContext";
import { colors } from "../theme";
import { money } from "../utils/money";
import { calculateBalances, simplifyDebts } from "../utils/splits";

export function SplitsScreen() {
  const { currentTrip, members, expenses, splits, settlements, settle } = useApp();
  if (!currentTrip) return null;

  const balances = calculateBalances(members, expenses, splits, settlements);
  const suggestions = simplifyDebts(balances);
  const name = (userId: string) => members.find((member) => member.user_id === userId)?.display_name ?? "Someone";

  return (
    <ScrollView contentContainerStyle={{ padding: 18, gap: 12, paddingBottom: 110 }}>
      <Text style={{ color: colors.text, fontSize: 25, fontWeight: "900" }}>Group balances</Text>
      <Text style={{ color: colors.muted }}>Debt simplification finds the smallest clean set of final payments.</Text>
      {balances.map((balance) => (
        <View key={balance.user_id} style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 15, flexDirection: "row", justifyContent: "space-between" }}>
          <View>
            <Text style={{ color: colors.text, fontWeight: "900", fontSize: 16 }}>{name(balance.user_id)}</Text>
            <Text style={{ color: colors.muted }}>paid {money(balance.paid, currentTrip.base_currency)} · owes {money(balance.owed, currentTrip.base_currency)}</Text>
          </View>
          <Text style={{ color: balance.net >= 0 ? colors.green : colors.red, fontWeight: "900" }}>{money(Math.abs(balance.net), currentTrip.base_currency)}</Text>
        </View>
      ))}
      <Text style={{ color: colors.text, fontSize: 19, fontWeight: "900", marginTop: 12 }}>Settle in fewer moves</Text>
      {suggestions.length === 0 ? <Text style={{ color: colors.muted }}>Everyone is settled up.</Text> : suggestions.map((suggestion) => (
        <View key={`${suggestion.from_user_id}-${suggestion.to_user_id}`} style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 15, gap: 12 }}>
          <Text style={{ color: colors.text, fontWeight: "800" }}>{name(suggestion.from_user_id)} pays {name(suggestion.to_user_id)} {money(suggestion.amount, currentTrip.base_currency)}</Text>
          <Pressable
            onPress={() => Alert.alert("Settle up", "Record this repayment locally and sync it later?", [
              { text: "Cancel" },
              { text: "Record", onPress: () => settle(suggestion.from_user_id, suggestion.to_user_id, suggestion.amount) }
            ])}
            style={{ backgroundColor: colors.pink, borderRadius: 12, padding: 12, alignItems: "center" }}
          >
            <Text style={{ color: "#fff", fontWeight: "900" }}>Settle Up</Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}
