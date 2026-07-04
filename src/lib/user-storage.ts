import { obterAuthState } from "@/lib/auth-store";

function isBrowser() {
  return typeof window !== "undefined";
}

function normalizarUserId(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("pt-PT")
    .replace(/[^a-z0-9@._-]/gi, "_");
}

export function obterUserIdAtual(): string | undefined {
  const { user } = obterAuthState();
  const userId = user?.id || user?.email;
  return userId ? normalizarUserId(userId) : undefined;
}

export function chavePorUtilizador(baseKey: string): string | undefined {
  const userId = obterUserIdAtual();
  return userId ? `${baseKey}:${userId}` : undefined;
}

export function lerJSONPorUtilizador<T>(baseKey: string, fallback: T): T {
  if (!isBrowser()) return fallback;

  const key = chavePorUtilizador(baseKey);
  if (!key) return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function guardarJSONPorUtilizador<T>(baseKey: string, value: T) {
  if (!isBrowser()) return;

  const key = chavePorUtilizador(baseKey);
  if (!key) return;

  window.localStorage.setItem(key, JSON.stringify(value));
}

export function chavePerfilPorUtilizador(userId: string) {
  return `tribuno:perfil:${normalizarUserId(userId)}`;
}
