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
  municipio: string | null;
  freguesia: string | null;
  assinatura_institucional: string | null;
  logo_url: string | null;
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
    municipio: textoSeguro(row.municipio) || undefined,
    freguesia: textoSeguro(row.freguesia) || undefined,
    assinaturaInstitucional: assinaturaInstitucional || undefined,
    logoUrl: textoSeguro(row.logo_url) || undefined,
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
    municipio: textoSeguro(perfil.municipio) || null,
    freguesia: textoSeguro(perfil.freguesia) || null,
    assinatura_institucional: textoSeguro(perfil.assinaturaInstitucional) || null,
    logo_url: textoSeguro(perfil.logoUrl) || null,
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
      operacao: "PROFILE_AUTH_INVALIDA",
      temErro: Boolean(error),
    });
    return undefined;
  }

  if (userId && userId !== data.user.id) {
    console.warn("[Tribuno Perfil] Sincronização ignorada por divergência de sessão.", {
      operacao: "PROFILE_AUTH_DIVERGENTE",
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
    supabaseConfigurado: isSupabaseConfigured(),
  });

  const supabaseUserId = await obterSupabaseUserIdValido(userId);
  if (!supabaseUserId) {
    console.info("[Tribuno Perfil] Carregamento remoto ignorado: sem sessão válida.");
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
    perfilEncontrado: Boolean(data),
  });

  return data ? fromRow(data) : undefined;
}

export async function carregarOnboardingVersionRemoto(userId?: string) {
  console.info("[Tribuno Perfil] Carregar onboarding remoto iniciado", {
    supabaseConfigurado: isSupabaseConfigured(),
  });

  const supabaseUserId = await obterSupabaseUserIdValido(userId);
  if (!supabaseUserId) {
    console.info("[Tribuno Perfil] Carregamento de onboarding ignorado: sem sessão válida.");
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
    onboardingVersion: version,
  });

  return version;
}

export async function guardarPerfilRemoto(userId: string, perfil: PerfilEleito) {
  console.info("[Tribuno Perfil] Guardar perfil remoto iniciado", {
    supabaseConfigurado: isSupabaseConfigured(),
    temLogo: Boolean(perfil.logoUrl),
  });

  const supabaseUserId = await obterSupabaseUserIdValido(userId);
  if (!supabaseUserId) {
    console.info("[Tribuno Perfil] Gravação remota ignorada: sem sessão válida.");
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

  console.info("[Tribuno Perfil] Guardar perfil remoto concluído");
}

const LOGO_MAX_BYTES = 2_000_000;

const LOGO_EXTENSOES_POR_MIME = {
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/webp": ["webp"],
} as const;

type LogoMime = keyof typeof LOGO_EXTENSOES_POR_MIME;

function validarLogo(file: File) {
  if (!Object.prototype.hasOwnProperty.call(LOGO_EXTENSOES_POR_MIME, file.type)) {
    throw new Error("LOGO_INVALID_MIME_TYPE");
  }

  if (file.size > LOGO_MAX_BYTES) {
    throw new Error("LOGO_TOO_LARGE");
  }

  const mimeType = file.type as LogoMime;
  const ultimoPonto = file.name.lastIndexOf(".");
  const extensaoNome = ultimoPonto >= 0 ? file.name.slice(ultimoPonto + 1).toLowerCase() : "";
  const extensoesPermitidas = LOGO_EXTENSOES_POR_MIME[mimeType] as readonly string[];

  if (!extensaoNome || !extensoesPermitidas.includes(extensaoNome)) {
    throw new Error("LOGO_INVALID_EXTENSION");
  }

  return {
    mimeType,
    extensao: extensoesPermitidas[0],
  };
}

function ficheiroParaDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("LOGO_DATA_URL_INVALIDO"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("LOGO_DATA_URL_ERRO"));
    reader.readAsDataURL(file);
  });
}

export async function guardarLogoPerfil(userId: string | undefined, file: File) {
  const { mimeType, extensao } = validarLogo(file);
  const fallbackLocal = await ficheiroParaDataUrl(file);
  const supabaseUserId = await obterSupabaseUserIdValido(userId);
  const supabase = getSupabaseClient();

  if (!supabase || !supabaseUserId) return fallbackLocal;

  const path = `${supabaseUserId}/logo.${extensao}`;
  const { error } = await withSupabaseTimeout(
    supabase.storage.from("logos").upload(path, file, {
      cacheControl: "3600",
      contentType: mimeType,
      upsert: true,
    }),
    "PROFILE_LOGO_UPLOAD",
    15000,
  );

  if (error) {
    console.warn("[Tribuno Perfil] Upload remoto do logótipo falhou; a usar fallback local.", {
      operacao: "PROFILE_LOGO_REMOTE_UPLOAD_FALHOU",
    });
    return fallbackLocal;
  }

  const { data } = supabase.storage.from("logos").getPublicUrl(path);
  return data.publicUrl || fallbackLocal;
}

export async function guardarOnboardingVersionRemoto(userId: string, version: number) {
  console.info("[Tribuno Perfil] Guardar onboarding remoto iniciado", {
    supabaseConfigurado: isSupabaseConfigured(),
    onboardingVersion: version,
  });

  const supabaseUserId = await obterSupabaseUserIdValido(userId);
  if (!supabaseUserId) {
    console.info("[Tribuno Perfil] Gravação de onboarding ignorada: sem sessão válida.");
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
    } catch {
      console.warn("[Tribuno Perfil] Carregamento remoto falhou.", {
        operacao: "PROFILE_LOAD_FALHOU",
      });
    }
  }

  return carregarPerfilLocal(userId);
}

export async function guardarPerfilHibrido(userId: string, perfil: PerfilEleito) {
  guardarPerfilLocal(userId, perfil);

  if (!isSupabaseConfigured()) return perfil;

  try {
    await guardarPerfilRemoto(userId, perfil);
  } catch {
    console.warn("[Tribuno Perfil] Sincronização remota falhou.", {
      operacao: "PROFILE_SYNC_FALHOU",
    });
  }

  return perfil;
}
