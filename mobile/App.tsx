import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProvider } from "./src/context/AppContext";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { LoginScreen } from "./src/screens/LoginScreen";
import { RootNavigator } from "./src/screens/RootNavigator";

function Shell() {
  const { token } = useAuth();
  return token ? <RootNavigator /> : <LoginScreen />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppProvider>
          <StatusBar style="dark" />
          <Shell />
        </AppProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
