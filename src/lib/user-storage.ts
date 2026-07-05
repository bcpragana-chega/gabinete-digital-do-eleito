import { obterAuthState } from "@/lib/auth-store";
import { readJSON, userScopedKey, writeJSON } from "@/lib/storage-provider";

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
  return userScopedKey(baseKey, userId);
}

export function lerJSONPorUtilizador<T>(baseKey: string, fallback: T): T {
  const key = chavePorUtilizador(baseKey);
  if (!key) return fallback;

  return readJSON<T>(key, fallback);
}

export function guardarJSONPorUtilizador<T>(baseKey: string, value: T) {
  const key = chavePorUtilizador(baseKey);
  if (!key) return;

  writeJSON(key, value);
}

export function chavePerfilPorUtilizador(userId: string) {
  return `tribuno:perfil:${normalizarUserId(userId)}`;
}
