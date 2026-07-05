import type { PerfilEleito } from "@/lib/auth-store";
import { readJSON, userScopedKey, writeJSON } from "@/lib/storage-provider";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

type ProfileRow = {
  user_id: string;
  nome_institucional: string | null;
  cargo: PerfilEleito["cargo"] | null;
  orgao: PerfilEleito["orgao"] | null;
  organizacao: string | null;
  territorio: string | null;
  assinatura_institucional: string | null;
  updated_at: string | null;
};

const cargosPermitidos: PerfilEleito["cargo"][] = [
  "Membro da Assembleia de Freguesia",
  "Presidente da Junta de Freguesia",
  "Secretário da Junta de Freguesia",
  "Tesoureiro da Junta de Freguesia",
  "Membro da Assembleia Municipal",
  "Vereador",
  "Deputado Municipal",
  "Outro",
];

const orgaosPermitidos: PerfilEleito["orgao"][] = [
  "Assembleia de Freguesia",
  "Junta de Freguesia",
  "Assembleia Municipal",
  "Câmara Municipal",
  "Outro",
];

function profileKey(userId: string) {
  return userScopedKey("tribuno:perfil", userId);
}

function textoSeguro(valor: unknown) {
  return typeof valor === "string" ? valor.trim() : "";
}

function cargoSeguro(valor: unknown): PerfilEleito["cargo"] {
  return typeof valor === "string" && cargosPermitidos.includes(valor as PerfilEleito["cargo"])
    ? (valor as PerfilEleito["cargo"])
    : "Outro";
}

function orgaoSeguro(valor: unknown): PerfilEleito["orgao"] {
  return typeof valor === "string" && orgaosPermitidos.includes(valor as PerfilEleito["orgao"])
    ? (valor as PerfilEleito["orgao"])
    : "Outro";
}

function fromRow(row: ProfileRow): PerfilEleito {
  const assinaturaInstitucional = textoSeguro(row.assinatura_institucional);

  return {
    nomeInstitucional: textoSeguro(row.nome_institucional),
    cargo: cargoSeguro(row.cargo),
    orgao: orgaoSeguro(row.orgao),
    organizacao: textoSeguro(row.organizacao),
    territorio: textoSeguro(row.territorio),
    assinaturaInstitucional: assinaturaInstitucional || undefined,
    updatedAt: textoSeguro(row.updated_at) || new Date().toISOString(),
  };
}

function toRow(userId: string, perfil: PerfilEleito): ProfileRow {
  return {
    user_id: userId,
    nome_institucional: textoSeguro(perfil.nomeInstitucional),
    cargo: cargoSeguro(perfil.cargo),
    orgao: orgaoSeguro(perfil.orgao),
    organizacao: textoSeguro(perfil.organizacao),
    territorio: textoSeguro(perfil.territorio),
    assinatura_institucional: textoSeguro(perfil.assinaturaInstitucional) || null,
    updated_at: textoSeguro(perfil.updatedAt) || new Date().toISOString(),
  };
}

async function obterSupabaseUserIdValido(userId?: string) {
  if (!isSupabaseConfigured()) return undefined;

  const supabase = getSupabaseClient();
  if (!supabase) return undefined;

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.id) {
    if (import.meta.env.DEV) {
      console.warn("[Tribuno] Sem sessão Supabase válida para sincronizar Perfil.", error);
    }
    return undefined;
  }

  if (userId && userId !== data.user.id) {
    if (import.meta.env.DEV) {
      console.warn(
        "[Tribuno] Sincronização de Perfil ignorada: userId não corresponde ao auth.uid().",
        {
          storeUserId: userId,
          supabaseUserId: data.user.id,
        },
      );
    }
    return undefined;
  }

  return data.user.id;
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
  const supabaseUserId = await obterSupabaseUserIdValido(userId);
  if (!supabaseUserId) return undefined;

  const supabase = getSupabaseClient();
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", supabaseUserId)
    .maybeSingle<ProfileRow>();

  if (error) throw error;

  return data ? fromRow(data) : undefined;
}

export async function guardarPerfilRemoto(userId: string, perfil: PerfilEleito) {
  const supabaseUserId = await obterSupabaseUserIdValido(userId);
  if (!supabaseUserId) return;

  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.from("profiles").upsert(toRow(supabaseUserId, perfil), {
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
