import * as SecureStore from "expo-secure-store";

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://roam-budget-api.onrender.com";
const TOKEN_KEY = "roam_budget_token";

export async function saveToken(token: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers
      }
    });
  } catch {
    throw new Error(`Cannot reach Roam Budget cloud at ${API_BASE_URL}. Check internet, then try again.`);
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const details = typeof body.details === "string" ? ` ${body.details}` : "";
    throw new Error(`${body.error ?? `Request failed (${response.status})`}${details}`);
  }
  return body as T;
}

export async function checkApiHealth() {
  const response = await fetch(`${API_BASE_URL}/health`);
  if (!response.ok) throw new Error(`Cloud returned ${response.status}`);
  return response.json() as Promise<{ ok: boolean; service: string }>;
}
