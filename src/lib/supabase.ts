import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { logAuthDiagnostic } from "@/lib/auth-diagnostics";
import {
  SupabaseAuthNotStartedError,
  SupabaseAuthRequestError,
  SupabaseAuthReturnedError,
  SupabaseAuthTimeoutError,
} from "@/lib/auth-errors";

export {
  SupabaseAuthNotStartedError,
  SupabaseAuthRequestError,
  SupabaseAuthReturnedError,
  SupabaseAuthTimeoutError,
} from "@/lib/auth-errors";

let client: SupabaseClient | undefined;
const SUPABASE_TIMEOUT_MS = 12000;

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

    if (!data.user?.id) {
      const missingUserError = new SupabaseAuthReturnedError({
        name: "AuthUserMissingError",
      });
      logAuthDiagnostic("SUPABASE_ERROR_RETURNED", {
        attemptId,
        phase: "calling_supabase",
        errorName: missingUserError.name,
      });
      throw missingUserError;
    }

    logAuthDiagnostic("SUPABASE_REQUEST_COMPLETED", { attemptId, phase: "completed" });
    return data.user;
  } catch (error) {
    if (error instanceof SupabaseAuthReturnedError) throw error;
    if (error instanceof SupabaseAuthTimeoutError) {
      logAuthDiagnostic("SUPABASE_REQUEST_TIMEOUT", {
        attemptId,
        phase: "calling_supabase",
      });
      logAuthDiagnostic("AUTH_SESSION_RECOVERY_STARTED", {
        attemptId,
        phase: "calling_supabase",
      });
      let recovered: Awaited<ReturnType<typeof supabase.auth.getUser>>;
      try {
        recovered = await withSupabaseTimeout(
          supabase.auth.getUser(),
          "AUTH_RECOVER_AFTER_SIGN_IN_TIMEOUT",
          8000,
        );
      } catch (recoveryFailure) {
        logAuthDiagnostic("AUTH_SESSION_RECOVERY_FAILED", {
          attemptId,
          phase: "calling_supabase",
        });
        if (recoveryFailure instanceof SupabaseAuthTimeoutError) throw error;
        throw new SupabaseAuthRequestError(recoveryFailure);
      }
      if (recovered.error) {
        const returnedError = new SupabaseAuthReturnedError(recovered.error);
        logAuthDiagnostic("SUPABASE_ERROR_RETURNED", {
          attemptId,
          phase: "calling_supabase",
          errorName: returnedError.name,
          supabaseStatus: returnedError.status,
          supabaseCode: returnedError.code,
        });
        throw returnedError;
      }
      if (!recovered.data.user?.id) {
        logAuthDiagnostic("AUTH_SESSION_RECOVERY_FAILED", {
          attemptId,
          phase: "calling_supabase",
        });
        throw error;
      }
      logAuthDiagnostic("AUTH_SESSION_RECOVERED", {
        attemptId,
        phase: "calling_supabase",
      });
      return recovered.data.user;
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

export async function obterUtilizadorSupabaseValidado(
  attemptId?: string,
): Promise<User | undefined> {
  const supabase = getSupabaseClient();
  if (!supabase) return undefined;

  logAuthDiagnostic("AUTH_USER_CHECK_STARTED", { attemptId });
  try {
    const { data, error } = await withSupabaseTimeout(
      supabase.auth.getUser(),
      "AUTH_GET_USER",
      8000,
    );
    if (error) {
      logAuthDiagnostic("AUTH_USER_CHECK_FAILED", { attemptId });
      if (error.name === "AuthRetryableFetchError" || error.status === 0) {
        throw new SupabaseAuthRequestError(error);
      }
      throw new SupabaseAuthReturnedError(error);
    }
    if (!data.user?.id) return undefined;
    logAuthDiagnostic("AUTH_USER_CHECK_COMPLETED", { attemptId });
    return data.user;
  } catch (error) {
    if (error instanceof SupabaseAuthTimeoutError) {
      logAuthDiagnostic("AUTH_USER_CHECK_TIMEOUT", { attemptId });
    } else {
      logAuthDiagnostic("AUTH_USER_CHECK_FAILED", {
        attemptId,
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
    }
    throw error;
  }
}

export async function registarUltimoAcesso(userId: string, attemptId?: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    logAuthDiagnostic("LAST_LOGIN_UPDATE_STARTED", { attemptId });
    const { error } = await withSupabaseTimeout(
      supabase
        .from("profiles")
        .update({ last_login_at: new Date().toISOString() })
        .eq("user_id", userId),
      "LAST_LOGIN_UPDATE",
      8000,
    );

    if (error) throw error;
    logAuthDiagnostic("LAST_LOGIN_UPDATE_COMPLETED", { attemptId });
  } catch {
    logAuthDiagnostic("LAST_LOGIN_UPDATE_FAILED", { attemptId });
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
