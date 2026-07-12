import type { BaseJuridicaInstitucional, TipoOrgaoAutarquico } from "@/lib/ai/legal-basis";
import { identificarTipoOrgaoAutarquico } from "@/lib/ai/legal-basis";
import type { PerfilInstitucionalContexto, SessaoContexto } from "@/lib/ai/types";
import type { TipoDocumentoCriado } from "@/lib/types";

export const INSTITUTIONAL_CONTEXT_VERSION = "1" as const;
export type InstitutionalContextVersion = typeof INSTITUTIONAL_CONTEXT_VERSION;
export type InstitutionalLevel = "PARISH" | "MUNICIPALITY";
export type InstitutionalRole =
  | "PARISH_ASSEMBLY_MEMBER"
  | "PARISH_ASSEMBLY_PRESIDENT"
  | "PARISH_EXECUTIVE_MEMBER"
  | "PARISH_EXECUTIVE_PRESIDENT"
  | "MUNICIPAL_ASSEMBLY_MEMBER"
  | "MUNICIPAL_ASSEMBLY_PRESIDENT"
  | "COUNCILLOR"
  | "MAYOR";
export type DeliberativeBodyType = "PARISH_ASSEMBLY" | "MUNICIPAL_ASSEMBLY";
export type ExecutiveBodyType = "PARISH_EXECUTIVE" | "MUNICIPAL_EXECUTIVE";
export type InstitutionalRecipientType =
  | "DELIBERATIVE_BODY"
  | "EXECUTIVE_BODY"
  | "ASSEMBLY_PRESIDENT"
  | "EXECUTIVE_PRESIDENT"
  | "ASSEMBLY_BUREAU";
export type InstitutionalCompetenceGroup =
  | "DELIBERATIVE"
  | "OVERSIGHT"
  | "EXECUTIVE"
  | "CONSULTATIVE"
  | "RECOMMENDATORY";

export type InstitutionalContextValidationErrorCode =
  | "MISSING_ELECTED_OFFICIAL_NAME"
  | "UNKNOWN_INSTITUTIONAL_ROLE"
  | "MISSING_MUNICIPALITY"
  | "MISSING_PARISH"
  | "INVALID_TERRITORIAL_LEVEL"
  | "BODY_LEVEL_MISMATCH"
  | "INVALID_DELIBERATIVE_BODY"
  | "INVALID_EXECUTIVE_BODY"
  | "INVALID_RECIPIENT"
  | "RECIPIENT_LEVEL_MISMATCH"
  | "LEGAL_BASIS_INVALID"
  | "INSTITUTIONAL_PROFILE_INCOMPLETE"
  | "LEGACY_INSTITUTIONAL_CONTEXT_UNRESOLVED"
  | "INSTITUTIONAL_EXPORT_BLOCKED"
  | "INSTITUTIONAL_CONTEXT_VERSION_MISSING"
  | "SESSION_BODY_MISMATCH"
  | "DOCUMENT_TYPE_NOT_SUPPORTED"
  | "INSTITUTIONAL_CONTEXT_INVALID";

export type InstitutionalContextValidationWarningCode = "LEGACY_TERRITORY_USED";

export type InstitutionalContextValidationError = {
  code: InstitutionalContextValidationErrorCode;
  message: string;
  field?: string;
};

export type InstitutionalContextValidationWarning = {
  code: InstitutionalContextValidationWarningCode;
  message: string;
  field?: string;
};

export interface ResolvedInstitutionalContext {
  electedOfficial: {
    id?: string;
    name: string;
    role: InstitutionalRole;
    institutionalTitle: string;
  };
  territory: {
    level: InstitutionalLevel;
    municipalityId?: string;
    municipalityName: string;
    parishId?: string;
    parishName?: string;
  };
  institution: {
    deliberativeBody: {
      type: DeliberativeBodyType;
      officialName: string;
    };
    executiveBody: {
      type: ExecutiveBodyType;
      officialName: string;
    };
  };
  session?: {
    id?: string;
    type?: string;
    date?: string;
    officialBodyName: string;
  };
  legal: {
    status: "VALID" | "INVALID";
    recipient: {
      type: InstitutionalRecipientType;
      officialName: string;
    };
    competenceGroup: InstitutionalCompetenceGroup;
    articles: ReadonlyArray<{
      diploma: string;
      article: string;
      purpose: string;
      officialSource?: string;
    }>;
    confidence: "HIGH" | "MEDIUM" | "LOW";
  };
  validation: {
    valid: boolean;
    errors: ReadonlyArray<InstitutionalContextValidationError>;
    warnings: ReadonlyArray<InstitutionalContextValidationWarning>;
  };
}

export type ResolveInstitutionalContextInput = {
  electedOfficialId?: string;
  perfil: PerfilInstitucionalContexto;
  sessao?: SessaoContexto;
  tipoDocumental: TipoDocumentoCriado;
  baseJuridica: BaseJuridicaInstitucional;
};

export type StoredInstitutionalContextResolution =
  | {
      status: "RESOLVED" | "LEGACY_RESOLVED";
      context: Readonly<ResolvedInstitutionalContext>;
      errors: ReadonlyArray<InstitutionalContextValidationError>;
    }
  | {
      status: "UNRESOLVED";
      context?: undefined;
      errors: ReadonlyArray<InstitutionalContextValidationError>;
    };

function textoSeguro(valor?: string) {
  return valor?.trim() || undefined;
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (!value || typeof value !== "object") return value as Readonly<T>;
  Object.freeze(value);
  Object.values(value).forEach((item) => {
    if (item && typeof item === "object" && !Object.isFrozen(item)) deepFreeze(item);
  });
  return value as Readonly<T>;
}

function nivelPorOrgao(tipo?: TipoOrgaoAutarquico): InstitutionalLevel | undefined {
  if (tipo === "Assembleia de Freguesia" || tipo === "Junta de Freguesia") return "PARISH";
  if (tipo === "Assembleia Municipal" || tipo === "Câmara Municipal") return "MUNICIPALITY";
  return undefined;
}

function cargoParaRole(cargo?: string): InstitutionalRole | undefined {
  if (cargo === "Membro da Assembleia de Freguesia") return "PARISH_ASSEMBLY_MEMBER";
  if (cargo === "Presidente da Junta de Freguesia") return "PARISH_EXECUTIVE_PRESIDENT";
  if (
    cargo === "Secretário da Junta de Freguesia" ||
    cargo === "Tesoureiro da Junta de Freguesia"
  ) {
    return "PARISH_EXECUTIVE_MEMBER";
  }
  if (cargo === "Membro da Assembleia Municipal" || cargo === "Deputado Municipal") {
    return "MUNICIPAL_ASSEMBLY_MEMBER";
  }
  if (cargo === "Vereador") return "COUNCILLOR";
  return undefined;
}

function roleCompativel(
  role: InstitutionalRole | undefined,
  level: InstitutionalLevel | undefined,
) {
  if (!role || !level) return false;
  if (level === "PARISH") return role.startsWith("PARISH_");
  return role.startsWith("MUNICIPAL_") || role === "COUNCILLOR" || role === "MAYOR";
}

function orgaosOficiais(level: InstitutionalLevel, municipio: string, freguesia?: string) {
  if (level === "PARISH") {
    return {
      deliberativeBody: {
        type: "PARISH_ASSEMBLY" as const,
        officialName: `Assembleia de Freguesia de ${freguesia}`,
      },
      executiveBody: {
        type: "PARISH_EXECUTIVE" as const,
        officialName: `Junta de Freguesia de ${freguesia}`,
      },
    };
  }

  return {
    deliberativeBody: {
      type: "MUNICIPAL_ASSEMBLY" as const,
      officialName: `Assembleia Municipal de ${municipio}`,
    },
    executiveBody: {
      type: "MUNICIPAL_EXECUTIVE" as const,
      officialName: `Câmara Municipal de ${municipio}`,
    },
  };
}

function recipientTypeFromLegal(
  base: BaseJuridicaInstitucional,
  deliberativeName: string,
  executiveName: string,
): InstitutionalRecipientType {
  if (base.destinatario === deliberativeName) return "DELIBERATIVE_BODY";
  if (base.destinatario === executiveName) return "EXECUTIVE_BODY";
  if (
    base.destinatarioTipo === "Assembleia de Freguesia" ||
    base.destinatarioTipo === "Assembleia Municipal"
  ) {
    return "DELIBERATIVE_BODY";
  }
  return "EXECUTIVE_BODY";
}

function competenceGroup(
  tipo: TipoDocumentoCriado,
  recipient: InstitutionalRecipientType,
): InstitutionalCompetenceGroup {
  if (tipo === "Requerimento") return "OVERSIGHT";
  if (tipo === "Recomendação") return "RECOMMENDATORY";
  if (tipo === "Moção" || tipo === "Declaração de voto") return "DELIBERATIVE";
  if (recipient === "EXECUTIVE_BODY") return "EXECUTIVE";
  return "CONSULTATIVE";
}

function confidence(valor: BaseJuridicaInstitucional["nivelConfianca"]) {
  if (valor === "alto") return "HIGH";
  if (valor === "medio") return "MEDIUM";
  return "LOW";
}

export function resolveInstitutionalContext(
  input: ResolveInstitutionalContextInput,
): Readonly<ResolvedInstitutionalContext> {
  const errors: InstitutionalContextValidationError[] = [];
  const warnings: InstitutionalContextValidationWarning[] = [];
  const perfilTipoOrgao = identificarTipoOrgaoAutarquico(input.perfil.orgao);
  const sessaoTipoOrgao = identificarTipoOrgaoAutarquico(input.sessao?.orgao);
  const tipoOrgao = sessaoTipoOrgao ?? perfilTipoOrgao;
  const level = nivelPorOrgao(tipoOrgao);
  const role = cargoParaRole(input.perfil.cargo);
  const nome = textoSeguro(input.perfil.nome);
  const municipio =
    textoSeguro(input.perfil.municipio) ||
    (level === "MUNICIPALITY" ? textoSeguro(input.perfil.territorio) : undefined);
  const freguesia = textoSeguro(input.perfil.freguesia);

  if (!nome || nome === "Nome não indicado") {
    errors.push({
      code: "MISSING_ELECTED_OFFICIAL_NAME",
      message: "Nome institucional em falta.",
      field: "electedOfficial.name",
    });
  }
  if (!role) {
    errors.push({
      code: "UNKNOWN_INSTITUTIONAL_ROLE",
      message: "Cargo institucional desconhecido.",
      field: "electedOfficial.role",
    });
  }
  if (!level) {
    errors.push({
      code: "INVALID_TERRITORIAL_LEVEL",
      message: "Nível territorial não determinado.",
      field: "territory.level",
    });
  }
  if (!municipio) {
    errors.push({
      code: "MISSING_MUNICIPALITY",
      message: "Município em falta.",
      field: "territory.municipalityName",
    });
  }
  if (level === "PARISH" && !freguesia) {
    errors.push({
      code: "MISSING_PARISH",
      message: "Freguesia em falta.",
      field: "territory.parishName",
    });
  }
  if (
    level === "PARISH" &&
    textoSeguro(input.perfil.territorio) &&
    (!textoSeguro(input.perfil.municipio) || !textoSeguro(input.perfil.freguesia))
  ) {
    errors.push({
      code: "INSTITUTIONAL_PROFILE_INCOMPLETE",
      message:
        "Complete o seu perfil institucional antes de gerar documentos oficiais. Confirme o município e, quando aplicável, a freguesia.",
      field: "perfil",
    });
  }
  if (role && level && !roleCompativel(role, level)) {
    errors.push({
      code: "BODY_LEVEL_MISMATCH",
      message: "Cargo incompatível com o nível territorial.",
      field: "electedOfficial.role",
    });
  }
  if (perfilTipoOrgao && sessaoTipoOrgao && perfilTipoOrgao !== sessaoTipoOrgao) {
    errors.push({
      code: "SESSION_BODY_MISMATCH",
      message: "Sessão incompatível com o órgão do perfil.",
      field: "session.officialBodyName",
    });
  }
  if (!input.baseJuridica.valido) {
    errors.push({
      code: "LEGAL_BASIS_INVALID",
      message: input.baseJuridica.motivoInvalido ?? "Base jurídica inválida.",
      field: "legal",
    });
  }

  if (
    !textoSeguro(input.perfil.municipio) &&
    level === "MUNICIPALITY" &&
    textoSeguro(input.perfil.territorio)
  ) {
    warnings.push({
      code: "LEGACY_TERRITORY_USED",
      message: "Município obtido a partir do campo legado territorio.",
      field: "territory.municipalityName",
    });
  }

  const safeLevel = level ?? "MUNICIPALITY";
  const safeMunicipio = municipio ?? "";
  const safeFreguesia = freguesia ?? "";
  const institution = orgaosOficiais(safeLevel, safeMunicipio, safeFreguesia);
  const recipientType = recipientTypeFromLegal(
    input.baseJuridica,
    institution.deliberativeBody.officialName,
    institution.executiveBody.officialName,
  );
  const recipientName =
    recipientType === "DELIBERATIVE_BODY"
      ? institution.deliberativeBody.officialName
      : institution.executiveBody.officialName;

  if (
    textoSeguro(input.baseJuridica.destinatario) &&
    input.baseJuridica.destinatario !== recipientName
  ) {
    errors.push({
      code: "INVALID_RECIPIENT",
      message: "Destinatário jurídico incompatível com o contexto institucional resolvido.",
      field: "legal.recipient",
    });
  }

  if (
    level === "PARISH" &&
    (recipientName.startsWith("Câmara Municipal") ||
      textoSeguro(input.baseJuridica.destinatario)?.startsWith("Câmara Municipal"))
  ) {
    errors.push({
      code: "RECIPIENT_LEVEL_MISMATCH",
      message: "Destinatário municipal num documento de freguesia.",
      field: "legal.recipient",
    });
  }
  if (level === "MUNICIPALITY" && recipientName.startsWith("Junta de Freguesia")) {
    errors.push({
      code: "RECIPIENT_LEVEL_MISMATCH",
      message: "Destinatário de freguesia num documento municipal.",
      field: "legal.recipient",
    });
  }

  const valid = errors.length === 0;
  return deepFreeze({
    electedOfficial: {
      id: input.electedOfficialId,
      name: nome ?? "",
      role: role ?? "MUNICIPAL_ASSEMBLY_MEMBER",
      institutionalTitle: input.perfil.cargo,
    },
    territory: {
      level: safeLevel,
      municipalityName: safeMunicipio,
      parishName: safeLevel === "PARISH" ? safeFreguesia : undefined,
    },
    institution,
    session: input.sessao
      ? {
          id: input.sessao.id,
          type: input.sessao.tipo,
          date: input.sessao.data,
          officialBodyName:
            safeLevel === "PARISH"
              ? institution.deliberativeBody.officialName
              : institution.deliberativeBody.officialName,
        }
      : undefined,
    legal: {
      status: input.baseJuridica.valido ? "VALID" : "INVALID",
      recipient: {
        type: recipientType,
        officialName: recipientName,
      },
      competenceGroup: competenceGroup(input.tipoDocumental, recipientType),
      articles: input.baseJuridica.artigosAplicaveis.map((artigo) => ({
        diploma: artigo.diploma,
        article: artigo.artigo,
        purpose: artigo.finalidade,
      })),
      confidence: confidence(input.baseJuridica.nivelConfianca),
    },
    validation: {
      valid,
      errors,
      warnings,
    },
  });
}

function isResolvedInstitutionalContext(value: unknown): value is ResolvedInstitutionalContext {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Partial<ResolvedInstitutionalContext>;
  return Boolean(
    candidate.electedOfficial &&
    candidate.territory &&
    candidate.institution?.deliberativeBody?.officialName &&
    candidate.institution?.executiveBody?.officialName &&
    candidate.legal?.recipient?.officialName &&
    candidate.validation,
  );
}

function metadataRecord(documento: { iaMetadata?: unknown }) {
  if (
    !documento.iaMetadata ||
    typeof documento.iaMetadata !== "object" ||
    Array.isArray(documento.iaMetadata)
  ) {
    return {};
  }
  return documento.iaMetadata as Record<string, unknown>;
}

export function resolveStoredInstitutionalContext(input: {
  documento: { tipo: TipoDocumentoCriado; iaMetadata?: unknown };
  perfil?: PerfilInstitucionalContexto;
  sessao?: SessaoContexto;
  baseJuridica?: BaseJuridicaInstitucional;
}): StoredInstitutionalContextResolution {
  const metadata = metadataRecord(input.documento);
  const storedContext = metadata.institutionalContext;

  if (isResolvedInstitutionalContext(storedContext)) {
    return {
      status: "RESOLVED",
      context: deepFreeze(storedContext),
      errors: [],
    };
  }

  const versionMissingError: InstitutionalContextValidationError = {
    code: "INSTITUTIONAL_CONTEXT_VERSION_MISSING",
    message: "Documento legado sem versão de contexto institucional.",
    field: "iaMetadata.institutionalContextVersion",
  };

  if (!input.perfil || !input.baseJuridica) {
    return {
      status: "UNRESOLVED",
      errors: [
        {
          code: "LEGACY_INSTITUTIONAL_CONTEXT_UNRESOLVED",
          message:
            "Não foi possível resolver com segurança o contexto institucional deste documento legado.",
          field: "institutionalContext",
        },
        ...(metadata.institutionalContextVersion ? [] : [versionMissingError]),
      ],
    };
  }

  const context = resolveInstitutionalContext({
    perfil: input.perfil,
    sessao: input.sessao,
    tipoDocumental: input.documento.tipo,
    baseJuridica: input.baseJuridica,
  });

  if (!context.validation.valid) {
    return {
      status: "UNRESOLVED",
      errors: [
        ...context.validation.errors,
        {
          code: "LEGACY_INSTITUTIONAL_CONTEXT_UNRESOLVED",
          message:
            "O contexto institucional legado não tem dados suficientes ou coerentes para exportação oficial.",
          field: "institutionalContext",
        },
      ],
    };
  }

  return {
    status: "LEGACY_RESOLVED",
    context,
    errors: metadata.institutionalContextVersion ? [] : [versionMissingError],
  };
}
