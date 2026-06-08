import { Text, View } from "react-native";
import { colors } from "../theme";

const config: Record<string, { color: string; icon: string }> = {
  Drinks: { color: colors.purple, icon: "🍸" },
  Restaurants: { color: colors.teal, icon: "🍜" },
  Accommodation: { color: colors.red, icon: "🛏️" },
  Flights: { color: colors.blue, icon: "✈️" },
  Shopping: { color: colors.yellow, icon: "🛍️" }
};

export function CategoryIcon({ category, size = 48 }: { category: string; size?: number }) {
  const item = config[category] ?? { color: colors.green, icon: "💳" };
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: item.color, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: size * 0.42 }}>{item.icon}</Text>
    </View>
  );
}
