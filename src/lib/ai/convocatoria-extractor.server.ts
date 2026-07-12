import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { construirBaseJuridicaInstitucional } from "@/lib/ai/legal-basis";
import { resolveInstitutionalContext } from "@/lib/ai/institutional-context";
import type { PerfilInstitucionalContexto } from "@/lib/ai/types";
import type {
  ConvocatoriaAnalysisResult,
  ConvocatoriaExtractionResult,
} from "@/lib/ai/convocatoria-types";
import {
  CONVOCATORIA_MAX_FILE_SIZE,
  construirPreviewConvocatoria,
  validarExtracaoConvocatoria,
} from "@/lib/ai/convocatoria-validator";

type ProfileRow = {
  nome_institucional: string | null;
  cargo: string | null;
  orgao: string | null;
  organizacao: string | null;
  territorio: string | null;
  municipio: string | null;
  freguesia: string | null;
  assinatura_institucional: string | null;
};

const inputSchema = z.object({
  userId: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.literal("application/pdf"),
  fileSize: z.number().int().positive().max(CONVOCATORIA_MAX_FILE_SIZE),
  fileBase64: z.string().min(100),
});

function env(name: string) {
  return process.env[name]?.trim();
}

function idSeguro(id: string) {
  return id.replace(/[(),]/g, "").trim();
}

async function supabaseSelect<T>(table: string, params: Record<string, string>) {
  const supabaseUrl = env("SUPABASE_URL") ?? env("VITE_SUPABASE_URL");
  const serviceRole = env("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRole) {
    throw new Error("SUPABASE_SERVER_CONFIG_MISSING");
  }

  const url = new URL(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/${table}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url.toString(), {
    headers: {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "Erro desconhecido.");
    throw new Error(`SUPABASE_SELECT_${table}: ${detail}`);
  }

  return (await response.json()) as T[];
}

function construirPerfil(row?: ProfileRow): PerfilInstitucionalContexto {
  return {
    nome: row?.nome_institucional?.trim() || "Nome não indicado",
    cargo: row?.cargo?.trim() || "Cargo não indicado",
    orgao: row?.orgao?.trim() || "Órgão não indicado",
    organizacao: row?.organizacao?.trim() || "Organização não indicada",
    territorio: row?.territorio?.trim() || undefined,
    municipio: row?.municipio?.trim() || undefined,
    freguesia: row?.freguesia?.trim() || undefined,
    assinatura: row?.assinatura_institucional?.trim() || undefined,
    partido: undefined,
  };
}

function extrairTextoRespostaOpenAi(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const raw = payload as { output_text?: unknown; output?: unknown };
  if (typeof raw.output_text === "string") return raw.output_text.trim();

  if (!Array.isArray(raw.output)) return "";
  return raw.output
    .flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const content = (item as { content?: unknown }).content;
      if (!Array.isArray(content)) return [];
      return content.flatMap((part) => {
        if (!part || typeof part !== "object") return [];
        const text = (part as { text?: unknown }).text;
        return typeof text === "string" ? [text] : [];
      });
    })
    .join("\n")
    .trim();
}

function parseJsonObject(text: string) {
  const trimmed = text.trim();
  const clean = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("JSON_NOT_FOUND");
  return JSON.parse(clean.slice(start, end + 1)) as unknown;
}

function extractionSchema() {
  return z.object({
    documentClassification: z.object({
      isConvocatoria: z.boolean(),
      confidence: z.number().min(0).max(1).catch(0),
      detectedDocumentType: z.string().optional(),
      reason: z.string().optional(),
    }),
    session: z.object({
      bodyName: z.string().optional(),
      bodyType: z
        .enum([
          "PARISH_ASSEMBLY",
          "MUNICIPAL_ASSEMBLY",
          "PARISH_EXECUTIVE",
          "MUNICIPAL_EXECUTIVE",
          "UNKNOWN",
        ])
        .optional(),
      sessionType: z.enum(["ORDINARY", "EXTRAORDINARY", "OTHER", "UNKNOWN"]).optional(),
      sessionTitle: z.string().optional(),
      sessionNumber: z.string().optional(),
      date: z.string().optional(),
      time: z.string().optional(),
      location: z.string().optional(),
      conveningAuthority: z.string().optional(),
    }),
    agendaItems: z
      .array(
        z.object({
          order: z.number().int().positive().catch(1),
          title: z.string(),
          description: z.string().optional(),
          originalText: z.string().optional(),
        }),
      )
      .catch([]),
    observations: z.array(z.string()).optional(),
    fieldConfidence: z
      .object({
        body: z.number().min(0).max(1).optional(),
        sessionType: z.number().min(0).max(1).optional(),
        date: z.number().min(0).max(1).optional(),
        time: z.number().min(0).max(1).optional(),
        location: z.number().min(0).max(1).optional(),
        agendaItems: z.number().min(0).max(1).optional(),
      })
      .catch({}),
    extractionWarnings: z.array(z.string()).optional(),
  });
}

function promptExtracao(contexto: {
  orgaoDeliberativo: string;
  orgaoExecutivo: string;
  municipio: string;
  freguesia?: string;
}) {
  return `Extrai dados estruturados deste PDF.

Regras obrigatórias:
- O documento tem de parecer uma convocatória para reunião/sessão de órgão autárquico.
- Extrai apenas informação presente no PDF.
- Não inventes campos em falta.
- Não corrijas o órgão por iniciativa própria.
- Não acrescentes legislação.
- Não confundas assinaturas, rodapés, contactos ou anexos com pontos da ordem de trabalhos.
- Normaliza datas para YYYY-MM-DD e horas para HH:mm, apenas se estiverem claras.
- Preserva o texto original dos pontos em originalText sempre que possível.
- Devolve exclusivamente JSON válido, sem markdown.

Contexto institucional conhecido pelo Tribuno para validação posterior:
- Órgão deliberativo do utilizador: ${contexto.orgaoDeliberativo}
- Executivo correspondente: ${contexto.orgaoExecutivo}
- Município: ${contexto.municipio}
${contexto.freguesia ? `- Freguesia: ${contexto.freguesia}` : ""}

Schema esperado:
{
  "documentClassification": {
    "isConvocatoria": true,
    "confidence": 0.0,
    "detectedDocumentType": "string",
    "reason": "string"
  },
  "session": {
    "bodyName": "string",
    "bodyType": "PARISH_ASSEMBLY | MUNICIPAL_ASSEMBLY | PARISH_EXECUTIVE | MUNICIPAL_EXECUTIVE | UNKNOWN",
    "sessionType": "ORDINARY | EXTRAORDINARY | OTHER | UNKNOWN",
    "sessionTitle": "string",
    "sessionNumber": "string",
    "date": "YYYY-MM-DD",
    "time": "HH:mm",
    "location": "string",
    "conveningAuthority": "string"
  },
  "agendaItems": [
    { "order": 1, "title": "string", "description": "string", "originalText": "string" }
  ],
  "observations": ["string"],
  "fieldConfidence": {
    "body": 0.0,
    "sessionType": 0.0,
    "date": 0.0,
    "time": 0.0,
    "location": 0.0,
    "agendaItems": 0.0
  },
  "extractionWarnings": ["string"]
}`;
}

async function analisarPdfComOpenAi(input: {
  fileName: string;
  fileBase64: string;
  prompt: string;
}): Promise<ConvocatoriaExtractionResult> {
  const apiKey = env("OPENAI_API_KEY");
  const model = env("OPENAI_MODEL") || "gpt-5-mini";
  if (!apiKey) throw new Error("AI_CONFIG_MISSING");

  const payload = {
    model,
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: input.prompt },
          {
            type: "input_file",
            filename: input.fileName,
            file_data: `data:application/pdf;base64,${input.fileBase64}`,
          },
        ],
      },
    ],
    max_output_tokens: 4096,
  };

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const body = (await response.json().catch(() => undefined)) as unknown;
  if (!response.ok) {
    throw new Error(`AI_PROVIDER_ERROR_${response.status}`);
  }

  const text = extrairTextoRespostaOpenAi(body);
  if (!text) throw new Error("PDF_TEXT_UNAVAILABLE");

  return extractionSchema().parse(parseJsonObject(text));
}

export const analisarConvocatoriaPdf = createServerFn({ method: "POST" })
  .validator((input) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<ConvocatoriaAnalysisResult> => {
    try {
      const profiles = await supabaseSelect<ProfileRow>("profiles", {
        select:
          "nome_institucional,cargo,orgao,organizacao,territorio,municipio,freguesia,assinatura_institucional",
        user_id: `eq.${idSeguro(data.userId)}`,
        limit: "1",
      });
      const perfil = construirPerfil(profiles[0]);
      const baseJuridica = construirBaseJuridicaInstitucional({
        perfil,
        tipoDocumental: "Outro documento",
      });
      const institutionalContext = resolveInstitutionalContext({
        electedOfficialId: idSeguro(data.userId),
        perfil,
        tipoDocumental: "Outro documento",
        baseJuridica,
      });

      if (!institutionalContext.validation.valid) {
        return {
          ok: false,
          code: "INSTITUTIONAL_PROFILE_INCOMPLETE",
          message:
            "Complete o perfil institucional antes de criar sessões por convocatória.",
          warnings: institutionalContext.validation.errors.map((error) => error.message),
        };
      }

      const extraction = await analisarPdfComOpenAi({
        fileName: data.fileName,
        fileBase64: data.fileBase64,
        prompt: promptExtracao({
          orgaoDeliberativo: institutionalContext.institution.deliberativeBody.officialName,
          orgaoExecutivo: institutionalContext.institution.executiveBody.officialName,
          municipio: institutionalContext.territory.municipalityName,
          freguesia: institutionalContext.territory.parishName,
        }),
      });

      const validationError = validarExtracaoConvocatoria(extraction, institutionalContext);
      if (validationError) return validationError;

      return {
        ok: true,
        extraction,
        preview: construirPreviewConvocatoria(extraction, institutionalContext),
        institutionalContext,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido.";
      if (message === "PDF_TEXT_UNAVAILABLE") {
        return {
          ok: false,
          code: "PDF_TEXT_UNAVAILABLE",
          message:
            "Não foi possível ler esta convocatória. Confirme se o PDF contém texto legível ou introduza a sessão manualmente.",
        };
      }
      return {
        ok: false,
        code: "EXTRACTION_FAILED",
        message: "Não foi possível analisar a convocatória. Tente novamente ou crie a sessão manualmente.",
      };
    }
  });
