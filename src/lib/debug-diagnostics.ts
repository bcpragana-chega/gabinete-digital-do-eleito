export const DEBUG_DIAGNOSTICS_STORAGE_KEY = "tribuno_debug_diagnostics";

export type DiagnosticEvent = {
  timestamp: string;
  area: string;
  message: string;
  data?: unknown;
};

function isBrowser() {
  return typeof window !== "undefined";
}

function readEvents(): DiagnosticEvent[] {
  if (!isBrowser()) return [];

  try {
    const raw = window.localStorage.getItem(DEBUG_DIAGNOSTICS_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is DiagnosticEvent => {
      if (!item || typeof item !== "object") return false;

      const event = item as Partial<DiagnosticEvent>;
      return (
        typeof event.timestamp === "string" &&
        typeof event.area === "string" &&
        typeof event.message === "string"
      );
    });
  } catch {
    return [];
  }
}

function writeEvents(events: DiagnosticEvent[]) {
  if (!isBrowser()) return;

  try {
    window.localStorage.setItem(DEBUG_DIAGNOSTICS_STORAGE_KEY, JSON.stringify(events));
  } catch {
    // No-op: diagnóstico temporário não deve quebrar a app
  }
}

export function addDiagnosticEvent(event: {
  area: string;
  message: string;
  data?: unknown;
  timestamp?: string;
}) {
  const current = readEvents();

  const next: DiagnosticEvent = {
    timestamp: event.timestamp ?? new Date().toISOString(),
    area: event.area,
    message: event.message,
    data: event.data,
  };

  const capped = [...current, next].slice(-500);
  writeEvents(capped);
}

export function getDiagnosticEvents() {
  return readEvents();
}

export function clearDiagnosticEvents() {
  if (!isBrowser()) return;

  try {
    window.localStorage.removeItem(DEBUG_DIAGNOSTICS_STORAGE_KEY);
  } catch {
    // No-op: diagnóstico temporário não deve quebrar a app
  }
}
