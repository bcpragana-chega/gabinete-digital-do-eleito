import { getSupabaseClient, isSupabaseConfigured, withSupabaseTimeout } from "@/lib/supabase";
import { obterStorageStatus } from "@/lib/storage-provider";
import type { AcompanhamentoPolitico } from "@/lib/types";
import type { DetalhesAcompanhamentoPoliticoInput } from "@/lib/acompanhamento-politico";

export type AcompanhamentoRow = {
  id: string;
  user_id: string;
  assunto_id: string;
  documento_criado_id: string | null;
  tipo: AcompanhamentoPolitico["tipo"];
  data: string;
  descricao: string;
  destinatario: string | null;
  prazo: string | null;
  proxima_acao_em: string | null;
  estado: AcompanhamentoPolitico["estado"];
  created_at: string;
  updated_at: string;
};

export function mapearAcompanhamento(row: AcompanhamentoRow): AcompanhamentoPolitico {
  return {
    id: row.id,
    assuntoId: row.assunto_id,
    documentoCriadoId: row.documento_criado_id ?? undefined,
    tipo: row.tipo,
    data: row.data,
    descricao: row.descricao,
    destinatario: row.destinatario ?? undefined,
    prazo: row.prazo ?? undefined,
    proximaAcaoEm: row.proxima_acao_em ?? undefined,
    estado: row.estado,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function paraRow(userId: string, evento: AcompanhamentoPolitico): AcompanhamentoRow {
  return {
    id: evento.id,
    user_id: userId,
    assunto_id: evento.assuntoId,
    documento_criado_id: evento.documentoCriadoId ?? null,
    tipo: evento.tipo,
    data: evento.data,
    descricao: evento.descricao,
    destinatario: evento.destinatario ?? null,
    prazo: evento.prazo ?? null,
    proxima_acao_em: evento.proximaAcaoEm ?? null,
    estado: evento.estado,
    created_at: evento.createdAt,
    updated_at: evento.updatedAt,
  };
}

async function contextoRemoto(userId?: string) {
  if (!isSupabaseConfigured()) throw new Error("SUPABASE_NOT_CONFIGURED");
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("SUPABASE_NOT_CONFIGURED");
  const { data, error } = await withSupabaseTimeout(
    supabase.auth.getUser(),
    "ACOMPANHAMENTOS_GET_USER",
  );
  if (error || !data.user?.id || (userId && userId !== data.user.id)) {
    throw new Error("AUTH_REQUIRED");
  }
  return { supabase, userId: data.user.id };
}

export function persistenciaLocalAcompanhamentosPermitida() {
  const status = obterStorageStatus();
  return (
    status.provider === "local" && status.localAllowed && import.meta.env.MODE !== "production"
  );
}

export async function listarAcompanhamentosRemotos(userId: string) {
  const contexto = await contextoRemoto(userId);
  const { data, error } = await withSupabaseTimeout(
    contexto.supabase
      .from("acompanhamentos_politicos")
      .select("*")
      .eq("user_id", contexto.userId)
      .order("data", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false }),
    "ACOMPANHAMENTOS_SELECT",
  );
  if (error) throw error;
  if ((data ?? []).some((row) => row.user_id !== contexto.userId)) {
    throw new Error("ACOMPANHAMENTOS_OWNER_MISMATCH");
  }
  return (data ?? []).map((row) => mapearAcompanhamento(row as AcompanhamentoRow));
}

export async function guardarAcompanhamentoRemoto(userId: string, evento: AcompanhamentoPolitico) {
  const contexto = await contextoRemoto(userId);
  const { data, error } = await withSupabaseTimeout(
    contexto.supabase
      .from("acompanhamentos_politicos")
      .insert(paraRow(contexto.userId, evento))
      .select("*")
      .single(),
    "ACOMPANHAMENTOS_INSERT",
  );
  if (error) throw error;
  if (!data || data.user_id !== contexto.userId || data.id !== evento.id) {
    throw new Error("ACOMPANHAMENTO_SAVE_NOT_CONFIRMED");
  }
  return mapearAcompanhamento(data as AcompanhamentoRow);
}

export function paraDetalhesAcompanhamentoRow(input: DetalhesAcompanhamentoPoliticoInput) {
  return {
    descricao: input.descricao.trim(),
    destinatario: input.destinatario?.trim() || null,
    prazo: input.prazo || null,
    proxima_acao_em: input.proximaAcaoEm || null,
    documento_criado_id: input.documentoCriadoId || null,
  };
}

export async function atualizarDetalhesAcompanhamentoRemoto(
  userId: string,
  eventoId: string,
  input: DetalhesAcompanhamentoPoliticoInput,
) {
  const contexto = await contextoRemoto(userId);
  const { data, error } = await withSupabaseTimeout(
    contexto.supabase
      .from("acompanhamentos_politicos")
      .update(paraDetalhesAcompanhamentoRow(input))
      .eq("id", eventoId)
      .eq("user_id", contexto.userId)
      .select("*")
      .single(),
    "ACOMPANHAMENTOS_UPDATE_DETAILS",
  );
  if (error) throw error;
  if (!data || data.user_id !== contexto.userId || data.id !== eventoId) {
    throw new Error("ACOMPANHAMENTO_UPDATE_NOT_CONFIRMED");
  }
  return mapearAcompanhamento(data as AcompanhamentoRow);
}
