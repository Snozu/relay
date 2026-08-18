/**
 * Bring-your-own-key settings.
 *
 * A prospect evaluating Relay can point it at their own account and spend their
 * own tokens. That is the difference between "watch me use it" and "try it".
 *
 * The key is held in this browser's localStorage and attached to each request
 * as a header. It is never sent to any server other than this app's own API
 * route, which forwards it only to the model provider it belongs to and then
 * discards it. It is never written to the database, never logged, and never
 * appears in the audit trail.
 *
 * localStorage is readable by any script running on this origin, which is fine
 * for a demo and is stated plainly in the panel. A production deployment would
 * hold provider credentials server-side per tenant instead.
 */
export type RelaySettings = {
  provider: "deepseek" | "anthropic" | "";
  apiKey: string;
  model: string;
};

const STORAGE_KEY = "relay.settings";

export const EMPTY_SETTINGS: RelaySettings = { provider: "", apiKey: "", model: "" };

export function loadSettings(): RelaySettings {
  if (typeof window === "undefined") return EMPTY_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_SETTINGS;
    return { ...EMPTY_SETTINGS, ...(JSON.parse(raw) as Partial<RelaySettings>) };
  } catch {
    return EMPTY_SETTINGS;
  }
}

export function saveSettings(settings: RelaySettings) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function clearSettings() {
  window.localStorage.removeItem(STORAGE_KEY);
}

/** Headers for one request. Empty when the server's own credentials are in use. */
export function settingsHeaders(): Record<string, string> {
  const s = loadSettings();
  if (!s.apiKey) return {};
  return {
    "x-relay-key": s.apiKey,
    ...(s.provider ? { "x-relay-provider": s.provider } : {}),
    ...(s.model ? { "x-relay-model": s.model } : {}),
  };
}

/** Never render a key in full. */
export function maskKey(key: string) {
  if (key.length <= 10) return "•".repeat(key.length);
  return `${key.slice(0, 6)}${"•".repeat(12)}${key.slice(-4)}`;
}
