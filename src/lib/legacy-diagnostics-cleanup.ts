export const LEGACY_DIAGNOSTICS_STORAGE_KEY = "tribuno_debug_diagnostics";

export function limparDiagnosticosLegados(storage?: Pick<Storage, "removeItem">): void {
  if (typeof window === "undefined" && !storage) return;

  try {
    (storage ?? window.localStorage).removeItem(LEGACY_DIAGNOSTICS_STORAGE_KEY);
  } catch {
    // A limpeza de dados legados nunca deve impedir o arranque da aplicação.
  }
}
