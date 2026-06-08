import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { api, clearToken, getToken, saveToken } from "../api/client";
import type { User } from "../types";
import * as SecureStore from "expo-secure-store";

type AuthContextValue = {
  token: string | null;
  user: User | null;
  login(email: string, password: string): Promise<void>;
  signup(name: string, email: string, password: string): Promise<void>;
  logout(): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const USER_KEY = "roam_budget_user";

async function saveUser(user: User) {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

async function getSavedUser() {
  const value = await SecureStore.getItemAsync(USER_KEY);
  return value ? JSON.parse(value) as User : null;
}

async function clearUser() {
  await SecureStore.deleteItemAsync(USER_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    Promise.all([getToken(), getSavedUser()]).then(([nextToken, nextUser]) => {
      setToken(nextToken);
      setUser(nextUser);
    });
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    token,
    user,
    async login(email, password) {
      const result = await api<{ token: string; user: User }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      await saveToken(result.token);
      await saveUser(result.user);
      setToken(result.token);
      setUser(result.user);
    },
    async signup(name, email, password) {
      const result = await api<{ token: string; user: User }>("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ name, email, password, currency_preference: "USD" })
      });
      await saveToken(result.token);
      await saveUser(result.user);
      setToken(result.token);
      setUser(result.user);
    },
    async logout() {
      await clearToken();
      await clearUser();
      setToken(null);
      setUser(null);
    }
  }), [token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
