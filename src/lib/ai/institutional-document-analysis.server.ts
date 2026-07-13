import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  analiseTemTextoSuficiente,
  INSTITUTIONAL_DOCUMENT_ANALYSIS_VERSION,
  normalizarAnaliseDocumentoInstitucional,
} from "@/lib/ai/institutional-document-analysis";
import type { AnaliseDocumentoInstitucional, EstadoAnaliseDocumento } from "@/lib/types";

const inputSchema = z.object({ accessToken: z.string().min(1), documentoId: z.string().min(1) });

const systemPrompt = `Estás a analisar um documento institucional português.
Identifica apenas informação presente no documento. Não completes dados por conhecimento geral e não deduzas silenciosamente.
Distingue convocatória, ordem de trabalhos, ata, proposta, regulamento e documento financeiro.
Extrai órgão, entidade, tipo de sessão, data, hora e local. Extrai a ordem de trabalhos mantendo títulos, numeração e ordem original.
Não transformes parágrafos informativos em pontos. Marca todas as incertezas. Usa português europeu.
Devolve apenas JSON válido com: tipoDocumento, confiancaGlobal, sessao, pontosOrdemTrabalhos, informacaoRelevante, camposIncertos e resumoCompreensao.
Usa confiança entre 0 e 1. Campos ausentes devem ser omitidos, nunca inventados.`;

function env(name: string) {
  return process.env[name]?.trim();
}

function extrairTextoResposta(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const raw = payload as {
    output_text?: unknown;
    output?: Array<{ content?: Array<{ text?: unknown }> }>;
  };
  if (typeof raw.output_text === "string") return raw.output_text.trim();
  return (raw.output ?? [])
    .flatMap((item) => item.content ?? [])
    .map((item) => (typeof item.text === "string" ? item.text : ""))
    .join("")
    .trim();
}

function parseJson(text: string) {
  const clean = text
    .replace(/^```json\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  return JSON.parse(clean) as unknown;
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
    if (!supabaseUrl || !serviceRole || !apiKey)
      return {
        ok: false,
        code: "CONFIG",
        message: "A análise institucional ainda não está configurada.",
      };
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

    await supabase
      .from("documentos")
      .update({ estado_analise: "a_analisar" })
      .eq("id", data.documentoId)
      .eq("user_id", authData.user.id);
    try {
      const { data: signed, error: signedError } = await supabase.storage
        .from(documento.storage_bucket || "documentos")
        .createSignedUrl(documento.storage_path, 600);
      if (signedError || !signed.signedUrl) throw new Error("SIGNED_URL_FAILED");
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: env("OPENAI_ANALYSIS_MODEL") ?? env("OPENAI_MODEL") ?? "gpt-5-mini",
          instructions: systemPrompt,
          input: [
            {
              role: "user",
              content: [
                { type: "input_file", file_url: signed.signedUrl },
                {
                  type: "input_text",
                  text: "Analisa este PDF e devolve exclusivamente a estrutura JSON pedida.",
                },
              ],
            },
          ],
          max_output_tokens: 6000,
        }),
        signal: AbortSignal.timeout(90_000),
      });
      if (!response.ok) throw new Error("OPENAI_FAILED");
      const analise = normalizarAnaliseDocumentoInstitucional(
        parseJson(extrairTextoResposta(await response.json())),
      );
      const estado: EstadoAnaliseDocumento = analiseTemTextoSuficiente(analise)
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
      if (updateError) throw updateError;
      return { ok: true, analise, estado };
    } catch {
      await supabase
        .from("documentos")
        .update({ estado_analise: "erro" })
        .eq("id", data.documentoId)
        .eq("user_id", authData.user.id);
      return {
        ok: false,
        code: "ANALYSIS_FAILED",
        message: "Não foi possível compreender este documento. Pode tentar novamente.",
      };
    }
  });
