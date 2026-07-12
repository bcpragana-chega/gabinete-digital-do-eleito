import type { Dossie } from "@/lib/types";
import { guardarJSONPorUtilizador, lerJSONPorUtilizador } from "@/lib/user-storage";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

const STORAGE_KEY = "tribuno:assuntos";

type AssuntoRow = {
  id: string;
  user_id: string;
  titulo: string;
  descricao: string | null;
  estado: Dossie["estado"];
  prioridade: Dossie["prioridade"];
  tags: string[] | null;
  objetivo_politico: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

function fromRow(row: AssuntoRow): Dossie {
  return {
    id: row.id,
    titulo: row.titulo,
    estado: row.estado,
    prioridade: row.prioridade,
    objetivoPolitico: row.objetivo_politico ?? "",
    resumo: row.descricao ?? "",
    tags: row.tags ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at ?? undefined,
  };
}

function toRow(userId: string, assunto: Dossie): AssuntoRow {
  return {
    id: assunto.id,
    user_id: userId,
    titulo: assunto.titulo,
    descricao: assunto.resumo || null,
    estado: assunto.estado,
    prioridade: assunto.prioridade,
    tags: assunto.tags,
    objetivo_politico: assunto.objetivoPolitico || null,
    archived_at: assunto.archivedAt ?? null,
    created_at: assunto.createdAt,
    updated_at: assunto.updatedAt ?? assunto.createdAt,
  };
}

async function obterSupabaseUserIdValido(userId?: string) {
  if (!isSupabaseConfigured()) return undefined;

  const supabase = getSupabaseClient();
  if (!supabase) return undefined;

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.id) {
    if (import.meta.env.DEV) {
      console.warn("[Tribuno] Sem sessão válida para sincronizar assuntos.", {
        operacao: "ASSUNTOS_AUTH_INVALIDA",
        temErro: Boolean(error),
      });
    }
    return undefined;
  }

  if (userId && userId !== data.user.id) {
    if (import.meta.env.DEV) {
      console.warn("[Tribuno] Sincronização de assuntos ignorada.", {
        operacao: "ASSUNTOS_AUTH_DIVERGENTE",
      });
    }
    return undefined;
  }

  return data.user.id;
}

export function carregarAssuntosLocais() {
  const parsed = lerJSONPorUtilizador<Dossie[]>(STORAGE_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

export function guardarAssuntosLocais(assuntos: Dossie[]) {
  guardarJSONPorUtilizador(STORAGE_KEY, assuntos);
}

export async function carregarAssuntosRemotos() {
  const supabaseUserId = await obterSupabaseUserIdValido();
  if (!supabaseUserId) return undefined;

  const supabase = getSupabaseClient();
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from("assuntos")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => fromRow(row as AssuntoRow));
}

export async function sincronizarAssuntosRemotos(userId: string, assuntos: Dossie[]) {
  const supabaseUserId = await obterSupabaseUserIdValido(userId);
  if (!supabaseUserId) return;

  const supabase = getSupabaseClient();
  if (!supabase) return;

  const rows = assuntos.map((assunto) => toRow(supabaseUserId, assunto));
  const { error } = await supabase.from("assuntos").upsert(rows, {
    onConflict: "id",
  });

  if (error) throw error;
}

export async function guardarAssuntoRemoto(userId: string, assunto: Dossie) {
  const supabaseUserId = await obterSupabaseUserIdValido(userId);
  if (!supabaseUserId) return;

  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.from("assuntos").upsert(toRow(supabaseUserId, assunto), {
    onConflict: "id",
  });

  if (error) throw error;
}

export async function apagarAssuntoRemoto(id: string) {
  const supabaseUserId = await obterSupabaseUserIdValido();
  if (!supabaseUserId) return;

  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.from("assuntos").delete().eq("id", id);
  if (error) throw error;
}
