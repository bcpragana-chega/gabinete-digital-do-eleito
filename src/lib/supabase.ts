import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { logAuthDiagnostic } from "@/lib/auth-diagnostics";

let client: SupabaseClient | undefined;
const SUPABASE_TIMEOUT_MS = 12000;

export class SupabaseAuthTimeoutError extends Error {
  constructor(etapa: string) {
    super(`TIMEOUT_SUPABASE_${etapa}`);
    this.name = "SupabaseAuthTimeoutError";
  }
}

export class SupabaseAuthReturnedError extends Error {
  status?: number;
  code?: string;
  cause: unknown;

  constructor(error: { name?: string; status?: number; code?: string }) {
    super("SUPABASE_AUTH_ERROR_RETURNED");
    this.name = error.name || "SupabaseAuthReturnedError";
    this.status = error.status;
    this.code = error.code;
    this.cause = error;
  }
}

export class SupabaseAuthRequestError extends Error {
  cause: unknown;

  constructor(error: unknown) {
    super("SUPABASE_AUTH_REQUEST_FAILED");
    this.name = "SupabaseAuthRequestError";
    this.cause = error;
  }
}

export class SupabaseAuthNotStartedError extends Error {
  constructor() {
    super("SUPABASE_AUTH_REQUEST_NOT_STARTED");
    this.name = "SupabaseAuthNotStartedError";
  }
}

export function withSupabaseTimeout<T>(
  promise: PromiseLike<T>,
  etapa: string,
  timeoutMs = SUPABASE_TIMEOUT_MS,
): Promise<T> {
  let timeoutId: ReturnType<typeof globalThis.setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = globalThis.setTimeout(() => {
      reject(new SupabaseAuthTimeoutError(etapa));
    }, timeoutMs);
  });

  return Promise.race<T>([Promise.resolve(promise), timeout]).finally(() => {
    if (timeoutId !== undefined) globalThis.clearTimeout(timeoutId);
  });
}

export function isSupabaseConfigured() {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) return undefined;

  if (!client) {
    client = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      },
    );
  }

  return client;
}

export async function iniciarSessaoSupabaseComGoogleCredential(
  credential: string,
  attemptId?: string,
): Promise<User | undefined> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    logAuthDiagnostic("SUPABASE_REQUEST_NOT_STARTED", {
      attemptId,
      reason: "supabase_not_configured",
    });
    throw new SupabaseAuthNotStartedError();
  }

  logAuthDiagnostic("SUPABASE_REQUEST_STARTED", { attemptId, phase: "calling_supabase" });

  try {
    const { data, error } = await withSupabaseTimeout(
      supabase.auth.signInWithIdToken({
        provider: "google",
        token: credential,
      }),
      "SIGN_IN_WITH_ID_TOKEN",
    );

    if (error) {
      const returnedError = new SupabaseAuthReturnedError(error);
      logAuthDiagnostic("SUPABASE_ERROR_RETURNED", {
        attemptId,
        phase: "calling_supabase",
        errorName: returnedError.name,
        supabaseStatus: returnedError.status,
        supabaseCode: returnedError.code,
      });
      throw returnedError;
    }

    logAuthDiagnostic("SUPABASE_REQUEST_COMPLETED", { attemptId, phase: "completed" });
    return data.user ?? undefined;
  } catch (error) {
    if (error instanceof SupabaseAuthReturnedError) throw error;
    if (error instanceof SupabaseAuthTimeoutError) {
      logAuthDiagnostic("SUPABASE_REQUEST_TIMEOUT", {
        attemptId,
        phase: "calling_supabase",
      });
      throw error;
    }

    const requestError = new SupabaseAuthRequestError(error);
    logAuthDiagnostic("BROWSER_REQUEST_ERROR", {
      attemptId,
      phase: "calling_supabase",
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    throw requestError;
  }
}

export async function diagnosticarSessaoSupabase() {
  const supabaseConfigurado = isSupabaseConfigured();
  const supabase = getSupabaseClient();

  if (!supabaseConfigurado || !supabase) {
    return {
      supabaseConfigurado,
      existeSessaoSupabase: false,
      supabaseUserId: undefined,
      erroSessaoSupabase: undefined,
    };
  }

  try {
    const { data, error } = await withSupabaseTimeout(
      supabase.auth.getSession(),
      "GET_SESSION",
      8000,
    );

    return {
      supabaseConfigurado,
      existeSessaoSupabase: Boolean(data.session?.user?.id),
      supabaseUserId: data.session?.user?.id,
      erroSessaoSupabase: error?.message,
    };
  } catch (error) {
    return {
      supabaseConfigurado,
      existeSessaoSupabase: false,
      supabaseUserId: undefined,
      erroSessaoSupabase: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

export async function obterUtilizadorSupabaseValidado(): Promise<User | undefined> {
  const supabase = getSupabaseClient();
  if (!supabase) return undefined;

  const { data, error } = await withSupabaseTimeout(supabase.auth.getUser(), "AUTH_GET_USER", 8000);
  if (error || !data.user?.id) return undefined;
  return data.user;
}

export async function registarUltimoAcesso(userId: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from("profiles")
      .update({ last_login_at: new Date().toISOString() })
      .eq("user_id", userId);

    if (error) throw error;
  } catch {
    console.warn("[Tribuno Auth] Não foi possível registar o último acesso.", {
      operacao: "AUTH_LAST_LOGIN_UPDATE_FALHOU",
    });
  }
}

export async function terminarSessaoSupabaseComDependencias(input: {
  terminarGlobal: () => Promise<{ error: unknown }>;
  terminarLocal: () => Promise<{ error: unknown }>;
}) {
  let erroGlobal: unknown;
  try {
    const { error } = await input.terminarGlobal();
    erroGlobal = error;
  } catch (error) {
    erroGlobal = error;
  }
  if (!erroGlobal) return;

  console.warn("[Tribuno Auth] Revogação global indisponível; a terminar sessão local.", {
    operacao: "AUTH_LOGOUT_GLOBAL_FALHOU",
  });
  try {
    const { error: localError } = await input.terminarLocal();
    if (!localError) return;
    throw localError;
  } catch (error) {
    console.warn("[Tribuno Auth] Não foi possível terminar a sessão Supabase.", {
      operacao: "AUTH_LOGOUT_SUPABASE_FALHOU",
    });
    throw error;
  }
}

export async function terminarSessaoSupabase() {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  return terminarSessaoSupabaseComDependencias({
    terminarGlobal: () => withSupabaseTimeout(supabase.auth.signOut(), "SIGN_OUT", 8000),
    terminarLocal: () =>
      withSupabaseTimeout(supabase.auth.signOut({ scope: "local" }), "SIGN_OUT_LOCAL", 8000),
  });
}
