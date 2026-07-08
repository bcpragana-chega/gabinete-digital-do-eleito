import type { PerfilEleito } from "@/lib/auth-store";
import { readJSON, userScopedKey, writeJSON } from "@/lib/storage-provider";
import { getSupabaseClient, isSupabaseConfigured, withSupabaseTimeout } from "@/lib/supabase";

type ProfileRow = {
  user_id: string;
  nome_institucional: string | null;
  cargo: PerfilEleito["cargo"] | null;
  orgao: PerfilEleito["orgao"] | null;
  organizacao: string | null;
  territorio: string | null;
  assinatura_institucional: string | null;
  onboarding_version?: number | null;
  updated_at: string | null;
};

type ProfileOnboardingRow = {
  onboarding_version: number | null;
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
  if (!isSupabaseConfigured()) {
    console.info("[Tribuno Perfil] Supabase não configurado para perfil remoto.");
    return undefined;
  }

  const supabase = getSupabaseClient();
  if (!supabase) return undefined;

  const { data, error } = await withSupabaseTimeout(
    supabase.auth.getUser(),
    "PROFILE_GET_USER",
    8000,
  );
  if (error || !data.user?.id) {
    console.warn("[Tribuno Perfil] Sem sessão Supabase válida para sincronizar perfil.", {
      userId,
      error,
    });
    return undefined;
  }

  if (userId && userId !== data.user.id) {
    console.warn("[Tribuno Perfil] Sincronização ignorada: userId não corresponde ao auth.uid().", {
      storeUserId: userId,
      supabaseUserId: data.user.id,
    });
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
  console.info("[Tribuno Perfil] Carregar perfil remoto iniciado", {
    userId,
    supabaseConfigurado: isSupabaseConfigured(),
  });

  const supabaseUserId = await obterSupabaseUserIdValido(userId);
  if (!supabaseUserId) {
    console.info("[Tribuno Perfil] Carregamento remoto ignorado: sem auth.uid válido.", {
      userId,
    });
    return undefined;
  }

  const supabase = getSupabaseClient();
  if (!supabase) return undefined;

  const { data, error } = await withSupabaseTimeout(
    supabase.from("profiles").select("*").eq("user_id", supabaseUserId).maybeSingle<ProfileRow>(),
    "PROFILE_SELECT",
  );

  if (error) throw error;

  console.info("[Tribuno Perfil] Carregar perfil remoto concluído", {
    userId,
    supabaseUserId,
    perfilEncontrado: Boolean(data),
  });

  return data ? fromRow(data) : undefined;
}

export async function carregarOnboardingVersionRemoto(userId?: string) {
  console.info("[Tribuno Perfil] Carregar onboarding remoto iniciado", {
    userId,
    supabaseConfigurado: isSupabaseConfigured(),
  });

  const supabaseUserId = await obterSupabaseUserIdValido(userId);
  if (!supabaseUserId) {
    console.info("[Tribuno Perfil] Carregamento de onboarding ignorado: sem auth.uid válido.", {
      userId,
    });
    return undefined;
  }

  const supabase = getSupabaseClient();
  if (!supabase) return undefined;

  const { data, error } = await withSupabaseTimeout(
    supabase
      .from("profiles")
      .select("onboarding_version")
      .eq("user_id", supabaseUserId)
      .maybeSingle<ProfileOnboardingRow>(),
    "PROFILE_SELECT_ONBOARDING",
  );

  if (error) throw error;

  const version = Number.isFinite(data?.onboarding_version)
    ? Number(data?.onboarding_version)
    : undefined;

  console.info("[Tribuno Perfil] Carregar onboarding remoto concluído", {
    userId,
    supabaseUserId,
    onboardingVersion: version,
  });

  return version;
}

export async function guardarPerfilRemoto(userId: string, perfil: PerfilEleito) {
  console.info("[Tribuno Perfil] Guardar perfil remoto iniciado", {
    userId,
    supabaseConfigurado: isSupabaseConfigured(),
    payload: {
      nomeInstitucionalLength: perfil.nomeInstitucional.length,
      cargo: perfil.cargo,
      orgao: perfil.orgao,
      organizacaoLength: perfil.organizacao.length,
      territorioLength: perfil.territorio.length,
      temAssinaturaInstitucional: Boolean(perfil.assinaturaInstitucional),
    },
  });

  const supabaseUserId = await obterSupabaseUserIdValido(userId);
  if (!supabaseUserId) {
    console.info("[Tribuno Perfil] Gravação remota ignorada: sem auth.uid válido.", {
      userId,
    });
    return;
  }

  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { error } = await withSupabaseTimeout(
    supabase.from("profiles").upsert(toRow(supabaseUserId, perfil), {
      onConflict: "user_id",
    }),
    "PROFILE_UPSERT",
  );

  if (error) throw error;

  console.info("[Tribuno Perfil] Guardar perfil remoto concluído", {
    userId,
    supabaseUserId,
  });
}

export async function guardarOnboardingVersionRemoto(userId: string, version: number) {
  console.info("[Tribuno Perfil] Guardar onboarding remoto iniciado", {
    userId,
    supabaseConfigurado: isSupabaseConfigured(),
    onboardingVersion: version,
  });

  const supabaseUserId = await obterSupabaseUserIdValido(userId);
  if (!supabaseUserId) {
    console.info("[Tribuno Perfil] Gravação de onboarding ignorada: sem auth.uid válido.", {
      userId,
    });
    return;
  }

  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { error } = await withSupabaseTimeout(
    supabase
      .from("profiles")
      .update({ onboarding_version: version, updated_at: new Date().toISOString() })
      .eq("user_id", supabaseUserId),
    "PROFILE_UPDATE_ONBOARDING",
  );

  if (error) throw error;

  console.info("[Tribuno Perfil] Guardar onboarding remoto concluído", {
    userId,
    supabaseUserId,
    onboardingVersion: version,
  });
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
