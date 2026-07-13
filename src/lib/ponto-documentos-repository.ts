import { getSupabaseClient, withSupabaseTimeout } from "@/lib/supabase";

export type PontoDocumentoRow = {
  id: string;
  user_id: string;
  ponto_id: string;
  documento_id: string;
  created_at: string;
};

async function clienteAutenticado(userId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("SUPABASE_NOT_CONFIGURED");
  const { data, error } = await withSupabaseTimeout(
    supabase.auth.getUser(),
    "PONTO_DOCUMENTOS_GET_USER",
    8000,
  );
  if (error || data.user?.id !== userId) throw new Error("SUPABASE_AUTH_REQUIRED");
  return supabase;
}

export async function carregarPontoDocumentosRemotos(userId: string, pontoId: string) {
  const supabase = await clienteAutenticado(userId);
  const { data, error } = await withSupabaseTimeout(
    supabase
      .from("ponto_documentos")
      .select("id,user_id,ponto_id,documento_id,created_at")
      .eq("ponto_id", pontoId),
    "PONTO_DOCUMENTOS_SELECT",
  );
  if (error) throw error;
  const rows = (data ?? []) as PontoDocumentoRow[];
  if (rows.some((row) => row.user_id !== userId || row.ponto_id !== pontoId)) {
    throw new Error("PONTO_DOCUMENTOS_OWNER_INVALID");
  }
  return rows;
}

export async function associarPontoDocumentoRemoto(
  userId: string,
  pontoId: string,
  documentoId: string,
) {
  const supabase = await clienteAutenticado(userId);
  const { data, error } = await withSupabaseTimeout(
    supabase
      .from("ponto_documentos")
      .upsert(
        { user_id: userId, ponto_id: pontoId, documento_id: documentoId },
        { onConflict: "user_id,ponto_id,documento_id" },
      )
      .select("id,user_id,ponto_id,documento_id,created_at")
      .single(),
    "PONTO_DOCUMENTOS_UPSERT",
  );
  if (error) throw error;
  const row = data as PontoDocumentoRow | null;
  if (
    !row ||
    row.user_id !== userId ||
    row.ponto_id !== pontoId ||
    row.documento_id !== documentoId
  ) {
    throw new Error("PONTO_DOCUMENTO_SAVE_NOT_CONFIRMED");
  }
  return row;
}

export async function removerPontoDocumentoRemoto(
  userId: string,
  pontoId: string,
  documentoId: string,
) {
  const supabase = await clienteAutenticado(userId);
  const { data, error } = await withSupabaseTimeout(
    supabase
      .from("ponto_documentos")
      .delete()
      .eq("ponto_id", pontoId)
      .eq("documento_id", documentoId)
      .select("id,user_id")
      .maybeSingle(),
    "PONTO_DOCUMENTOS_DELETE",
  );
  if (error) throw error;
  if (data && data.user_id !== userId) throw new Error("PONTO_DOCUMENTO_DELETE_NOT_CONFIRMED");
}
