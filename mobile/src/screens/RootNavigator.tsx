import { useState } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomTabs, TabKey } from "../components/BottomTabs";
import { colors } from "../theme";
import { EntriesScreen } from "./EntriesScreen";
import { MapScreen } from "./MapScreen";
import { SettingsScreen } from "./SettingsScreen";
import { SplitsScreen } from "./SplitsScreen";
import { StatsScreen } from "./StatsScreen";

export function RootNavigator() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TabKey>("entries");
  const Screen = tab === "entries" ? EntriesScreen : tab === "stats" ? StatsScreen : tab === "splits" ? SplitsScreen : tab === "map" ? MapScreen : SettingsScreen;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View style={{ height: 42, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: colors.text, fontSize: 12, fontWeight: "900", letterSpacing: 1.5 }}>ROAM BUDGET</Text>
      </View>
      <Screen />
      <BottomTabs active={tab} onChange={setTab} />
    </View>
  );
}
