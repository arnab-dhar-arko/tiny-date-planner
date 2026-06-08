import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { colors } from "../theme";

export type TabKey = "entries" | "stats" | "splits" | "map" | "settings";

const tabs: Array<{ key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: "entries", label: "Entries", icon: "list" },
  { key: "stats", label: "Stats", icon: "pie-chart-outline" },
  { key: "splits", label: "Splits", icon: "people-outline" },
  { key: "map", label: "Map", icon: "map-outline" },
  { key: "settings", label: "Settings", icon: "settings-outline" }
];

export function BottomTabs({ active, onChange }: { active: TabKey; onChange: (tab: TabKey) => void }) {
  return (
    <View style={{ height: 74, flexDirection: "row", borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.surface, paddingTop: 8 }}>
      {tabs.map((tab) => {
        const selected = active === tab.key;
        return (
          <Pressable key={tab.key} onPress={() => onChange(tab.key)} style={{ flex: 1, alignItems: "center", gap: 4 }}>
            <Ionicons name={tab.icon} size={23} color={selected ? colors.pink : "#a9a6ae"} />
            <Text style={{ color: selected ? colors.pink : "#a9a6ae", fontSize: 11 }}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
