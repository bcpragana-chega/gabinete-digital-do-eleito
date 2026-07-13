import { z } from "zod";
import type { AnaliseDocumentoInstitucional } from "@/lib/types";

export const VISUAL_ANALYSIS_MODELS = new Set([
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4.1",
  "gpt-4.1-mini",
  "gpt-4.1-nano",
  "gpt-5",
  "gpt-5-mini",
  "gpt-5-nano",
  "gpt-5.1",
  "gpt-5.2",
  "gpt-5.4",
  "gpt-5.4-mini",
  "gpt-5.4-nano",
  "gpt-5.5",
  "gpt-5.6",
  "gpt-5.6-sol",
  "gpt-5.6-terra",
  "gpt-5.6-luna",
]);

export type InstitutionalAnalysisErrorCode =
  | "OPENAI_HTTP_ERROR"
  | "OPENAI_EMPTY_RESPONSE"
  | "OPENAI_REFUSAL"
  | "OPENAI_INVALID_JSON"
  | "OPENAI_SCHEMA_INVALID"
  | "MODEL_NOT_VISION_CAPABLE"
  | "STORAGE_SIGNED_URL_FAILED"
  | "ANALYSIS_PERSIST_FAILED";

export class InstitutionalAnalysisError extends Error {
  constructor(
    readonly code: InstitutionalAnalysisErrorCode,
    message: string,
    readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "InstitutionalAnalysisError";
  }
}

export function validarModeloAnaliseVisual(modelo: string) {
  const normalizado = modelo.trim().toLowerCase();
  if (!VISUAL_ANALYSIS_MODELS.has(normalizado)) {
    throw new InstitutionalAnalysisError(
      "MODEL_NOT_VISION_CAPABLE",
      "A análise visual de documentos ainda não está configurada.",
      { model: normalizado || "missing" },
    );
  }
  return normalizado;
}

export function criarInputFilePdfVisual(fileUrl: string) {
  return { type: "input_file" as const, file_url: fileUrl, detail: "high" as const };
}

type OpenAIResponseTextResult =
  | { kind: "text"; text: string }
  | { kind: "refusal" }
  | { kind: "empty" };

function mensagemTemRecusa(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(mensagemTemRecusa);
  if (!value || typeof value !== "object") return false;
  const object = value as Record<string, unknown>;
  if (object.type === "refusal") return true;
  if (typeof object.refusal === "string" && object.refusal.trim()) return true;
  return Object.entries(object).some(
    ([key, nested]) => key !== "text" && key !== "reasoning" && mensagemTemRecusa(nested),
  );
}

function recolherTextoMensagem(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(recolherTextoMensagem);
  if (!value || typeof value !== "object") return [];
  const object = value as Record<string, unknown>;
  if (object.type === "refusal" || object.type === "reasoning") return [];
  const result: string[] = [];
  if (typeof object.text === "string" && object.text.trim()) result.push(object.text);
  for (const [key, nested] of Object.entries(object)) {
    if (key === "text" || key === "refusal" || key === "reasoning" || key === "type") continue;
    result.push(...recolherTextoMensagem(nested));
  }
  return result;
}

export function extrairTextoRespostaOpenAI(payload: unknown): OpenAIResponseTextResult {
  if (!payload || typeof payload !== "object") return { kind: "empty" };
  const raw = payload as { output_text?: unknown; output?: unknown };
  if (Array.isArray(raw.output)) {
    const messages = raw.output.filter((item): item is Record<string, unknown> =>
      Boolean(
        item && typeof item === "object" && (item as Record<string, unknown>).type === "message",
      ),
    );
    if (messages.some((message) => mensagemTemRecusa(message.content))) return { kind: "refusal" };
    const nestedText = messages.flatMap((message) => recolherTextoMensagem(message.content));
    if (nestedText.length) return { kind: "text", text: nestedText.join("\n").trim() };
  }
  if (typeof raw.output_text === "string" && raw.output_text.trim())
    return { kind: "text", text: raw.output_text.trim() };
  return { kind: "empty" };
}

export const INSTITUTIONAL_ANALYSIS_RESPONSE_FORMAT = {
  type: "json_schema" as const,
  name: "analise_documento_institucional",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "tipoDocumento",
      "confiancaGlobal",
      "sessao",
      "pontosOrdemTrabalhos",
      "informacaoRelevante",
      "camposIncertos",
      "resumoCompreensao",
    ],
    properties: {
      tipoDocumento: {
        type: "string",
        enum: [
          "convocatoria",
          "ordem_trabalhos",
          "ata",
          "documento_financeiro",
          "proposta",
          "regulamento",
          "outro",
          "desconhecido",
        ],
      },
      confiancaGlobal: { type: "number", minimum: 0, maximum: 1 },
      sessao: {
        anyOf: [
          {
            type: "object",
            additionalProperties: false,
            required: ["orgao", "entidade", "tipo", "data", "hora", "local"],
            properties: {
              orgao: { type: ["string", "null"] },
              entidade: { type: ["string", "null"] },
              tipo: { type: "string", enum: ["ordinaria", "extraordinaria", "desconhecida"] },
              data: { type: ["string", "null"] },
              hora: { type: ["string", "null"] },
              local: { type: ["string", "null"] },
            },
          },
          { type: "null" },
        ],
      },
      pontosOrdemTrabalhos: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["numero", "titulo", "descricao", "confianca"],
          properties: {
            numero: { type: ["integer", "null"], minimum: 1 },
            titulo: { type: "string" },
            descricao: { type: ["string", "null"] },
            confianca: { type: "number", minimum: 0, maximum: 1 },
          },
        },
      },
      informacaoRelevante: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["titulo", "descricao", "referenciaDocumento"],
          properties: {
            titulo: { type: "string" },
            descricao: { type: "string" },
            referenciaDocumento: { type: ["string", "null"] },
          },
        },
      },
      camposIncertos: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["campo", "motivo"],
          properties: { campo: { type: "string" }, motivo: { type: "string" } },
        },
      },
      resumoCompreensao: { type: "string" },
    },
  },
};

export function criarDiagnosticoRespostaSeguro(input: {
  code: InstitutionalAnalysisErrorCode;
  documentId: string;
  model?: string;
  httpStatus?: number;
  requestId?: string | null;
  payload?: unknown;
}) {
  const payload =
    input.payload && typeof input.payload === "object"
      ? (input.payload as {
          id?: unknown;
          status?: unknown;
          incomplete_details?: { reason?: unknown };
          output?: Array<{ type?: unknown; content?: unknown }>;
          output_text?: unknown;
        })
      : undefined;
  return {
    code: input.code,
    documentId: input.documentId.slice(0, 8),
    model: input.model,
    httpStatus: input.httpStatus,
    requestId: input.requestId ?? undefined,
    responseId: typeof payload?.id === "string" ? payload.id : undefined,
    responseStatus: typeof payload?.status === "string" ? payload.status : undefined,
    incompleteReason:
      typeof payload?.incomplete_details?.reason === "string"
        ? payload.incomplete_details.reason
        : undefined,
    outputTypes: (payload?.output ?? []).map((item) => {
      const content = Array.isArray(item.content) ? item.content : [];
      return {
        type: typeof item.type === "string" ? item.type : "unknown",
        content: content.map((entry) => {
          const value =
            entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
          const texts = recolherTextoMensagem(value);
          return {
            type: typeof value.type === "string" ? value.type : "unknown",
            hasText: texts.length > 0,
            textLength: texts.reduce((total, text) => total + text.length, 0),
            hasRefusal: mensagemTemRecusa(value),
          };
        }),
      };
    }),
    hasOutputText: extrairTextoRespostaOpenAI(payload).kind === "text",
    outputTextLength: (() => {
      const extracted = extrairTextoRespostaOpenAI(payload);
      return extracted.kind === "text" ? extracted.text.length : undefined;
    })(),
    hasRefusal: extrairTextoRespostaOpenAI(payload).kind === "refusal",
  };
}

export const INSTITUTIONAL_ANALYSIS_SYSTEM_PROMPT = `Estás a analisar um documento institucional português.
O documento pode ser uma digitalização sem camada de texto. Quando não existir texto extraível, analisa visualmente as imagens de todas as páginas.
Lê cabeçalhos, corpo, rodapé, datas, horas, locais, listas numeradas e letra pequena com atenção.
Preserva exatamente a ordem e a hierarquia dos pontos. Distingue períodos institucionais, subpontos e pontos do período da ordem do dia.
Não ignores conteúdo apenas porque não existe camada de texto.
Identifica apenas informação presente no documento. Não completes dados por conhecimento geral e não deduzas silenciosamente.
Distingue convocatória, ordem de trabalhos, ata, proposta, regulamento e documento financeiro.
Extrai órgão, entidade, tipo de sessão, data, hora e local.
Não transformes parágrafos informativos em pontos. Não inventes campos ilegíveis; marca qualquer campo visualmente ambíguo como incerto.
Usa português europeu e devolve apenas JSON válido com: tipoDocumento, confiancaGlobal, sessao, pontosOrdemTrabalhos, informacaoRelevante, camposIncertos e resumoCompreensao.
Usa confiança entre 0 e 1. Campos ausentes devem ser omitidos, nunca inventados.`;

export const INSTITUTIONAL_ANALYSIS_USER_PROMPT =
  "Este PDF pode ser uma digitalização sem camada de texto. Analisa também visualmente todas as páginas com detalhe elevado. Não concluas que está vazio apenas por não existir texto extraível. Devolve exclusivamente a estrutura JSON pedida.";

export const MAX_VISUAL_FALLBACK_PAGES = 5;

export async function executarAnaliseComFallback<T>(input: {
  analisarPdf: () => Promise<T>;
  analisarImagens?: () => Promise<T>;
}) {
  try {
    return { value: await input.analisarPdf(), tentativa: "pdf" as const };
  } catch (primaryError) {
    if (!input.analisarImagens) throw primaryError;
    return { value: await input.analisarImagens(), tentativa: "imagens" as const };
  }
}

const textoOpcional = z.preprocess(
  (value) => (value === null ? undefined : value),
  z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => v || undefined),
);
const confianca = z.number().finite().min(0).max(1);

export const analiseDocumentoInstitucionalSchema = z.object({
  tipoDocumento: z
    .enum([
      "convocatoria",
      "ordem_trabalhos",
      "ata",
      "documento_financeiro",
      "proposta",
      "regulamento",
      "outro",
      "desconhecido",
    ])
    .catch("desconhecido"),
  confiancaGlobal: confianca,
  sessao: z.preprocess(
    (value) => (value === null ? undefined : value),
    z
      .object({
        orgao: textoOpcional,
        entidade: textoOpcional,
        tipo: z.enum(["ordinaria", "extraordinaria", "desconhecida"]).catch("desconhecida"),
        data: z
          .string()
          .trim()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .catch(undefined),
        hora: z
          .string()
          .trim()
          .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
          .optional()
          .catch(undefined),
        local: textoOpcional,
      })
      .optional(),
  ),
  pontosOrdemTrabalhos: z
    .array(
      z.object({
        numero: z.preprocess(
          (value) => (value === null ? undefined : value),
          z.number().int().positive().optional(),
        ),
        titulo: z.string().trim().min(1).max(500),
        descricao: z
          .string()
          .trim()
          .max(4000)
          .optional()
          .transform((v) => v || undefined),
        confianca,
      }),
    )
    .max(100)
    .default([]),
  informacaoRelevante: z
    .array(
      z.object({
        titulo: z.string().trim().min(1).max(500),
        descricao: z.string().trim().min(1).max(4000),
        referenciaDocumento: textoOpcional,
      }),
    )
    .max(50)
    .default([]),
  camposIncertos: z
    .array(
      z.object({
        campo: z.string().trim().min(1).max(200),
        motivo: z.string().trim().min(1).max(1000),
      }),
    )
    .max(50)
    .default([]),
  resumoCompreensao: z.string().trim().max(4000).default(""),
});

export function normalizarAnaliseDocumentoInstitucional(
  value: unknown,
): AnaliseDocumentoInstitucional {
  const parsed = analiseDocumentoInstitucionalSchema.parse(value);
  return {
    ...parsed,
    pontosOrdemTrabalhos: parsed.pontosOrdemTrabalhos.map((ponto, index) => ({
      ...ponto,
      numero: ponto.numero ?? index + 1,
    })),
  };
}

export function analiseTemTextoSuficiente(analise: AnaliseDocumentoInstitucional) {
  return Boolean(
    analise.resumoCompreensao || analise.sessao?.orgao || analise.pontosOrdemTrabalhos.length,
  );
}

export const INSTITUTIONAL_DOCUMENT_ANALYSIS_VERSION = 1;
