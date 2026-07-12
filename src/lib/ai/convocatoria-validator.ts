import type { ResolvedInstitutionalContext } from "@/lib/ai/institutional-context";
import type { Assembleia } from "@/lib/types";
import type {
  ConvocatoriaAnalysisFailure,
  ConvocatoriaBodyType,
  ConvocatoriaExtractionResult,
  ConvocatoriaImportErrorCode,
  ConvocatoriaPreview,
  ConvocatoriaSessionType,
} from "@/lib/ai/convocatoria-types";

export const CONVOCATORIA_MAX_FILE_SIZE = 8 * 1024 * 1024;

const INVALID_COMBOS = [
  /c[aâ]mara municipal de\s+porches/i,
  /c[aâ]mara municipal de\s+\w+.*freguesia/i,
  /junta de freguesia de\s+\w+.*municipal/i,
];

function texto(valor?: string | null) {
  return valor?.trim() || undefined;
}

function semAcentos(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function similarity(left: string, right: string) {
  const a = semAcentos(left);
  const b = semAcentos(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.9;

  const wordsA = new Set(a.split(" "));
  const wordsB = new Set(b.split(" "));
  const common = [...wordsA].filter((word) => wordsB.has(word)).length;
  return common / Math.max(wordsA.size, wordsB.size);
}

function failure(code: ConvocatoriaImportErrorCode, message: string): ConvocatoriaAnalysisFailure {
  return { ok: false, code, message };
}

export function validarFicheiroConvocatoria(file: Pick<File, "type" | "size">) {
  if (file.type !== "application/pdf") {
    return failure("INVALID_FILE_TYPE", "Apenas são aceites ficheiros PDF nesta versão.");
  }
  if (file.size > CONVOCATORIA_MAX_FILE_SIZE) {
    return failure("FILE_TOO_LARGE", "O PDF é demasiado grande para análise nesta versão.");
  }
  return undefined;
}

export function normalizarTipoSessao(
  tipo?: ConvocatoriaSessionType,
): ConvocatoriaPreview["tipoSessao"] {
  if (tipo === "EXTRAORDINARY") return "Extraordinária";
  if (tipo === "ORDINARY") return "Ordinária";
  return "Outra";
}

export function tipoOrgaoEsperado(context: ResolvedInstitutionalContext): ConvocatoriaBodyType {
  return context.institution.deliberativeBody.type;
}

export function nomeOrgaoOficial(
  context: ResolvedInstitutionalContext,
  bodyType?: ConvocatoriaBodyType,
) {
  if (bodyType === context.institution.executiveBody.type) {
    return context.institution.executiveBody.officialName;
  }
  return context.institution.deliberativeBody.officialName;
}

export function normalizarPontosConvocatoria(
  items: ConvocatoriaExtractionResult["agendaItems"],
) {
  return items
    .map((item, index) => ({
      order: Number.isFinite(item.order) && item.order > 0 ? Math.trunc(item.order) : index + 1,
      title: texto(item.title) ?? texto(item.originalText) ?? "",
      description: texto(item.description) ?? "",
      originalText: texto(item.originalText),
    }))
    .filter((item) => {
      if (!item.title) return false;
      const normalized = semAcentos(item.title);
      return !/(contactos|assinatura|email|telefone|rodape|morada)$/.test(normalized);
    })
    .sort((a, b) => a.order - b.order)
    .map((item, index) => ({ ...item, order: index + 1 }));
}

function tituloSessao(extraction: ConvocatoriaExtractionResult, context: ResolvedInstitutionalContext) {
  const tipo = normalizarTipoSessao(extraction.session.sessionType).toLowerCase();
  const base = texto(extraction.session.sessionTitle);
  if (base) return base;
  return `Sessão ${tipo} — ${context.institution.deliberativeBody.officialName}`;
}

export function construirPreviewConvocatoria(
  extraction: ConvocatoriaExtractionResult,
  context: ResolvedInstitutionalContext,
): ConvocatoriaPreview {
  const bodyType = extraction.session.bodyType ?? tipoOrgaoEsperado(context);
  const pontos = normalizarPontosConvocatoria(extraction.agendaItems);
  return {
    orgao: nomeOrgaoOficial(context, bodyType),
    bodyType,
    tipoSessao: normalizarTipoSessao(extraction.session.sessionType),
    titulo: tituloSessao(extraction, context),
    numero: texto(extraction.session.sessionNumber),
    data: texto(extraction.session.date) ?? "",
    hora: texto(extraction.session.time) ?? "",
    local: texto(extraction.session.location) ?? "",
    convocante: texto(extraction.session.conveningAuthority),
    pontos,
    observacoes: (extraction.observations ?? []).map((item) => item.trim()).filter(Boolean),
    avisos: (extraction.extractionWarnings ?? []).map((item) => item.trim()).filter(Boolean),
  };
}

export function validarExtracaoConvocatoria(
  extraction: ConvocatoriaExtractionResult,
  context: ResolvedInstitutionalContext,
) {
  if (!context.validation.valid) {
    return failure(
      "INSTITUTIONAL_PROFILE_INCOMPLETE",
      "Complete o perfil institucional antes de criar sessões por convocatória.",
    );
  }

  if (!extraction.documentClassification.isConvocatoria) {
    return failure(
      "DOCUMENT_NOT_CONVOCATORIA",
      "O PDF não parece ser uma convocatória. Confirme o ficheiro ou crie a sessão manualmente.",
    );
  }

  const bodyName = texto(extraction.session.bodyName);
  if (bodyName && INVALID_COMBOS.some((pattern) => pattern.test(bodyName))) {
    return failure(
      "INSTITUTIONAL_BODY_MISMATCH",
      "A convocatória contém uma combinação institucional incompatível com o seu perfil.",
    );
  }

  const expectedBodyType = tipoOrgaoEsperado(context);
  const extractedBodyType = extraction.session.bodyType;
  if (extractedBodyType && extractedBodyType !== "UNKNOWN" && extractedBodyType !== expectedBodyType) {
    return failure(
      "INSTITUTIONAL_BODY_MISMATCH",
      "O órgão identificado na convocatória não corresponde ao órgão deliberativo do perfil.",
    );
  }

  if (bodyName && similarity(bodyName, context.institution.deliberativeBody.officialName) < 0.55) {
    return failure(
      "INSTITUTIONAL_BODY_MISMATCH",
      "O nome do órgão identificado na convocatória não corresponde ao perfil institucional.",
    );
  }

  if (!texto(extraction.session.date) || !texto(extraction.session.sessionTitle)) {
    return failure(
      "MISSING_REQUIRED_SESSION_DATA",
      "A convocatória não contém dados mínimos suficientes. Confirme pelo menos o título e a data.",
    );
  }

  return undefined;
}

export function detectarDuplicadoConvocatoria(
  preview: Pick<ConvocatoriaPreview, "data" | "hora" | "orgao" | "titulo">,
  assembleias: Assembleia[],
) {
  return assembleias.find((assembleia) => {
    if (assembleia.data !== preview.data) return false;
    if (preview.hora && assembleia.hora && assembleia.hora !== preview.hora) return false;
    const orgaoScore = preview.orgao ? similarity(assembleia.orgao ?? assembleia.nome, preview.orgao) : 0;
    const tituloScore = similarity(assembleia.nome, preview.titulo);
    return orgaoScore >= 0.65 || tituloScore >= 0.7;
  });
}
