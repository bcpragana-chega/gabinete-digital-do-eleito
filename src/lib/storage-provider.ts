type JsonValue = unknown;

export type StorageProviderName = "local" | "supabase" | "firestore";

type StorageStatus = {
  provider: StorageProviderName;
  isRemote: boolean;
  isConfigured: boolean;
  message: string;
};

function isBrowser() {
  return typeof window !== "undefined";
}

function normalizarUserId(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("pt-PT")
    .replace(/[^a-z0-9@._-]/gi, "_");
}

function providerConfigurado(): StorageProviderName {
  const provider = import.meta.env.VITE_TRIBUNO_STORAGE_PROVIDER;

  if (provider === "supabase" || provider === "firestore") return provider;
  if (hasSupabaseConfig()) return "supabase";
  if (hasFirestoreConfig()) return "firestore";
  return "local";
}

function hasSupabaseConfig() {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

function hasFirestoreConfig() {
  return Boolean(
    import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID &&
    import.meta.env.VITE_FIREBASE_APP_ID,
  );
}

export function obterStorageStatus(): StorageStatus {
  const provider = providerConfigurado();

  if (provider === "supabase") {
    const isConfigured = hasSupabaseConfig();
    return {
      provider,
      isRemote: isConfigured,
      isConfigured,
      message: isConfigured
        ? "Persistência remota Supabase configurada."
        : "Supabase escolhido, mas ainda sem VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY.",
    };
  }

  if (provider === "firestore") {
    const isConfigured = hasFirestoreConfig();
    return {
      provider,
      isRemote: isConfigured,
      isConfigured,
      message: isConfigured
        ? "Persistência remota Firestore configurada."
        : "Firestore escolhido, mas ainda sem configuração Firebase completa.",
    };
  }

  return {
    provider: "local",
    isRemote: false,
    isConfigured: true,
    message: "Os dados estão guardados apenas neste dispositivo.",
  };
}

export function usarPersistenciaLocal() {
  return !obterStorageStatus().isRemote;
}

export function userScopedKey(baseKey: string, userId?: string) {
  if (!userId) return undefined;
  return `${baseKey}:${normalizarUserId(userId)}`;
}

export function readJSON<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON<T extends JsonValue>(key: string, value: T) {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function removeItem(key: string) {
  if (!isBrowser()) return;
  window.localStorage.removeItem(key);
}
