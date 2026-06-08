import { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { colors } from "../theme";

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login, signup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function submit(mode: "login" | "signup") {
    try {
      if (mode === "login") await login(email, password);
      else await signup(name, email, password);
    } catch (error) {
      Alert.alert("Auth failed", error instanceof Error ? error.message : "Please try again.");
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + 40, padding: 24, justifyContent: "center", gap: 14 }}>
      <Text style={{ color: colors.text, fontSize: 34, fontWeight: "900" }}>Roam Budget</Text>
      <Text style={{ color: colors.muted, fontSize: 16, marginBottom: 16 }}>Travel budget tracking with local-first group splitting.</Text>
      <TextInput value={name} onChangeText={setName} placeholder="Name" style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16 }} />
      <TextInput value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16 }} />
      <TextInput value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16 }} />
      <Pressable onPress={() => submit("login")} style={{ backgroundColor: colors.pink, borderRadius: 16, padding: 16, alignItems: "center" }}>
        <Text style={{ color: "#fff", fontWeight: "900" }}>Log in</Text>
      </Pressable>
      <Pressable onPress={() => submit("signup")} style={{ padding: 14, alignItems: "center" }}>
        <Text style={{ color: colors.pink, fontWeight: "800" }}>Create account</Text>
      </Pressable>
    </View>
  );
}
