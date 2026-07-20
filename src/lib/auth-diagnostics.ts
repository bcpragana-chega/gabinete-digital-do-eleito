export type AuthDiagnosticEvent =
  | "GIS_SCRIPT_LOADED"
  | "GIS_SCRIPT_FAILED"
  | "GIS_BUTTON_INITIALIZED"
  | "GOOGLE_INTERACTION_INFERRED"
  | "GOOGLE_CALLBACK_EXECUTED"
  | "GOOGLE_CALLBACK_NOT_EXECUTED"
  | "GOOGLE_CREDENTIAL_PRESENT"
  | "GOOGLE_CREDENTIAL_MISSING"
  | "SUPABASE_REQUEST_NOT_STARTED"
  | "SUPABASE_REQUEST_STARTED"
  | "SUPABASE_REQUEST_COMPLETED"
  | "SUPABASE_REQUEST_TIMEOUT"
  | "SUPABASE_ERROR_RETURNED"
  | "BROWSER_REQUEST_ERROR"
  | "UNEXPECTED_JAVASCRIPT_ERROR";

export type AuthDiagnosticPhase =
  | "loading_script"
  | "button_ready"
  | "waiting_google_callback"
  | "processing_google_callback"
  | "calling_supabase"
  | "completed";

type AuthDiagnosticDetails = {
  attemptId?: string;
  phase?: AuthDiagnosticPhase;
  reason?:
    | "credential_missing"
    | "callback_processing_failed"
    | "supabase_not_configured"
    | "callback_timeout"
    | "script_load_failed";
  browser?: "chrome" | "safari" | "firefox" | "edge" | "other";
  cookiesEnabled?: boolean;
  storageAvailable?: boolean;
  fedCmAvailable?: boolean;
  secureContext?: boolean;
  errorName?: string;
  supabaseStatus?: number;
  supabaseCode?: string;
};

let attemptSequence = 0;

export function createAuthAttemptId() {
  attemptSequence += 1;
  return `auth-${attemptSequence}`;
}

function browserFamily(userAgent: string): AuthDiagnosticDetails["browser"] {
  if (/Edg\//.test(userAgent)) return "edge";
  if (/Chrome\//.test(userAgent) || /CriOS\//.test(userAgent)) return "chrome";
  if (/Firefox\//.test(userAgent) || /FxiOS\//.test(userAgent)) return "firefox";
  if (/Safari\//.test(userAgent)) return "safari";
  return "other";
}

function storageAvailable() {
  try {
    const key = "__tribuno_auth_storage_probe__";
    window.localStorage.setItem(key, "1");
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function getSafeBrowserAuthContext(): AuthDiagnosticDetails {
  if (typeof window === "undefined" || typeof navigator === "undefined") return {};

  return {
    browser: browserFamily(navigator.userAgent),
    cookiesEnabled: navigator.cookieEnabled,
    storageAvailable: storageAvailable(),
    fedCmAvailable: "IdentityCredential" in window,
    secureContext: window.isSecureContext,
  };
}

/**
 * Regista apenas campos explicitamente permitidos pelo tipo acima. Nunca recebe
 * CredentialResponse, JWT, sessão, utilizador, email ou mensagens de erro brutas.
 */
export function logAuthDiagnostic(event: AuthDiagnosticEvent, details: AuthDiagnosticDetails = {}) {
  const level =
    event === "UNEXPECTED_JAVASCRIPT_ERROR" || event === "SUPABASE_ERROR_RETURNED"
      ? "error"
      : event.endsWith("FAILED") ||
          event.endsWith("TIMEOUT") ||
          event.endsWith("NOT_EXECUTED") ||
          event === "BROWSER_REQUEST_ERROR"
        ? "warn"
        : "info";

  const safeCode = (value: unknown) =>
    typeof value === "string" && /^[a-zA-Z0-9_-]{1,64}$/.test(value) ? value : undefined;
  const safeDetails: AuthDiagnosticDetails = {
    attemptId: safeCode(details.attemptId),
    phase: details.phase,
    reason: details.reason,
    browser: details.browser,
    cookiesEnabled: details.cookiesEnabled,
    storageAvailable: details.storageAvailable,
    fedCmAvailable: details.fedCmAvailable,
    secureContext: details.secureContext,
    errorName: safeCode(details.errorName),
    supabaseStatus: typeof details.supabaseStatus === "number" ? details.supabaseStatus : undefined,
    supabaseCode: safeCode(details.supabaseCode),
  };

  console[level](`[Tribuno Auth] ${event}`, safeDetails);
}
