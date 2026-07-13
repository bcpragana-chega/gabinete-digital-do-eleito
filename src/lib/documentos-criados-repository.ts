import { getSupabaseClient, isSupabaseConfigured, withSupabaseTimeout } from "@/lib/supabase";
import type { DocumentoCriado, EstadoDocumentoCriado, TipoDocumentoCriado } from "@/lib/types";
import {
  guardarJSONParaUtilizador,
  guardarJSONPorUtilizador,
  lerJSONParaUtilizador,
  lerJSONPorUtilizador,
} from "@/lib/user-storage";

const STORAGE_KEY = "tribuno:documentos-a-criar";

type EstadoDocumentoCriadoRemoto =
  | "rascunho"
  | "em_revisao"
  | "final"
  | "pronto"
  | "apresentado"
  | "arquivado";

type TipoDocumentoCriadoRemoto =
  | "mocao"
  | "recomendacao"
  | "requerimento"
  | "declaracao_voto"
  | "intervencao"
  | "outro_documento";

export type DocumentoCriadoRow = {
  id: string;
  user_id: string;
  titulo: string;
  tipo: TipoDocumentoCriadoRemoto;
  estado: EstadoDocumentoCriadoRemoto;
  conteudo: string | null;
  conteudo_json: unknown | null;
  formato_conteudo: string;
  resumo: string | null;
  notas: string | null;
  tags: string[] | null;
  origem: string;
  origem_prompt: string | null;
  ia_modelo: string | null;
  ia_metadata: unknown | null;
  assunto_id: string | null;
  assembleia_id: string | null;
  ponto_id: string | null;
  documento_final_id: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  finalizado_em: string | null;
  apresentado_em: string | null;
};

function textoSeguro(valor: unknown) {
  return typeof valor === "string" ? valor.trim() : "";
}

function tipoParaRemoto(tipo: TipoDocumentoCriado): TipoDocumentoCriadoRemoto {
  if (tipo === "Moção") return "mocao";
  if (tipo === "Recomendação") return "recomendacao";
  if (tipo === "Requerimento") return "requerimento";
  if (tipo === "Declaração de voto") return "declaracao_voto";
  if (tipo === "Intervenção") return "intervencao";
  return "outro_documento";
}

function tipoDeRemoto(tipo: unknown): TipoDocumentoCriado {
  if (tipo === "mocao") return "Moção";
  if (tipo === "recomendacao") return "Recomendação";
  if (tipo === "requerimento") return "Requerimento";
  if (tipo === "declaracao_voto") return "Declaração de voto";
  if (tipo === "intervencao") return "Intervenção";
  return "Outro documento";
}

function estadoParaRemoto(estado: EstadoDocumentoCriado): EstadoDocumentoCriadoRemoto {
  if (estado === "em revisão") return "em_revisao";
  return estado;
}

function estadoDeRemoto(estado: unknown): EstadoDocumentoCriado {
  if (estado === "em_revisao") return "em revisão";
  if (
    estado === "rascunho" ||
    estado === "final" ||
    estado === "pronto" ||
    estado === "apresentado" ||
    estado === "arquivado"
  ) {
    return estado;
  }

  return "rascunho";
}

/** @internal Mapeamento canónico da linha confirmada pelo Supabase. */
export function mapearDocumentoCriadoRemoto(row: DocumentoCriadoRow): DocumentoCriado {
  return {
    id: row.id,
    tipo: tipoDeRemoto(row.tipo),
    titulo: textoSeguro(row.titulo),
    conteudo: row.conteudo ?? "",
    conteudoJson: row.conteudo_json ?? undefined,
    formatoConteudo: textoSeguro(row.formato_conteudo) || "plain_text",
    resumo: textoSeguro(row.resumo) || undefined,
    notas: textoSeguro(row.notas) || undefined,
    tags: Array.isArray(row.tags) ? row.tags : [],
    origem: textoSeguro(row.origem) || "manual",
    origemPrompt: textoSeguro(row.origem_prompt) || undefined,
    iaModelo: textoSeguro(row.ia_modelo) || undefined,
    iaMetadata: row.ia_metadata ?? undefined,
    assuntoId: row.assunto_id ?? undefined,
    assembleiaId: row.assembleia_id ?? undefined,
    pontoId: row.ponto_id ?? undefined,
    documentoFinalId: row.documento_final_id ?? undefined,
    estado: estadoDeRemoto(row.estado),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at ?? undefined,
    finalizadoEm: row.finalizado_em ?? undefined,
    apresentadoEm: row.apresentado_em ?? undefined,
  };
}

function toRow(userId: string, documento: DocumentoCriado): DocumentoCriadoRow {
  const agora = new Date().toISOString();

  return {
    id: documento.id,
    user_id: userId,
    titulo: textoSeguro(documento.titulo),
    tipo: tipoParaRemoto(documento.tipo),
    estado: estadoParaRemoto(documento.estado),
    conteudo: documento.conteudo ?? "",
    conteudo_json: documento.conteudoJson ?? null,
    formato_conteudo: textoSeguro(documento.formatoConteudo) || "plain_text",
    resumo: textoSeguro(documento.resumo) || null,
    notas: textoSeguro(documento.notas) || null,
    tags: Array.isArray(documento.tags) ? documento.tags : [],
    origem: textoSeguro(documento.origem) || "manual",
    origem_prompt: textoSeguro(documento.origemPrompt) || null,
    ia_modelo: textoSeguro(documento.iaModelo) || null,
    ia_metadata: documento.iaMetadata ?? null,
    assunto_id: textoSeguro(documento.assuntoId) || null,
    assembleia_id: textoSeguro(documento.assembleiaId) || null,
    ponto_id: textoSeguro(documento.pontoId) || null,
    documento_final_id: textoSeguro(documento.documentoFinalId) || null,
    created_at: documento.createdAt ?? agora,
    updated_at: documento.updatedAt ?? agora,
    archived_at: documento.archivedAt ?? null,
    finalizado_em: documento.finalizadoEm ?? null,
    apresentado_em: documento.apresentadoEm ?? null,
  };
}

type ResultadoUpsertDocumentoCriado = {
  data: DocumentoCriadoRow | null;
  error: { code?: string; message?: string; details?: string } | null;
};

/** @internal Nunca remove relações escolhidas pelo utilizador para contornar erros de FK. */
export async function guardarDocumentoCriadoSemRemoverRelacoes(
  row: DocumentoCriadoRow,
  executarUpsert: (row: DocumentoCriadoRow) => Promise<ResultadoUpsertDocumentoCriado>,
) {
  const response = await executarUpsert(row);
  if (response.error) {
    console.warn("[Tribuno] Documento criado não foi guardado com todas as relações.", {
      operacao: "DOCUMENTO_CRIADO_RELACAO_INVALIDA",
      documentoId: row.id.slice(0, 8),
      codigoErro: response.error.code ?? "SUPABASE_UPSERT_ERROR",
    });
    throw response.error;
  }
  if (!response.data) throw new Error("DOCUMENTO_CRIADO_UPSERT_SEM_DADOS");
  return response.data;
}

async function obterSupabaseUserIdValido(userId?: string) {
  if (!isSupabaseConfigured()) return undefined;

  const supabase = getSupabaseClient();
  if (!supabase) return undefined;

  const { data, error } = await withSupabaseTimeout(
    supabase.auth.getUser(),
    "DOCUMENTOS_CRIADOS_GET_USER",
    8000,
  );

  if (error || !data.user?.id) {
    console.warn("[Tribuno] Sem sessão válida para sincronizar documentos criados.", {
      operacao: "DOCUMENTOS_CRIADOS_AUTH_INVALIDA",
      temErro: Boolean(error),
    });
    return undefined;
  }

  if (userId && userId !== data.user.id) {
    console.warn("[Tribuno] Sincronização de documentos criados ignorada.", {
      operacao: "DOCUMENTOS_CRIADOS_AUTH_DIVERGENTE",
    });
    return undefined;
  }

  return data.user.id;
}

export function carregarDocumentosCriadosLocais(userId?: string) {
  const parsed = userId
    ? lerJSONParaUtilizador<DocumentoCriado[]>(STORAGE_KEY, userId, [])
    : lerJSONPorUtilizador<DocumentoCriado[]>(STORAGE_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

export function guardarDocumentosCriadosLocais(documentos: DocumentoCriado[], userId?: string) {
  if (userId) guardarJSONParaUtilizador(STORAGE_KEY, userId, documentos);
  else guardarJSONPorUtilizador(STORAGE_KEY, documentos);
}

export async function carregarDocumentosCriadosRemotos(userId?: string) {
  const supabaseUserId = await obterSupabaseUserIdValido(userId);
  if (!supabaseUserId) return undefined;

  const supabase = getSupabaseClient();
  if (!supabase) return undefined;

  const { data, error } = await withSupabaseTimeout(
    supabase
      .from("documentos_criados")
      .select("*")
      .eq("user_id", supabaseUserId)
      .order("updated_at", { ascending: false }),
    "DOCUMENTOS_CRIADOS_SELECT",
  );

  if (error) throw error;

  return (data ?? []).map((row) => mapearDocumentoCriadoRemoto(row as DocumentoCriadoRow));
}

export async function carregarDocumentoCriadoRemotoPorId(id: string) {
  const supabaseUserId = await obterSupabaseUserIdValido();
  if (!supabaseUserId) {
    const error = new Error("Sessão necessária para carregar o documento.");
    error.name = "AuthSessionMissingError";
    throw error;
  }

  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Serviço remoto indisponível.");

  const { data, error } = await withSupabaseTimeout(
    supabase
      .from("documentos_criados")
      .select("*")
      .eq("user_id", supabaseUserId)
      .eq("id", id)
      .maybeSingle(),
    "DOCUMENTOS_CRIADOS_SELECT_BY_ID",
  );

  if (error) throw error;
  if (!data) return undefined;

  return mapearDocumentoCriadoRemoto(data as DocumentoCriadoRow);
}

export async function guardarDocumentoCriadoRemoto(userId: string, documento: DocumentoCriado) {
  const supabaseUserId = await obterSupabaseUserIdValido(userId);
  if (!supabaseUserId) throw new Error("AUTH_REQUIRED");

  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("SUPABASE_NOT_CONFIGURED");

  const row = toRow(supabaseUserId, documento);
  const persistido = await guardarDocumentoCriadoSemRemoverRelacoes(row, (rowParaGuardar) =>
    withSupabaseTimeout(
      supabase
        .from("documentos_criados")
        .upsert(rowParaGuardar, {
          onConflict: "id",
        })
        .select("*")
        .single(),
      "DOCUMENTOS_CRIADOS_UPSERT",
    ),
  );

  return mapearDocumentoCriadoRemoto(persistido);
}

export async function apagarDocumentoCriadoRemoto(id: string) {
  const supabaseUserId = await obterSupabaseUserIdValido();
  if (!supabaseUserId) return;

  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { error } = await withSupabaseTimeout(
    supabase.from("documentos_criados").delete().eq("user_id", supabaseUserId).eq("id", id),
    "DOCUMENTOS_CRIADOS_DELETE",
  );

  if (error) throw error;
}
