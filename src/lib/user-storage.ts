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

export function chaveParaUtilizador(baseKey: string, userId: string): string {
  return userScopedKey(baseKey, normalizarUserId(userId))!;
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

export function lerJSONParaUtilizador<T>(baseKey: string, userId: string, fallback: T): T {
  return readJSON<T>(chaveParaUtilizador(baseKey, userId), fallback);
}

export function guardarJSONParaUtilizador<T>(baseKey: string, userId: string, value: T) {
  writeJSON(chaveParaUtilizador(baseKey, userId), value);
}

export function chavePerfilPorUtilizador(userId: string) {
  return `tribuno:perfil:${normalizarUserId(userId)}`;
}
