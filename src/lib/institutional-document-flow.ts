import { analisarDocumentoInstitucional } from "@/lib/ai/institutional-document-analysis.server";
import {
  adicionarDocumentoComUpload,
  carregarDocumentosRemotosSeDisponivel,
} from "@/lib/documentos-store";
import { carregarAssembleiasRemotasSeDisponivel } from "@/lib/assembleias-store";
import { carregarPontosRemotosSeDisponivel } from "@/lib/pontos-store";
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

const MENSAGEM_DADOS_OBRIGATORIOS = "Confirme o órgão, a data e a hora antes de preparar a sessão.";

function dataIsoValida(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [ano, mes, dia] = value.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return (
    data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia
  );
}

export function validarDadosConfirmacaoAnalise(analise: AnaliseDocumentoInstitucional) {
  const orgao = analise.sessao?.orgao?.trim() ?? "";
  const data = analise.sessao?.data?.trim() ?? "";
  const hora = analise.sessao?.hora?.trim() ?? "";
  if (!orgao || !dataIsoValida(data) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) {
    return MENSAGEM_DADOS_OBRIGATORIOS;
  }
  return undefined;
}

export function validarResultadoConfirmacaoAnalise(value: unknown): ResultadoConfirmacaoAnalise {
  if (!value || typeof value !== "object") throw new Error("CONFIRMATION_NOT_CONFIRMED");
  const result = value as Record<string, unknown>;
  const sessaoId = typeof result.sessaoId === "string" ? result.sessaoId.trim() : "";
  if (!sessaoId) throw new Error("CONFIRMATION_NOT_CONFIRMED");
  if (result.status === "duplicado") return { status: "duplicado", sessaoId };
  if (
    result.status === "confirmado" &&
    typeof result.pontosCriados === "number" &&
    Number.isInteger(result.pontosCriados) &&
    result.pontosCriados >= 0
  ) {
    return { status: "confirmado", sessaoId, pontosCriados: result.pontosCriados };
  }
  throw new Error("CONFIRMATION_NOT_CONFIRMED");
}

export async function confirmarAnaliseDocumentoComDependencias(
  confirmarRemoto: () => Promise<unknown>,
  hidratarConfirmado: () => Promise<unknown>,
) {
  const result = validarResultadoConfirmacaoAnalise(await confirmarRemoto());
  if (result.status === "confirmado") await hidratarConfirmado();
  return result;
}

export async function executarConfirmacaoAnaliseComDependencias(input: {
  confirmar: () => Promise<ResultadoConfirmacaoAnalise>;
  onDuplicado: (sessaoId: string) => void;
  onConfirmado: (
    result: Extract<ResultadoConfirmacaoAnalise, { status: "confirmado" }>,
  ) => Promise<void> | void;
}) {
  const result = await input.confirmar();
  if (result.status === "duplicado") input.onDuplicado(result.sessaoId);
  else await input.onConfirmado(result);
  return result;
}

export async function confirmarAnaliseDocumento(input: {
  documentoId: string;
  analise: AnaliseDocumentoInstitucional & { tituloSessao?: string };
  modo?: "criar" | "atualizar" | "criar_novo";
  sessaoExistenteId?: string;
}): Promise<ResultadoConfirmacaoAnalise> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("SUPABASE_NOT_CONFIGURED");
  return confirmarAnaliseDocumentoComDependencias(
    async () => {
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
      return data;
    },
    () =>
      Promise.all([
        carregarAssembleiasRemotasSeDisponivel(),
        carregarPontosRemotosSeDisponivel(),
        carregarDocumentosRemotosSeDisponivel(),
      ]),
  );
}
