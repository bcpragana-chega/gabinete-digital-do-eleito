import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;
const SUPABASE_TIMEOUT_MS = 12000;

export function withSupabaseTimeout<T>(
  promise: PromiseLike<T>,
  etapa: string,
  timeoutMs = SUPABASE_TIMEOUT_MS,
): Promise<T> {
  return Promise.race<T>([
    promise,
    new Promise<never>((_, reject) => {
      globalThis.setTimeout(() => {
        reject(new Error(`TIMEOUT_SUPABASE_${etapa}`));
      }, timeoutMs);
    }),
  ]);
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
): Promise<User | undefined> {
  console.info("[Tribuno Auth] Login Supabase iniciado", {
    supabaseConfigurado: isSupabaseConfigured(),
    temCredential: Boolean(credential),
  });

  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn("[Tribuno Auth] Login Supabase ignorado: Supabase não configurado.");
    return undefined;
  }

  const { data, error } = await withSupabaseTimeout(
    supabase.auth.signInWithIdToken({
      provider: "google",
      token: credential,
    }),
    "SIGN_IN_WITH_ID_TOKEN",
  );

  if (error) {
    console.error("[Tribuno Auth] Login Supabase falhou", {
      supabaseConfigurado: true,
      error,
    });
    throw error;
  }

  console.info("[Tribuno Auth] Login Supabase concluído", {
    existeSupabaseUser: Boolean(data.user?.id),
    supabaseUserId: data.user?.id,
  });

  return data.user ?? undefined;
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

export async function terminarSessaoSupabase() {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.auth.signOut();
  if (error) {
    console.warn("[Tribuno] Não foi possível terminar a sessão Supabase.", error);
  }
}
