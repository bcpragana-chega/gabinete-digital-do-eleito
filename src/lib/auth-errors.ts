export type LoginErroCodigo =
  | "ERRO_LOGIN_GOOGLE_CALLBACK"
  | "ERRO_LOGIN_GOOGLE_CREDENTIAL"
  | "ERRO_LOGIN_BROWSER"
  | "ERRO_LOGIN_SUPABASE_NAO_INICIADO"
  | "ERRO_LOGIN_SUPABASE_TIMEOUT"
  | "ERRO_LOGIN_SUPABASE"
  | "ERRO_LOGIN_PERFIL"
  | "ERRO_LOGIN_NAVEGACAO"
  | "ERRO_LOGIN_DESCONHECIDO";

export type SupabaseAuthFailureReason =
  | "audience_mismatch"
  | "issuer_mismatch"
  | "token_rejected"
  | "provider_disabled"
  | "signup_disabled"
  | "rate_limited"
  | "server_error"
  | "unknown";

export function classificarErroSupabaseAuth(error: {
  message?: string;
  status?: number;
  code?: string;
}): SupabaseAuthFailureReason {
  const code = error.code?.toLocaleLowerCase("en") ?? "";
  const message = error.message?.toLocaleLowerCase("en") ?? "";
  const searchable = `${code} ${message}`;

  if (/audien|client.?id/.test(searchable)) return "audience_mismatch";
  if (/issuer|\biss\b/.test(searchable)) return "issuer_mismatch";
  if (/provider.*(?:disabled|not enabled)|unsupported.*provider/.test(searchable)) {
    return "provider_disabled";
  }
  if (/signup.*disabled|signups.*not allowed/.test(searchable)) return "signup_disabled";
  if (error.status === 429 || /rate.?limit|too many requests/.test(searchable)) {
    return "rate_limited";
  }
  if (/id.?token|jwt|signature|token.*(?:invalid|expired|malformed)|bad_jwt/.test(searchable)) {
    return "token_rejected";
  }
  if (typeof error.status === "number" && error.status >= 500) return "server_error";
  return "unknown";
}

class SafeAuthFlowError extends Error {
  cause: unknown;

  constructor(name: string, message: string, cause?: unknown) {
    super(message);
    this.name = name;
    this.cause = cause;
  }
}

export class GoogleCredentialError extends SafeAuthFlowError {
  constructor(cause?: unknown) {
    super("GoogleCredentialError", "GOOGLE_CREDENTIAL_INVALID", cause);
  }
}

export class SupabaseAuthTimeoutError extends SafeAuthFlowError {
  etapa: string;

  constructor(etapa: string, cause?: unknown) {
    super("SupabaseAuthTimeoutError", `TIMEOUT_SUPABASE_${etapa}`, cause);
    this.etapa = etapa;
  }
}

export class SupabaseAuthReturnedError extends SafeAuthFlowError {
  status?: number;
  code?: string;
  reason: SupabaseAuthFailureReason;

  constructor(error: { name?: string; message?: string; status?: number; code?: string }) {
    super(error.name || "SupabaseAuthReturnedError", "SUPABASE_AUTH_ERROR_RETURNED", error);
    this.status = error.status;
    this.code = error.code;
    this.reason = classificarErroSupabaseAuth(error);
  }
}

export class SupabaseAuthRequestError extends SafeAuthFlowError {
  constructor(error: unknown) {
    super("SupabaseAuthRequestError", "SUPABASE_AUTH_REQUEST_FAILED", error);
  }
}

export class SupabaseAuthNotStartedError extends SafeAuthFlowError {
  constructor() {
    super("SupabaseAuthNotStartedError", "SUPABASE_AUTH_REQUEST_NOT_STARTED");
  }
}

export class ProfileAfterAuthError extends SafeAuthFlowError {
  reason: "load_failed" | "invalid";

  constructor(reason: "load_failed" | "invalid", cause?: unknown) {
    super("ProfileAfterAuthError", `PROFILE_AFTER_AUTH_${reason.toUpperCase()}`, cause);
    this.reason = reason;
  }
}

export class NavigationAfterAuthError extends SafeAuthFlowError {
  constructor(cause?: unknown) {
    super("NavigationAfterAuthError", "NAVIGATION_AFTER_AUTH_FAILED", cause);
  }
}

export class LocalAuthStateError extends SafeAuthFlowError {
  constructor(cause?: unknown) {
    super("LocalAuthStateError", "LOCAL_AUTH_STATE_WRITE_FAILED", cause);
  }
}

export async function executarNavegacaoAposAuthConfirmada(navegar: () => Promise<unknown>) {
  try {
    await navegar();
  } catch (error) {
    throw new NavigationAfterAuthError(error);
  }
}

export function codigoLoginDoErro(error: unknown): LoginErroCodigo {
  if (error instanceof GoogleCredentialError) return "ERRO_LOGIN_GOOGLE_CREDENTIAL";
  if (error instanceof SupabaseAuthNotStartedError) return "ERRO_LOGIN_SUPABASE_NAO_INICIADO";
  if (error instanceof SupabaseAuthTimeoutError) return "ERRO_LOGIN_SUPABASE_TIMEOUT";
  if (error instanceof SupabaseAuthReturnedError) return "ERRO_LOGIN_SUPABASE";
  if (error instanceof SupabaseAuthRequestError || error instanceof LocalAuthStateError) {
    return "ERRO_LOGIN_BROWSER";
  }
  if (error instanceof ProfileAfterAuthError) return "ERRO_LOGIN_PERFIL";
  if (error instanceof NavigationAfterAuthError) return "ERRO_LOGIN_NAVEGACAO";
  return "ERRO_LOGIN_DESCONHECIDO";
}
