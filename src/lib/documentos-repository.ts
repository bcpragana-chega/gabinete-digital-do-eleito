import { getSupabaseClient, isSupabaseConfigured, withSupabaseTimeout } from "@/lib/supabase";
import type { Documento, EstadoDocumento, TipoDocumento } from "@/lib/types";
import { guardarJSONPorUtilizador, lerJSONPorUtilizador } from "@/lib/user-storage";

const STORAGE_KEY = "tribuno:documentos";

type EstadoDocumentoRemoto = "por_tratar" | "em_analise" | "analisado" | "importante" | "arquivado";

type DocumentoRow = {
  id: string;
  user_id: string;
  titulo: string;
  descricao: string | null;
  tipo: string;
  estado: EstadoDocumentoRemoto;
  origem: string;
  origem_tipo: string | null;
  origem_ref: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  ficheiro_nome: string | null;
  ficheiro_tipo: string | null;
  ficheiro_tamanho: number | null;
  paginas: number | null;
  checksum: string | null;
  texto_extraido: string | null;
  resumo: string | null;
  notas: string | null;
  tags: string[] | null;
  assunto_origem_id: string | null;
  assembleia_origem_id: string | null;
  ponto_origem_id: string | null;
  data_documento: string | null;
  recebido_em: string | null;
  analisado_em: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

const tiposDocumento: TipoDocumento[] = [
  "Convocatória",
  "Ata",
  "Orçamento",
  "Execução da Receita",
  "Execução da Despesa",
  "PPI",
  "Relatório",
  "Regulamento",
  "Contrato",
  "Proposta",
  "Declaração de voto",
  "Outro",
];

function textoSeguro(valor: unknown) {
  return typeof valor === "string" ? valor.trim() : "";
}

function numeroSeguro(valor: unknown) {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : undefined;
}

function tipoSeguro(valor: unknown): TipoDocumento {
  return typeof valor === "string" && tiposDocumento.includes(valor as TipoDocumento)
    ? (valor as TipoDocumento)
    : "Outro";
}

function estadoParaRemoto(estado: EstadoDocumento): EstadoDocumentoRemoto {
  if (estado === "Revisto") return "analisado";
  if (estado === "Importante") return "importante";
  if (estado === "Arquivado") return "arquivado";
  return "por_tratar";
}

function estadoDeRemoto(estado: unknown): EstadoDocumento {
  if (estado === "analisado") return "Revisto";
  if (estado === "importante") return "Importante";
  if (estado === "arquivado") return "Arquivado";
  return "Por rever";
}

function idSessaoReal(documento: Documento) {
  const id = textoSeguro(documento.assembleiaOrigemId || documento.assembleiaId);
  return id && id !== "biblioteca" ? id : null;
}

function fromRow(row: DocumentoRow): Documento {
  const assembleiaId =
    row.assembleia_origem_id ??
    (row.origem_tipo === "sessao" && row.origem_ref ? row.origem_ref : "biblioteca");

  return {
    id: row.id,
    assembleiaId,
    titulo: textoSeguro(row.titulo),
    descricao: textoSeguro(row.descricao) || undefined,
    tipo: tipoSeguro(row.tipo),
    data: row.data_documento ?? row.created_at.slice(0, 10),
    estado: estadoDeRemoto(row.estado),
    origem: textoSeguro(row.origem) || undefined,
    origemTipo: textoSeguro(row.origem_tipo) || undefined,
    origemRef: textoSeguro(row.origem_ref) || undefined,
    storageBucket: textoSeguro(row.storage_bucket) || undefined,
    storagePath: textoSeguro(row.storage_path) || undefined,
    ficheiroNome: textoSeguro(row.ficheiro_nome) || undefined,
    ficheiroTipo: textoSeguro(row.ficheiro_tipo) || undefined,
    ficheiroTamanho: numeroSeguro(row.ficheiro_tamanho),
    paginas: numeroSeguro(row.paginas),
    checksum: textoSeguro(row.checksum) || undefined,
    textoExtraido: textoSeguro(row.texto_extraido) || undefined,
    resumo: textoSeguro(row.resumo) || undefined,
    notas: textoSeguro(row.notas) || undefined,
    tags: Array.isArray(row.tags) ? row.tags : [],
    assuntoOrigemId: row.assunto_origem_id ?? undefined,
    assembleiaOrigemId: row.assembleia_origem_id ?? undefined,
    pontoOrigemId: row.ponto_origem_id ?? undefined,
    recebidoEm: row.recebido_em ?? undefined,
    analisadoEm: row.analisado_em ?? undefined,
    archivedAt: row.archived_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(userId: string, documento: Documento): DocumentoRow {
  const agora = new Date().toISOString();
  const createdAt = documento.createdAt ?? agora;
  const updatedAt = documento.updatedAt ?? agora;
  const assembleiaOrigemId = idSessaoReal(documento);
  const assuntoOrigemId = textoSeguro(documento.assuntoOrigemId) || null;
  const pontoOrigemId = textoSeguro(documento.pontoOrigemId) || null;
  const origemTipo =
    textoSeguro(documento.origemTipo) ||
    (assembleiaOrigemId ? "sessao" : assuntoOrigemId ? "assunto" : pontoOrigemId ? "ponto" : "");
  const origemRef =
    textoSeguro(documento.origemRef) || assembleiaOrigemId || assuntoOrigemId || pontoOrigemId;

  return {
    id: documento.id,
    user_id: userId,
    titulo: textoSeguro(documento.titulo),
    descricao: textoSeguro(documento.descricao || documento.resumo) || null,
    tipo: tipoSeguro(documento.tipo),
    estado: estadoParaRemoto(documento.estado),
    origem: textoSeguro(documento.origem) || (documento.ficheiroNome ? "upload" : "manual"),
    origem_tipo: origemTipo || null,
    origem_ref: origemRef || null,
    storage_bucket: textoSeguro(documento.storageBucket) || null,
    storage_path: textoSeguro(documento.storagePath) || null,
    ficheiro_nome: textoSeguro(documento.ficheiroNome) || null,
    ficheiro_tipo: textoSeguro(documento.ficheiroTipo) || null,
    ficheiro_tamanho: documento.ficheiroTamanho ?? null,
    paginas: documento.paginas ?? null,
    checksum: textoSeguro(documento.checksum) || null,
    texto_extraido: textoSeguro(documento.textoExtraido) || null,
    resumo: textoSeguro(documento.resumo) || null,
    notas: textoSeguro(documento.notas) || null,
    tags: Array.isArray(documento.tags) ? documento.tags : [],
    assunto_origem_id: assuntoOrigemId,
    assembleia_origem_id: assembleiaOrigemId,
    ponto_origem_id: pontoOrigemId,
    data_documento: textoSeguro(documento.data) || null,
    recebido_em: documento.recebidoEm ?? null,
    analisado_em: documento.analisadoEm ?? null,
    archived_at: documento.archivedAt ?? null,
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

async function obterSupabaseUserIdValido(userId?: string) {
  console.info("[DOCUMENTOS DIAG] Sessão Supabase: início", {
    supabaseConfigurado: isSupabaseConfigured(),
    storeUserId: userId,
  });

  if (!isSupabaseConfigured()) {
    console.warn("[DOCUMENTOS DIAG] Sessão Supabase: Supabase não configurado");
    return undefined;
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn("[DOCUMENTOS DIAG] Sessão Supabase: cliente Supabase indisponível");
    return undefined;
  }

  const { data, error } = await withSupabaseTimeout(
    supabase.auth.getUser(),
    "DOCUMENTOS_GET_USER",
    8000,
  );

  console.info("[DOCUMENTOS DIAG] Sessão Supabase: getUser concluído", {
    supabaseUserId: data.user?.id,
    error,
  });

  if (error || !data.user?.id) {
    console.warn("[Tribuno] Sem sessão Supabase válida para sincronizar Documentos.", error);
    return undefined;
  }

  if (userId && userId !== data.user.id) {
    console.warn(
      "[Tribuno] Sincronização de Documentos ignorada: userId não corresponde ao auth.uid().",
      {
        storeUserId: userId,
        supabaseUserId: data.user.id,
      },
    );
    return undefined;
  }

  return data.user.id;
}

export function carregarDocumentosLocais() {
  const parsed = lerJSONPorUtilizador<Documento[]>(STORAGE_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

export function guardarDocumentosLocais(documentos: Documento[]) {
  guardarJSONPorUtilizador(STORAGE_KEY, documentos);
}

export async function carregarDocumentosRemotos() {
  const supabaseUserId = await obterSupabaseUserIdValido();
  if (!supabaseUserId) return undefined;

  const supabase = getSupabaseClient();
  if (!supabase) return undefined;

  const { data, error } = await withSupabaseTimeout(
    supabase.from("documentos").select("*").order("updated_at", { ascending: false }),
    "DOCUMENTOS_SELECT",
  );

  if (error) throw error;

  return (data ?? []).map((row) => fromRow(row as DocumentoRow));
}

export async function guardarDocumentoRemoto(userId: string, documento: Documento) {
  console.info("[DOCUMENTOS DIAG] PASSO 3 documentos-repository foi chamado", {
    storeUserId: userId,
    documento,
  });

  const supabaseUserId = await obterSupabaseUserIdValido(userId);
  if (!supabaseUserId) {
    console.warn("[DOCUMENTOS DIAG] PASSO 3 parado: sem supabaseUserId válido");
    return;
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn("[DOCUMENTOS DIAG] PASSO 3 parado: cliente Supabase indisponível");
    return;
  }

  const row = toRow(supabaseUserId, documento);

  console.info("[DOCUMENTOS DIAG] PASSO 4 payload enviado para Supabase", {
    tabela: "documentos",
    operacao: "upsert",
    payload: row,
  });

  console.info("[DOCUMENTOS DIAG] PASSO 7 vai executar upsert em public.documentos");

  const response = await withSupabaseTimeout(
    supabase
      .from("documentos")
      .upsert(row, {
        onConflict: "id",
      })
      .select("*"),
    "DOCUMENTOS_UPSERT",
  );

  console.info("[DOCUMENTOS DIAG] PASSO 5 resposta completa do Supabase", {
    data: response.data,
    error: response.error,
    status: response.status,
    statusText: response.statusText,
  });

  if (response.error) {
    console.error("[DOCUMENTOS DIAG] PASSO 6 erro completo do Supabase/PostgREST", {
      message: response.error.message,
      details: response.error.details,
      hint: response.error.hint,
      code: response.error.code,
      error: response.error,
    });
    throw response.error;
  }
}

export async function apagarDocumentoRemoto(id: string) {
  const supabaseUserId = await obterSupabaseUserIdValido();
  if (!supabaseUserId) return;

  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { error } = await withSupabaseTimeout(
    supabase.from("documentos").delete().eq("id", id),
    "DOCUMENTOS_DELETE",
  );

  if (error) throw error;
}
