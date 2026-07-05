import type { PerfilEleito } from "@/lib/auth-store";
import { readJSON, userScopedKey, writeJSON } from "@/lib/storage-provider";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

type ProfileRow = {
  user_id: string;
  nome_institucional: string;
  cargo: PerfilEleito["cargo"];
  orgao: PerfilEleito["orgao"];
  organizacao: string;
  territorio: string;
  assinatura_institucional: string | null;
  updated_at: string;
};

function profileKey(userId: string) {
  return userScopedKey("tribuno:perfil", userId);
}

function fromRow(row: ProfileRow): PerfilEleito {
  return {
    nomeInstitucional: row.nome_institucional,
    cargo: row.cargo,
    orgao: row.orgao,
    organizacao: row.organizacao,
    territorio: row.territorio,
    assinaturaInstitucional: row.assinatura_institucional ?? undefined,
    updatedAt: row.updated_at,
  };
}

function toRow(userId: string, perfil: PerfilEleito): ProfileRow {
  return {
    user_id: userId,
    nome_institucional: perfil.nomeInstitucional,
    cargo: perfil.cargo,
    orgao: perfil.orgao,
    organizacao: perfil.organizacao,
    territorio: perfil.territorio,
    assinatura_institucional: perfil.assinaturaInstitucional || null,
    updated_at: perfil.updatedAt,
  };
}

export function carregarPerfilLocal(userId?: string) {
  if (!userId) return undefined;

  const key = profileKey(userId);
  if (!key) return undefined;

  return readJSON<PerfilEleito | undefined>(key, undefined);
}

export function guardarPerfilLocal(userId: string, perfil: PerfilEleito) {
  const key = profileKey(userId);
  if (!key) return;

  writeJSON(key, perfil);
}

export async function carregarPerfilRemoto(userId?: string) {
  if (!userId || !isSupabaseConfigured()) return undefined;

  const supabase = getSupabaseClient();
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle<ProfileRow>();

  if (error) throw error;

  return data ? fromRow(data) : undefined;
}

export async function guardarPerfilRemoto(userId: string, perfil: PerfilEleito) {
  if (!isSupabaseConfigured()) return;

  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.from("profiles").upsert(toRow(userId, perfil), {
    onConflict: "user_id",
  });

  if (error) throw error;
}

export async function carregarPerfilHibrido(userId?: string) {
  if (!userId) return undefined;

  if (isSupabaseConfigured()) {
    try {
      const remoto = await carregarPerfilRemoto(userId);
      if (remoto) {
        guardarPerfilLocal(userId, remoto);
        return remoto;
      }
    } catch (error) {
      console.warn("[Tribuno] Não foi possível carregar perfil remoto.", error);
    }
  }

  return carregarPerfilLocal(userId);
}

export async function guardarPerfilHibrido(userId: string, perfil: PerfilEleito) {
  guardarPerfilLocal(userId, perfil);

  if (!isSupabaseConfigured()) return perfil;

  try {
    await guardarPerfilRemoto(userId, perfil);
  } catch (error) {
    console.warn("[Tribuno] Perfil guardado localmente, mas falhou no Supabase.", error);
  }

  return perfil;
}
