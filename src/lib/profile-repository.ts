import type { PerfilEleito } from "@/lib/auth-store";
import { readJSON, userScopedKey, writeJSON } from "@/lib/storage-provider";
import { getSupabaseClient, isSupabaseConfigured, withSupabaseTimeout } from "@/lib/supabase";

export type ProfileRow = {
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
  user_id: string;
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

export function profileFromRow(row: ProfileRow): PerfilEleito {
  const assinaturaInstitucional = textoSeguro(row.assinatura_institucional);
  const logoUrl = textoSeguro(row.logo_url);

  return {
    nomeInstitucional: textoSeguro(row.nome_institucional),
    cargo: cargoSeguro(row.cargo),
    orgao: orgaoSeguro(row.orgao),
    organizacao: textoSeguro(row.organizacao),
    territorio: textoSeguro(row.territorio),
    municipio: textoSeguro(row.municipio) || undefined,
    freguesia: textoSeguro(row.freguesia) || undefined,
    assinaturaInstitucional: assinaturaInstitucional || undefined,
    logoUrl: logoUrl || undefined,
    updatedAt: textoSeguro(row.updated_at) || new Date().toISOString(),
  };
}

export function profileToRow(userId: string, perfil: PerfilEleito): ProfileRow {
  if (
    !userId ||
    !textoSeguro(perfil.nomeInstitucional) ||
    !cargosPermitidos.includes(perfil.cargo) ||
    !orgaosPermitidos.includes(perfil.orgao) ||
    !textoSeguro(perfil.organizacao) ||
    !textoSeguro(perfil.territorio)
  ) {
    throw new Error("PROFILE_REQUIRED_FIELDS_MISSING");
  }

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

type GuardarPerfilConfirmadoDependencias = {
  upsert: (row: ProfileRow) => Promise<ProfileRow | undefined>;
};

/** @internal Expõe o contrato confirmado do upsert para testes. */
export async function guardarPerfilConfirmadoComDependencias(
  userId: string,
  perfil: PerfilEleito,
  dependencias: GuardarPerfilConfirmadoDependencias,
) {
  const row = profileToRow(userId, perfil);
  const persistida = await dependencias.upsert(row);
  if (!persistida || persistida.user_id !== userId) {
    throw new Error("PROFILE_UPSERT_SEM_CONFIRMACAO");
  }
  return profileFromRow(persistida);
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

  return data ? profileFromRow(data) : undefined;
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
    8000,
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
    throw new Error("PROFILE_REMOTE_SESSION_UNAVAILABLE");
  }

  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("PROFILE_REMOTE_UNAVAILABLE");

  const persistido = await guardarPerfilConfirmadoComDependencias(supabaseUserId, perfil, {
    upsert: async (row) => {
      const { data, error } = await withSupabaseTimeout(
        supabase
          .from("profiles")
          .upsert(row, { onConflict: "user_id" })
          .select("*")
          .single<ProfileRow>(),
        "PROFILE_UPSERT",
      );
      if (error) throw error;
      return data ?? undefined;
    },
  });

  console.info("[Tribuno Perfil] Guardar perfil remoto concluído");
  return persistido;
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

/** @internal Impede que um upload remoto confirmado recue para uma data URL. */
export function resolverUrlPublicaLogo(valor: unknown) {
  const publicUrl = textoSeguro(valor);
  if (!publicUrl || publicUrl.startsWith("data:")) {
    throw new Error("LOGO_PUBLIC_URL_UNAVAILABLE");
  }
  return publicUrl;
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
  return resolverUrlPublicaLogo(data.publicUrl);
}

export async function guardarOnboardingVersionRemoto(userId: string, version: number) {
  console.info("[Tribuno Perfil] Guardar onboarding remoto iniciado", {
    supabaseConfigurado: isSupabaseConfigured(),
    onboardingVersion: version,
  });

  const supabaseUserId = await obterSupabaseUserIdValido(userId);
  if (!supabaseUserId) {
    throw new Error("ONBOARDING_REMOTE_SESSION_UNAVAILABLE");
  }

  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("ONBOARDING_REMOTE_UNAVAILABLE");

  const persistido = await guardarOnboardingVersionConfirmadaComDependencias(
    supabaseUserId,
    version,
    async (ownerId, onboardingVersion) => {
      const { data, error } = await withSupabaseTimeout(
        supabase
          .from("profiles")
          .update({
            onboarding_version: onboardingVersion,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", ownerId)
          .select("user_id,onboarding_version")
          .maybeSingle<ProfileOnboardingRow>(),
        "PROFILE_UPDATE_ONBOARDING",
        8000,
      );
      if (error) throw error;
      return data ?? undefined;
    },
  );

  console.info("[Tribuno Perfil] Guardar onboarding remoto concluído", {
    onboardingVersion: version,
  });
  return persistido;
}

/** @internal Impede que update sem linha afetada seja tratado como sucesso. */
export async function guardarOnboardingVersionConfirmadaComDependencias(
  userId: string,
  version: number,
  atualizar: (userId: string, version: number) => Promise<ProfileOnboardingRow | undefined>,
) {
  const persistido = await atualizar(userId, version);
  if (!persistido || persistido.user_id !== userId) {
    throw new Error("ONBOARDING_PROFILE_NOT_FOUND");
  }
  return persistido;
}

export async function carregarPerfilHibrido(userId?: string) {
  if (!userId) return undefined;

  return carregarPerfilHibridoComDependencias(userId, {
    remotoConfigurado: isSupabaseConfigured,
    carregarRemoto: carregarPerfilRemoto,
    carregarLocal: carregarPerfilLocal,
    guardarLocal: guardarPerfilLocal,
  });
}

/** @internal Preserva o logótipo local durante a transição de linhas remotas antigas. */
export async function carregarPerfilHibridoComDependencias(
  userId: string,
  dependencias: {
    remotoConfigurado: () => boolean;
    carregarRemoto: (userId: string) => Promise<PerfilEleito | undefined>;
    carregarLocal: (userId: string) => PerfilEleito | undefined;
    guardarLocal: (userId: string, perfil: PerfilEleito) => void;
  },
) {
  const local = dependencias.carregarLocal(userId);
  if (!dependencias.remotoConfigurado()) return local;

  const remoto = await dependencias.carregarRemoto(userId);
  if (!remoto) return undefined;

  const hidratado =
    !textoSeguro(remoto.logoUrl) && textoSeguro(local?.logoUrl)
      ? { ...remoto, logoUrl: textoSeguro(local?.logoUrl) }
      : remoto;
  dependencias.guardarLocal(userId, hidratado);
  return hidratado;
}

export async function guardarPerfilHibrido(userId: string, perfil: PerfilEleito) {
  return guardarPerfilHibridoComDependencias(userId, perfil, {
    guardarLocal: guardarPerfilLocal,
    remotoConfigurado: isSupabaseConfigured,
    guardarRemoto: guardarPerfilRemoto,
  });
}

/** @internal Mantém o rascunho local, mas propaga qualquer falha remota. */
export async function guardarPerfilHibridoComDependencias(
  userId: string,
  perfil: PerfilEleito,
  dependencias: {
    guardarLocal: (userId: string, perfil: PerfilEleito) => void;
    remotoConfigurado: () => boolean;
    guardarRemoto: (userId: string, perfil: PerfilEleito) => Promise<unknown>;
  },
) {
  try {
    dependencias.guardarLocal(userId, perfil);
  } catch (cause) {
    const error = new Error("PROFILE_LOCAL_WRITE_FAILED", { cause });
    error.name = "PROFILE_LOCAL_WRITE_FAILED";
    throw error;
  }
  if (!dependencias.remotoConfigurado()) {
    throw new Error("PROFILE_REMOTE_NOT_CONFIGURED");
  }

  await dependencias.guardarRemoto(userId, perfil);
  return perfil;
}
