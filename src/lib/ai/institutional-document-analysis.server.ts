import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  analiseTemTextoSuficiente,
  analiseDocumentoInstitucionalSchema,
  criarDiagnosticoRespostaSeguro,
  criarDiagnosticoIssuesZod,
  criarInputFilePdfVisual,
  executarAnaliseComFallback,
  extrairTextoRespostaOpenAI,
  INSTITUTIONAL_DOCUMENT_ANALYSIS_VERSION,
  INSTITUTIONAL_ANALYSIS_RESPONSE_FORMAT,
  INSTITUTIONAL_ANALYSIS_SYSTEM_PROMPT,
  INSTITUTIONAL_ANALYSIS_USER_PROMPT,
  InstitutionalAnalysisError,
  normalizarAnaliseDocumentoInstitucional,
  validarModeloAnaliseVisual,
} from "@/lib/ai/institutional-document-analysis";
import type { AnaliseDocumentoInstitucional, EstadoAnaliseDocumento } from "@/lib/types";

const inputSchema = z.object({ accessToken: z.string().min(1), documentoId: z.string().min(1) });

function env(name: string) {
  return process.env[name]?.trim();
}

function parseJson(text: string) {
  const clean = text
    .replace(/^```json\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    return JSON.parse(clean) as unknown;
  } catch {
    throw new InstitutionalAnalysisError(
      "OPENAI_INVALID_JSON",
      "A resposta da análise não contém JSON válido.",
    );
  }
}

function mensagemErroAnalise(error: unknown) {
  if (!(error instanceof InstitutionalAnalysisError))
    return {
      code: "ANALYSIS_FAILED",
      message: "Não foi possível compreender este documento. Pode tentar novamente.",
    };
  if (error.code === "MODEL_NOT_VISION_CAPABLE")
    return { code: error.code, message: error.message };
  if (error.code === "STORAGE_SIGNED_URL_FAILED")
    return {
      code: error.code,
      message: "Não foi possível abrir o PDF para análise. Pode tentar novamente.",
    };
  if (error.code === "ANALYSIS_PERSIST_FAILED")
    return {
      code: error.code,
      message: "A análise terminou, mas não foi possível guardá-la. Pode tentar novamente.",
    };
  return {
    code: error.code,
    message: "Não foi possível compreender este documento. Pode tentar novamente.",
  };
}

export type ResultadoAnaliseInstitucional =
  | { ok: true; analise: AnaliseDocumentoInstitucional; estado: EstadoAnaliseDocumento }
  | { ok: false; code: string; message: string };

export const analisarDocumentoInstitucional = createServerFn({ method: "POST" })
  .validator((input) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<ResultadoAnaliseInstitucional> => {
    const supabaseUrl = env("SUPABASE_URL") ?? env("VITE_SUPABASE_URL");
    const serviceRole = env("SUPABASE_SERVICE_ROLE_KEY");
    const apiKey = env("OPENAI_API_KEY");
    const configuredModel = env("OPENAI_ANALYSIS_MODEL") ?? env("OPENAI_MODEL");
    if (!supabaseUrl || !serviceRole || !apiKey || !configuredModel)
      return {
        ok: false,
        code: "CONFIG",
        message: "A análise institucional ainda não está configurada.",
      };
    let model: string;
    try {
      model = validarModeloAnaliseVisual(configuredModel);
    } catch (error) {
      return { ok: false, ...mensagemErroAnalise(error) };
    }
    const supabase = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
    const { data: authData, error: authError } = await supabase.auth.getUser(data.accessToken);
    if (authError || !authData.user)
      return { ok: false, code: "AUTH", message: "A sessão expirou. Inicie sessão novamente." };

    const { data: documento, error } = await supabase
      .from("documentos")
      .select("id,user_id,storage_bucket,storage_path,estado_analise")
      .eq("id", data.documentoId)
      .eq("user_id", authData.user.id)
      .maybeSingle();
    if (error || !documento)
      return { ok: false, code: "NOT_FOUND", message: "O documento não está disponível." };
    if (!documento.storage_path)
      return {
        ok: false,
        code: "NO_FILE",
        message: "Este documento não contém um PDF para analisar.",
      };

    const { error: analysingStateError } = await supabase
      .from("documentos")
      .update({ estado_analise: "a_analisar" })
      .eq("id", data.documentoId)
      .eq("user_id", authData.user.id);
    if (analysingStateError)
      return {
        ok: false,
        code: "ANALYSIS_PERSIST_FAILED",
        message: "Não foi possível iniciar e guardar a análise. Pode tentar novamente.",
      };
    try {
      const { data: signed, error: signedError } = await supabase.storage
        .from(documento.storage_bucket || "documentos")
        .createSignedUrl(documento.storage_path, 600);
      if (signedError || !signed.signedUrl)
        throw new InstitutionalAnalysisError(
          "STORAGE_SIGNED_URL_FAILED",
          "Não foi possível criar um acesso temporário ao PDF.",
        );
      const { value: analise } = await executarAnaliseComFallback({
        analisarPdf: async () => {
          const response = await fetch("https://api.openai.com/v1/responses", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model,
              instructions: INSTITUTIONAL_ANALYSIS_SYSTEM_PROMPT,
              input: [
                {
                  role: "user",
                  content: [
                    criarInputFilePdfVisual(signed.signedUrl),
                    { type: "input_text", text: INSTITUTIONAL_ANALYSIS_USER_PROMPT },
                  ],
                },
              ],
              text: { format: INSTITUTIONAL_ANALYSIS_RESPONSE_FORMAT },
              max_output_tokens: 6000,
            }),
            signal: AbortSignal.timeout(90_000),
          });
          const payload: unknown = await response.json().catch(() => undefined);
          if (!response.ok) {
            const error = new InstitutionalAnalysisError(
              "OPENAI_HTTP_ERROR",
              "A API de análise devolveu um erro.",
              criarDiagnosticoRespostaSeguro({
                code: "OPENAI_HTTP_ERROR",
                documentId: data.documentoId,
                model,
                httpStatus: response.status,
                requestId: response.headers.get("x-request-id"),
                payload,
              }),
            );
            throw error;
          }
          const extracted = extrairTextoRespostaOpenAI(payload);
          if (extracted.kind === "refusal")
            throw new InstitutionalAnalysisError(
              "OPENAI_REFUSAL",
              "O modelo recusou analisar este documento.",
              criarDiagnosticoRespostaSeguro({
                code: "OPENAI_REFUSAL",
                documentId: data.documentoId,
                model,
                httpStatus: response.status,
                requestId: response.headers.get("x-request-id"),
                payload,
              }),
            );
          if (extracted.kind === "empty")
            throw new InstitutionalAnalysisError(
              "OPENAI_EMPTY_RESPONSE",
              "A API de análise não devolveu conteúdo.",
              criarDiagnosticoRespostaSeguro({
                code: "OPENAI_EMPTY_RESPONSE",
                documentId: data.documentoId,
                model,
                httpStatus: response.status,
                requestId: response.headers.get("x-request-id"),
                payload,
              }),
            );
          const json = parseJson(extracted.text);
          const schemaResult = analiseDocumentoInstitucionalSchema.safeParse(json);
          if (!schemaResult.success)
            throw new InstitutionalAnalysisError(
              "OPENAI_SCHEMA_INVALID",
              "A resposta da análise não respeita a estrutura esperada.",
              {
                ...criarDiagnosticoRespostaSeguro({
                  code: "OPENAI_SCHEMA_INVALID",
                  documentId: data.documentoId,
                  model,
                  httpStatus: response.status,
                  requestId: response.headers.get("x-request-id"),
                  payload,
                }),
                ...criarDiagnosticoIssuesZod(schemaResult.error.issues),
              },
            );
          return normalizarAnaliseDocumentoInstitucional(schemaResult.data);
        },
      });
      const estado: EstadoAnaliseDocumento =
        analiseTemTextoSuficiente(analise) && analise.camposIncertos.length === 0
          ? "analisado"
          : "necessita_confirmacao";
      const agora = new Date().toISOString();
      const { error: updateError } = await supabase
        .from("documentos")
        .update({
          estado_analise: estado,
          analise_institucional: analise,
          analise_institucional_em: agora,
          analise_institucional_versao: INSTITUTIONAL_DOCUMENT_ANALYSIS_VERSION,
        })
        .eq("id", data.documentoId)
        .eq("user_id", authData.user.id);
      if (updateError)
        throw new InstitutionalAnalysisError(
          "ANALYSIS_PERSIST_FAILED",
          "Não foi possível guardar a análise.",
        );
      return { ok: true, analise, estado };
    } catch (error) {
      const safeError = mensagemErroAnalise(error);
      const context =
        error instanceof InstitutionalAnalysisError
          ? (error.context ??
            criarDiagnosticoRespostaSeguro({
              code: error.code,
              documentId: data.documentoId,
              model,
            }))
          : { documentId: data.documentoId.slice(0, 8), model };
      console.error("institutional_document_analysis_failed", { ...safeError, ...context });
      await supabase
        .from("documentos")
        .update({ estado_analise: "erro" })
        .eq("id", data.documentoId)
        .eq("user_id", authData.user.id);
      return { ok: false, ...safeError };
    }
  });
