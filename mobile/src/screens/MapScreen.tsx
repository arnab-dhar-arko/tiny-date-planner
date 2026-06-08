import { Text, View } from "react-native";
import { colors } from "../theme";

export function MapScreen() {
  return (
    <View style={{ flex: 1, padding: 24, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: "900" }}>Trip map</Text>
      <Text style={{ color: colors.muted, textAlign: "center", marginTop: 8 }}>Map pins can be attached to expenses in the next release.</Text>
    </View>
  );
}
