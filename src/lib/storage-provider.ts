type JsonValue = unknown;

export type StorageProviderName = "local" | "supabase" | "firestore" | "unconfigured";

export type StorageStatus = {
  provider: StorageProviderName;
  isRemote: boolean;
  isConfigured: boolean;
  localAllowed: boolean;
  message: string;
  technicalDetail?: string;
};

export type StorageResolutionInput = {
  mode: string;
  configuredProvider?: string;
  hasSupabaseConfig: boolean;
  hasFirestoreConfig: boolean;
};

const STORAGE_UNAVAILABLE_MESSAGE =
  "O Tribuno não conseguiu ligar ao serviço de armazenamento. Por segurança, os seus dados não serão guardados apenas neste dispositivo.";

function isBrowser() {
  return typeof window !== "undefined";
}

function normalizarUserId(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("pt-PT")
    .replace(/[^a-z0-9@._-]/gi, "_");
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

export function resolverStorageStatus(input: StorageResolutionInput): StorageStatus {
  const providerExplicito = input.configuredProvider?.trim();
  const producao = input.mode === "production";

  if (
    providerExplicito &&
    providerExplicito !== "local" &&
    providerExplicito !== "supabase" &&
    providerExplicito !== "firestore"
  ) {
    return {
      provider: "unconfigured",
      isRemote: false,
      isConfigured: false,
      localAllowed: false,
      message: STORAGE_UNAVAILABLE_MESSAGE,
      technicalDetail: `VITE_TRIBUNO_STORAGE_PROVIDER tem um valor inválido: ${providerExplicito}.`,
    };
  }

  const provider =
    (providerExplicito as Exclude<StorageProviderName, "unconfigured"> | undefined) ??
    (input.hasSupabaseConfig ? "supabase" : producao ? "unconfigured" : "local");

  if (provider === "supabase") {
    const isConfigured = input.hasSupabaseConfig;
    return {
      provider,
      isRemote: isConfigured,
      isConfigured,
      localAllowed: false,
      message: isConfigured
        ? "Persistência remota Supabase configurada."
        : STORAGE_UNAVAILABLE_MESSAGE,
      technicalDetail: isConfigured
        ? undefined
        : "Supabase foi selecionado, mas VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não estão completas.",
    };
  }

  if (provider === "firestore") {
    return {
      provider,
      isRemote: false,
      isConfigured: false,
      localAllowed: false,
      message: STORAGE_UNAVAILABLE_MESSAGE,
      technicalDetail: input.hasFirestoreConfig
        ? "O provider Firestore não está disponível nesta versão Beta."
        : "Firestore foi selecionado, mas a configuração Firebase está incompleta.",
    };
  }

  if (provider === "unconfigured" || producao) {
    return {
      provider: provider === "local" ? "local" : "unconfigured",
      isRemote: false,
      isConfigured: false,
      localAllowed: false,
      message: STORAGE_UNAVAILABLE_MESSAGE,
      technicalDetail:
        provider === "local"
          ? "O provider local não é permitido em produção."
          : "Nenhum provider remoto válido foi configurado para produção.",
    };
  }

  return {
    provider: "local",
    isRemote: false,
    isConfigured: true,
    localAllowed: true,
    message: "Os dados estão guardados apenas neste dispositivo.",
  };
}

export function obterStorageStatus(): StorageStatus {
  return resolverStorageStatus({
    mode: import.meta.env.MODE,
    configuredProvider: import.meta.env.VITE_TRIBUNO_STORAGE_PROVIDER,
    hasSupabaseConfig: hasSupabaseConfig(),
    hasFirestoreConfig: hasFirestoreConfig(),
  });
}

export function usarPersistenciaLocal() {
  const status = obterStorageStatus();
  return status.provider === "local" && status.localAllowed && status.isConfigured;
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

export class StorageConfigurationError extends Error {
  readonly code = "INSTITUTIONAL_STORAGE_UNAVAILABLE";

  constructor(readonly status: StorageStatus) {
    super(status.message);
    this.name = "StorageConfigurationError";
  }
}

export function writeInstitutionalJSON<T extends JsonValue>(
  key: string,
  value: T,
  status = obterStorageStatus(),
) {
  if (!isBrowser()) return;
  if (!status.isConfigured) throw new StorageConfigurationError(status);
  writeJSON(key, value);
}

export function removeItem(key: string) {
  if (!isBrowser()) return;
  window.localStorage.removeItem(key);
}

export function removeInstitutionalItem(key: string, status = obterStorageStatus()) {
  if (!isBrowser()) return;
  if (!status.isConfigured) throw new StorageConfigurationError(status);
  removeItem(key);
}
