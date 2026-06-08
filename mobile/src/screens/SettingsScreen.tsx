import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { useState } from "react";
import { API_BASE_URL, checkApiHealth } from "../api/client";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme";

export function SettingsScreen() {
  const { logout } = useAuth();
  const { currentTrip, members, inviteFriend, refreshFromCloud, resetLocalQueue } = useApp();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [cloudStatus, setCloudStatus] = useState("Not checked yet");

  async function run(action: () => Promise<void>, success: string) {
    try {
      setBusy(true);
      await action();
      Alert.alert("Done", success);
      setEmail("");
    } catch (error) {
      Alert.alert("Could not complete", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function checkCloud() {
    try {
      setBusy(true);
      const result = await checkApiHealth();
      setCloudStatus(result.ok ? "Connected to Roam Budget cloud" : "Cloud replied, but health check was not OK");
    } catch (error) {
      setCloudStatus(error instanceof Error ? error.message : "Could not reach cloud");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: "center", gap: 14 }}>
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: "900" }}>Settings</Text>
      <Text style={{ color: colors.muted }}>JWT auth, SQLite offline cache, and cloud sync are configured.</Text>
      <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16, gap: 8 }}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "900" }}>Cloud connection</Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>{API_BASE_URL}</Text>
        <Text style={{ color: colors.muted }}>{cloudStatus}</Text>
        <Pressable disabled={busy} onPress={checkCloud} style={{ backgroundColor: colors.surfaceAlt, borderRadius: 12, padding: 13, alignItems: "center" }}>
          <Text style={{ color: colors.text, fontWeight: "900" }}>Test cloud connection</Text>
        </Pressable>
      </View>
      {currentTrip && (
        <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16, gap: 10 }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "900" }}>Share trip</Text>
          <Text style={{ color: colors.muted }}>Your friend must create an account first. Then add their email here.</Text>
          <TextInput value={email} onChangeText={setEmail} placeholder="friend@email.com" autoCapitalize="none" keyboardType="email-address" style={{ backgroundColor: colors.surfaceAlt, borderRadius: 12, padding: 12 }} />
          <Pressable disabled={busy || !email.trim()} onPress={() => run(() => inviteFriend(email.trim()), "Friend added to this trip. Ask them to tap Refresh from cloud.")} style={{ backgroundColor: colors.pink, opacity: busy || !email.trim() ? 0.55 : 1, borderRadius: 12, padding: 13, alignItems: "center" }}>
            <Text style={{ color: "#fff", fontWeight: "900" }}>Add friend by email</Text>
          </Pressable>
          <Text style={{ color: colors.text, fontWeight: "800", marginTop: 4 }}>Members</Text>
          {members.map((member) => (
            <Text key={member.user_id} style={{ color: colors.muted }}>{member.display_name}{member.email ? ` · ${member.email}` : ""} · {member.role}</Text>
          ))}
        </View>
      )}
      <Pressable disabled={busy} onPress={() => run(refreshFromCloud, "Latest trips, members, expenses, and settlements downloaded.")} style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 14, alignItems: "center" }}>
        <Text style={{ color: colors.text, fontWeight: "900" }}>Refresh from cloud</Text>
      </Pressable>
      <Pressable disabled={busy} onPress={() => run(resetLocalQueue, "Stuck local sync queue cleared. Cloud data refreshed.")} style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 14, alignItems: "center" }}>
        <Text style={{ color: colors.text, fontWeight: "900" }}>Clear stuck sync queue</Text>
      </Pressable>
      <Pressable onPress={logout} style={{ marginTop: 24, backgroundColor: colors.text, borderRadius: 16, padding: 14, alignItems: "center" }}>
        <Text style={{ color: "#fff", fontWeight: "900" }}>Log out</Text>
      </Pressable>
    </View>
  );
}
