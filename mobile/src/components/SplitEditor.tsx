import { Pressable, Text, TextInput, View } from "react-native";
import { colors } from "../theme";
import type { SplitType, TripMember } from "../types";

export function SplitEditor({
  members,
  splitType,
  onSplitType,
  paidBy,
  onPaidBy
}: {
  members: TripMember[];
  splitType: SplitType;
  onSplitType: (type: SplitType) => void;
  paidBy: string;
  onPaidBy: (userId: string) => void;
}) {
  return (
    <View style={{ gap: 12 }}>
      <Text style={{ color: colors.text, fontWeight: "800" }}>Paid by</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {members.map((member) => (
          <Pressable key={member.user_id} onPress={() => onPaidBy(member.user_id)} style={{ paddingHorizontal: 12, paddingVertical: 9, borderRadius: 99, backgroundColor: paidBy === member.user_id ? colors.text : colors.surfaceAlt }}>
            <Text style={{ color: paidBy === member.user_id ? "#fff" : colors.text, fontWeight: "700" }}>{member.display_name}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={{ color: colors.text, fontWeight: "800" }}>Split type</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {(["equal", "exact", "percentage"] as SplitType[]).map((type) => (
          <Pressable key={type} onPress={() => onSplitType(type)} style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: splitType === type ? colors.pink : colors.surfaceAlt, alignItems: "center" }}>
            <Text style={{ color: splitType === type ? "#fff" : colors.text, fontWeight: "800", textTransform: "capitalize" }}>{type}</Text>
          </Pressable>
        ))}
      </View>
      {splitType !== "equal" && members.map((member) => (
        <View key={member.user_id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={{ flex: 1, color: colors.muted }}>{member.display_name}</Text>
          <TextInput placeholder={splitType === "percentage" ? "25%" : "$25"} keyboardType="decimal-pad" style={{ width: 110, borderRadius: 12, backgroundColor: colors.surfaceAlt, padding: 10, textAlign: "right" }} />
        </View>
      ))}
    </View>
  );
}
