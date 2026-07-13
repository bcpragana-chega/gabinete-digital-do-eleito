import type { Assembleia, EstadoAssembleia } from "@/lib/types";
import { getSupabaseClient, isSupabaseConfigured, withSupabaseTimeout } from "@/lib/supabase";
import { guardarJSONPorUtilizador, lerJSONPorUtilizador } from "@/lib/user-storage";

const STORAGE_KEY = "tribuno:assembleias";

type AssembleiaRow = {
  id: string;
  user_id: string;
  titulo: string;
  tipo: string | null;
  orgao: string | null;
  data: string;
  local: string | null;
  estado: EstadoAssembleia;
  preparacao_estado: "em_preparacao" | "pronta";
  dados_confirmados_at: string | null;
  revisao_final_confirmada_at: string | null;
  pronta_em: string | null;
  notas: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

function textoSeguro(valor: unknown) {
  return typeof valor === "string" ? valor.trim() : "";
}

function estadoSeguro(valor: unknown): EstadoAssembleia {
  return valor === "preparacao" ||
    valor === "analise" ||
    valor === "concluida" ||
    valor === "arquivada"
    ? valor
    : "preparacao";
}

function dataRemota(assembleia: Assembleia) {
  if (!assembleia.hora) return assembleia.data;
  return `${assembleia.data}T${assembleia.hora}`;
}

function separarDataHora(valor: string) {
  const [data = "", horaCompleta = ""] = valor.split("T");
  return {
    data,
    hora: horaCompleta.slice(0, 5),
  };
}

function fromRow(row: AssembleiaRow): Assembleia {
  const { data, hora } = separarDataHora(row.data);

  return {
    id: row.id,
    nome: row.titulo,
    tipo: textoSeguro(row.tipo) || undefined,
    orgao: textoSeguro(row.orgao) || undefined,
    data,
    hora,
    local: textoSeguro(row.local),
    estado: estadoSeguro(row.estado),
    preparacaoEstado: row.preparacao_estado === "pronta" ? "pronta" : "em_preparacao",
    dadosConfirmadosEm: row.dados_confirmados_at ?? undefined,
    revisaoFinalConfirmadaEm: row.revisao_final_confirmada_at ?? undefined,
    prontaEm: row.pronta_em ?? undefined,
    notas: textoSeguro(row.notas) || undefined,
    archivedAt: row.archived_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(userId: string, assembleia: Assembleia): AssembleiaRow {
  const agora = new Date().toISOString();

  return {
    id: assembleia.id,
    user_id: userId,
    titulo: textoSeguro(assembleia.nome),
    tipo: textoSeguro(assembleia.tipo) || "Sessão",
    orgao: textoSeguro(assembleia.orgao) || null,
    data: dataRemota(assembleia),
    local: textoSeguro(assembleia.local) || null,
    estado: estadoSeguro(assembleia.estado),
    preparacao_estado: assembleia.preparacaoEstado === "pronta" ? "pronta" : "em_preparacao",
    dados_confirmados_at: assembleia.dadosConfirmadosEm ?? null,
    revisao_final_confirmada_at: assembleia.revisaoFinalConfirmadaEm ?? null,
    pronta_em: assembleia.prontaEm ?? null,
    notas: textoSeguro(assembleia.notas) || null,
    archived_at: assembleia.archivedAt ?? null,
    created_at: assembleia.createdAt ?? agora,
    updated_at: assembleia.updatedAt ?? agora,
  };
}

async function obterSupabaseUserIdValido(userId?: string) {
  if (!isSupabaseConfigured()) return undefined;

  const supabase = getSupabaseClient();
  if (!supabase) return undefined;

  const { data, error } = await withSupabaseTimeout(
    supabase.auth.getUser(),
    "ASSEMBLEIAS_GET_USER",
    8000,
  );

  if (error || !data.user?.id) {
    console.warn("[Tribuno] Sem sessão válida para sincronizar sessões.", {
      operacao: "SESSOES_AUTH_INVALIDA",
      temErro: Boolean(error),
    });
    return undefined;
  }

  if (userId && userId !== data.user.id) {
    console.warn("[Tribuno] Sincronização de sessões ignorada.", {
      operacao: "SESSOES_AUTH_DIVERGENTE",
    });
    return undefined;
  }

  return data.user.id;
}

export function carregarAssembleiasLocais() {
  const parsed = lerJSONPorUtilizador<Assembleia[]>(STORAGE_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

export function guardarAssembleiasLocais(assembleias: Assembleia[]) {
  guardarJSONPorUtilizador(STORAGE_KEY, assembleias);
}

export async function carregarAssembleiasRemotas() {
  const supabaseUserId = await obterSupabaseUserIdValido();
  if (!supabaseUserId) return undefined;

  const supabase = getSupabaseClient();
  if (!supabase) return undefined;

  const { data, error } = await withSupabaseTimeout(
    supabase.from("assembleias").select("*").order("updated_at", { ascending: false }),
    "ASSEMBLEIAS_SELECT",
  );

  if (error) throw error;

  return (data ?? []).map((row) => fromRow(row as AssembleiaRow));
}

export async function guardarAssembleiaRemota(userId: string, assembleia: Assembleia) {
  const supabaseUserId = await obterSupabaseUserIdValido(userId);
  if (!supabaseUserId) return;

  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { error } = await withSupabaseTimeout(
    supabase.from("assembleias").upsert(toRow(supabaseUserId, assembleia), {
      onConflict: "id",
    }),
    "ASSEMBLEIAS_UPSERT",
  );

  if (error) throw error;
}

export async function apagarAssembleiaRemota(id: string) {
  const supabaseUserId = await obterSupabaseUserIdValido();
  if (!supabaseUserId) return;

  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { error } = await withSupabaseTimeout(
    supabase.from("assembleias").delete().eq("id", id),
    "ASSEMBLEIAS_DELETE",
  );

  if (error) throw error;
}

export async function atualizarPreparacaoAssembleiaRemota(
  id: string,
  alteracoes: {
    dados_confirmados_at?: string | null;
    revisao_final_confirmada_at?: string | null;
    preparacao_estado?: "em_preparacao" | "pronta";
    pronta_em?: string | null;
  },
) {
  const supabaseUserId = await obterSupabaseUserIdValido();
  if (!supabaseUserId) throw new Error("SUPABASE_AUTH_REQUIRED");
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("SUPABASE_NOT_CONFIGURED");

  const { data, error } = await withSupabaseTimeout(
    supabase
      .from("assembleias")
      .update({ ...alteracoes, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single(),
    "ASSEMBLEIAS_PREPARACAO_UPDATE",
  );
  if (error) throw error;
  if (!data) throw new Error("ASSEMBLEIA_UPDATE_NOT_CONFIRMED");
  return fromRow(data as AssembleiaRow);
}
