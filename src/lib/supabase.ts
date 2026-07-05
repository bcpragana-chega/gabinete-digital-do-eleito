import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

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
  const supabase = getSupabaseClient();
  if (!supabase) return undefined;

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: credential,
  });

  if (error) throw error;

  return data.user ?? undefined;
}

export async function terminarSessaoSupabase() {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.auth.signOut();
  if (error) {
    console.warn("[Tribuno] Não foi possível terminar a sessão Supabase.", error);
  }
}
