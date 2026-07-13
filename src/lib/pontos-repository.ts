import {
  type EstadoPonto,
  type NivelPrioridade,
  type PontoOrdemTrabalhos,
  type SentidoVoto,
} from "@/lib/pontos-store";
import { getSupabaseClient, isSupabaseConfigured, withSupabaseTimeout } from "@/lib/supabase";
import {
  guardarJSONParaUtilizador,
  guardarJSONPorUtilizador,
  lerJSONParaUtilizador,
  lerJSONPorUtilizador,
} from "@/lib/user-storage";

const STORAGE_KEY = "tribuno:pontos";

type PontoRow = {
  id: string;
  user_id: string;
  assembleia_id: string;
  numero: number;
  titulo: string;
  descricao: string | null;
  estado: EstadoPonto;
  prioridade: NivelPrioridade;
  objetivo_politico: string | null;
  posicao_politica: string | null;
  mensagem_principal: string | null;
  riscos: string | null;
  linha_intervencao: string | null;
  notas_internas: string | null;
  sentido_voto: SentidoVoto;
  tempo_estimado: number | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

function textoSeguro(valor: unknown) {
  return typeof valor === "string" ? valor.trim() : "";
}

function numeroSeguro(valor: unknown, fallback = 0) {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : fallback;
}

function estadoSeguro(valor: unknown): EstadoPonto {
  return valor === "Por preparar" ||
    valor === "Em preparação" ||
    valor === "Preparado" ||
    valor === "Concluído"
    ? valor
    : "Por preparar";
}

function prioridadeSegura(valor: unknown): NivelPrioridade {
  return valor === "Alta" || valor === "Média" || valor === "Baixa" ? valor : "Média";
}

function sentidoVotoSeguro(valor: unknown): SentidoVoto {
  return valor === "A favor" ||
    valor === "Contra" ||
    valor === "Abstenção" ||
    valor === "Livre" ||
    valor === "Por decidir"
    ? valor
    : "Por decidir";
}

function fromRow(row: PontoRow): PontoOrdemTrabalhos {
  return {
    id: row.id,
    assembleiaId: row.assembleia_id,
    numero: numeroSeguro(row.numero),
    titulo: textoSeguro(row.titulo),
    descricao: textoSeguro(row.descricao),
    estado: estadoSeguro(row.estado),
    prioridade: prioridadeSegura(row.prioridade),
    objetivoPolitico: textoSeguro(row.objetivo_politico),
    posicaoPolitica: textoSeguro(row.posicao_politica),
    mensagemPrincipal: textoSeguro(row.mensagem_principal),
    notas: "",
    riscos: textoSeguro(row.riscos),
    linhaIntervencao: textoSeguro(row.linha_intervencao),
    notasInternas: textoSeguro(row.notas_internas),
    sentidoVoto: sentidoVotoSeguro(row.sentido_voto),
    documentos: [],
    perguntas: [],
    acoes: [],
    documentosACriar: [],
    tempoEstimado: row.tempo_estimado ?? undefined,
    archivedAt: row.archived_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(userId: string, ponto: PontoOrdemTrabalhos): PontoRow {
  const agora = new Date().toISOString();

  return {
    id: ponto.id,
    user_id: userId,
    assembleia_id: ponto.assembleiaId,
    numero: numeroSeguro(ponto.numero),
    titulo: textoSeguro(ponto.titulo),
    descricao: textoSeguro(ponto.descricao) || null,
    estado: estadoSeguro(ponto.estado),
    prioridade: prioridadeSegura(ponto.prioridade),
    objetivo_politico: textoSeguro(ponto.objetivoPolitico) || null,
    posicao_politica: textoSeguro(ponto.posicaoPolitica) || null,
    mensagem_principal: textoSeguro(ponto.mensagemPrincipal) || null,
    riscos: textoSeguro(ponto.riscos) || null,
    linha_intervencao: textoSeguro(ponto.linhaIntervencao) || null,
    notas_internas: textoSeguro(ponto.notasInternas || ponto.notas) || null,
    sentido_voto: sentidoVotoSeguro(ponto.sentidoVoto),
    tempo_estimado: ponto.tempoEstimado ?? null,
    archived_at: ponto.archivedAt ?? null,
    created_at: ponto.createdAt ?? agora,
    updated_at: ponto.updatedAt ?? agora,
  };
}

async function obterSupabaseUserIdValido(userId?: string) {
  if (!isSupabaseConfigured()) return undefined;

  const supabase = getSupabaseClient();
  if (!supabase) return undefined;

  const { data, error } = await withSupabaseTimeout(
    supabase.auth.getUser(),
    "PONTOS_GET_USER",
    8000,
  );

  if (error || !data.user?.id) {
    console.warn("[Tribuno] Sem sessão válida para sincronizar pontos.", {
      operacao: "PONTOS_AUTH_INVALIDA",
      temErro: Boolean(error),
    });
    return undefined;
  }

  if (userId && userId !== data.user.id) {
    console.warn("[Tribuno] Sincronização de pontos ignorada.", {
      operacao: "PONTOS_AUTH_DIVERGENTE",
    });
    return undefined;
  }

  return data.user.id;
}

export function carregarPontosLocais(userId?: string) {
  const parsed = userId
    ? lerJSONParaUtilizador<PontoOrdemTrabalhos[]>(STORAGE_KEY, userId, [])
    : lerJSONPorUtilizador<PontoOrdemTrabalhos[]>(STORAGE_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

export function guardarPontosLocais(pontos: PontoOrdemTrabalhos[], userId?: string) {
  if (userId) guardarJSONParaUtilizador(STORAGE_KEY, userId, pontos);
  else guardarJSONPorUtilizador(STORAGE_KEY, pontos);
}

export async function carregarPontosRemotos(userId?: string) {
  const supabaseUserId = await obterSupabaseUserIdValido(userId);
  if (!supabaseUserId) return undefined;

  const supabase = getSupabaseClient();
  if (!supabase) return undefined;

  const { data, error } = await withSupabaseTimeout(
    supabase.from("pontos").select("*").order("updated_at", { ascending: false }),
    "PONTOS_SELECT",
  );

  if (error) throw error;

  if ((data ?? []).some((row) => row.user_id !== supabaseUserId)) {
    throw new Error("PONTOS_OWNER_MISMATCH");
  }

  return (data ?? []).map((row) => fromRow(row as PontoRow));
}

export async function guardarPontoRemoto(userId: string, ponto: PontoOrdemTrabalhos) {
  const supabaseUserId = await obterSupabaseUserIdValido(userId);
  if (!supabaseUserId) throw new Error("SUPABASE_AUTH_REQUIRED");

  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("SUPABASE_NOT_CONFIGURED");

  const { data, error } = await withSupabaseTimeout(
    supabase
      .from("pontos")
      .upsert(toRow(supabaseUserId, ponto), { onConflict: "id" })
      .select("id,user_id")
      .single(),
    "PONTOS_UPSERT",
  );

  if (error) throw error;
  if (!data?.id || data.id !== ponto.id || data.user_id !== supabaseUserId) {
    throw new Error("PONTO_SAVE_NOT_CONFIRMED");
  }
  return data;
}

export async function apagarPontoRemoto(id: string) {
  const supabaseUserId = await obterSupabaseUserIdValido();
  if (!supabaseUserId) throw new Error("SUPABASE_AUTH_REQUIRED");

  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("SUPABASE_NOT_CONFIGURED");

  const { data, error } = await withSupabaseTimeout(
    supabase.from("pontos").delete().eq("id", id).select("id").single(),
    "PONTOS_DELETE",
  );

  if (error) throw error;
  if (!data?.id) throw new Error("PONTO_DELETE_NOT_CONFIRMED");
}

export async function reordenarPontosRemotos(assembleiaId: string, pontoIds: string[]) {
  const supabaseUserId = await obterSupabaseUserIdValido();
  if (!supabaseUserId) throw new Error("SUPABASE_AUTH_REQUIRED");
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("SUPABASE_NOT_CONFIGURED");
  const { error } = await withSupabaseTimeout(
    supabase.rpc("reordenar_pontos_sessao", {
      p_assembleia_id: assembleiaId,
      p_ponto_ids: pontoIds,
    }),
    "PONTOS_REORDER",
  );
  if (error) throw error;
}
