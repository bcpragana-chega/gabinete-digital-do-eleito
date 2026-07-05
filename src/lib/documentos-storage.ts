import { getSupabaseClient, isSupabaseConfigured, withSupabaseTimeout } from "@/lib/supabase";

export const DOCUMENTOS_STORAGE_BUCKET = "documentos";

function limparNomeFicheiro(nome: string) {
  return (
    nome
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "documento.pdf"
  );
}

function isPDF(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

async function obterSupabaseUserId() {
  if (!isSupabaseConfigured()) return undefined;

  const supabase = getSupabaseClient();
  if (!supabase) return undefined;

  const { data, error } = await withSupabaseTimeout(
    supabase.auth.getUser(),
    "DOCUMENTOS_STORAGE_GET_USER",
    8000,
  );

  if (error || !data.user?.id) return undefined;
  return data.user.id;
}

export async function uploadDocumentoPDF(documentoId: string, file: File) {
  if (!isPDF(file)) {
    throw new Error("Apenas ficheiros PDF são suportados nesta fase.");
  }

  const supabaseUserId = await obterSupabaseUserId();
  const supabase = getSupabaseClient();

  if (!supabase || !supabaseUserId) {
    throw new Error("Não foi possível iniciar sessão no armazenamento de documentos.");
  }

  const path = `${supabaseUserId}/${documentoId}/${Date.now()}-${limparNomeFicheiro(file.name)}`;

  const { error } = await withSupabaseTimeout(
    supabase.storage.from(DOCUMENTOS_STORAGE_BUCKET).upload(path, file, {
      cacheControl: "3600",
      contentType: file.type || "application/pdf",
      upsert: true,
    }),
    "DOCUMENTOS_STORAGE_UPLOAD",
    30000,
  );

  if (error) throw error;

  return {
    storageBucket: DOCUMENTOS_STORAGE_BUCKET,
    storagePath: path,
    ficheiroNome: file.name,
    ficheiroTipo: file.type || "application/pdf",
    ficheiroTamanho: file.size,
  };
}

export async function criarUrlAssinadaDocumento(
  storagePath?: string,
  options?: { download?: boolean | string },
) {
  if (!storagePath) return undefined;

  const supabase = getSupabaseClient();
  if (!supabase) return undefined;

  const { data, error } = await withSupabaseTimeout(
    supabase.storage.from(DOCUMENTOS_STORAGE_BUCKET).createSignedUrl(storagePath, 60 * 30, options),
    "DOCUMENTOS_STORAGE_SIGNED_URL",
    12000,
  );

  if (error) throw error;
  return data.signedUrl;
}
