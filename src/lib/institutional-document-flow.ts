import { analisarDocumentoInstitucional } from "@/lib/ai/institutional-document-analysis.server";
import {
  adicionarDocumentoComUpload,
  carregarDocumentosRemotosSeDisponivel,
} from "@/lib/documentos-store";
import { getSupabaseClient, withSupabaseTimeout } from "@/lib/supabase";
import type { AnaliseDocumentoInstitucional } from "@/lib/types";

async function accessToken() {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("SUPABASE_NOT_CONFIGURED");
  const { data, error } = await withSupabaseTimeout(supabase.auth.getSession(), "WOW_AUTH");
  if (error || !data.session?.access_token) throw new Error("AUTH_REQUIRED");
  return data.session.access_token;
}

export async function carregarDocumentoParaAnalise(file: File) {
  return carregarDocumentoParaAnaliseComDependencias(file, adicionarDocumentoComUpload);
}

/** @internal Permite testar a entrada sem repetir upload nem tocar no Storage real. */
export async function carregarDocumentoParaAnaliseComDependencias(
  file: File,
  upload: typeof adicionarDocumentoComUpload,
) {
  return upload({
    assembleiaId: "biblioteca",
    titulo: file.name.replace(/\.pdf$/i, "").trim() || "Documento institucional",
    tipo: "Outro",
    data: new Date().toISOString().slice(0, 10),
    estado: "Por rever",
    estadoAnalise: "a_analisar",
    ficheiro: file,
  });
}

export async function analisarDocumentoCarregado(documentoId: string) {
  const result = await analisarDocumentoInstitucional({
    data: { accessToken: await accessToken(), documentoId },
  });
  if (!result.ok) throw Object.assign(new Error(result.message), { code: result.code });
  await carregarDocumentosRemotosSeDisponivel();
  return result;
}

export type ResultadoConfirmacaoAnalise =
  | { status: "confirmado"; sessaoId: string; pontosCriados: number }
  | { status: "duplicado"; sessaoId: string };

export async function confirmarAnaliseDocumento(input: {
  documentoId: string;
  analise: AnaliseDocumentoInstitucional & { tituloSessao?: string };
  modo?: "criar" | "atualizar" | "criar_novo";
  sessaoExistenteId?: string;
}): Promise<ResultadoConfirmacaoAnalise> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("SUPABASE_NOT_CONFIGURED");
  const { data, error } = await withSupabaseTimeout(
    supabase.rpc("confirmar_analise_documento_sessao", {
      p_documento_id: input.documentoId,
      p_analise: input.analise,
      p_modo: input.modo ?? "criar",
      p_sessao_existente_id: input.sessaoExistenteId ?? null,
    }),
    "WOW_CONFIRM",
    20000,
  );
  if (error) throw error;
  if (!data || typeof data !== "object") throw new Error("CONFIRMATION_NOT_CONFIRMED");
  return data as ResultadoConfirmacaoAnalise;
}
