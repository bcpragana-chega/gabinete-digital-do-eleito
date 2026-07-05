import { getSupabaseClient, isSupabaseConfigured, withSupabaseTimeout } from "@/lib/supabase";

export const DOCUMENTOS_STORAGE_BUCKET = "documentos";

export type DocumentoStorageErroCodigo =
  | "STORAGE_BUCKET_INEXISTENTE"
  | "STORAGE_UPLOAD_FALHOU"
  | "STORAGE_PATH_AUSENTE"
  | "PDF_URL_INVALIDA";

export class DocumentoStorageErro extends Error {
  codigo: DocumentoStorageErroCodigo;
  causa?: unknown;

  constructor(codigo: DocumentoStorageErroCodigo, mensagem: string, causa?: unknown) {
    super(mensagem);
    this.name = "DocumentoStorageErro";
    this.codigo = codigo;
    this.causa = causa;
  }
}

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

async function diagnosticarSessaoStorage() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      supabaseConfigurado: isSupabaseConfigured(),
      existeSessao: false,
      sessionUserId: undefined,
      authUserId: undefined,
      erroSessao: "Supabase não configurado",
      erroUser: undefined,
    };
  }

  const [{ data: sessionData, error: sessionError }, { data: userData, error: userError }] =
    await Promise.all([supabase.auth.getSession(), supabase.auth.getUser()]);

  return {
    supabaseConfigurado: isSupabaseConfigured(),
    existeSessao: Boolean(sessionData.session?.user.id),
    sessionUserId: sessionData.session?.user.id,
    authUserId: userData.user?.id,
    erroSessao: sessionError?.message,
    erroUser: userError?.message,
  };
}

function isBucketInexistente(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const message = "message" in error && typeof error.message === "string" ? error.message : "";
  const statusCode =
    "statusCode" in error && typeof error.statusCode === "string" ? error.statusCode : "";

  return (
    statusCode === "404" ||
    message.toLowerCase().includes("bucket not found") ||
    message.toLowerCase().includes("bucket inexistente")
  );
}

export async function uploadDocumentoPDF(documentoId: string, file: File) {
  if (!isPDF(file)) {
    throw new Error("Apenas ficheiros PDF são suportados nesta fase.");
  }

  const supabaseUserId = await obterSupabaseUserId();
  const supabase = getSupabaseClient();
  const diagnosticoSessao = await diagnosticarSessaoStorage();

  if (!supabase || !supabaseUserId) {
    console.error("[Tribuno Documentos][STORAGE DIAG] Sem sessão válida para upload", {
      diagnosticoSessao,
      bucket: DOCUMENTOS_STORAGE_BUCKET,
      documentoId,
      ficheiroNome: file.name,
    });
    throw new DocumentoStorageErro(
      "STORAGE_UPLOAD_FALHOU",
      "Não foi possível iniciar sessão no armazenamento de documentos.",
    );
  }

  const path = `documents/${supabaseUserId}/${documentoId}/${Date.now()}-${limparNomeFicheiro(file.name)}`;

  console.info("[Tribuno Documentos] Upload PDF iniciado", {
    passo: "STORAGE_UPLOAD_PAYLOAD",
    bucket: DOCUMENTOS_STORAGE_BUCKET,
    storagePath: path,
    authUid: supabaseUserId,
    sessionUserId: diagnosticoSessao.sessionUserId,
    authUserId: diagnosticoSessao.authUserId,
    idsIguais:
      supabaseUserId === diagnosticoSessao.sessionUserId &&
      supabaseUserId === diagnosticoSessao.authUserId,
    ficheiroNome: file.name,
    ficheiroTipo: file.type,
    ficheiroTamanho: file.size,
  });

  const { error } = await withSupabaseTimeout(
    supabase.storage.from(DOCUMENTOS_STORAGE_BUCKET).upload(path, file, {
      cacheControl: "3600",
      contentType: file.type || "application/pdf",
      upsert: true,
    }),
    "DOCUMENTOS_STORAGE_UPLOAD",
    30000,
  );

  if (error) {
    console.error("[Tribuno Documentos] Upload PDF falhou", {
      passo: "STORAGE_UPLOAD_ERROR",
      bucket: DOCUMENTOS_STORAGE_BUCKET,
      storagePath: path,
      authUid: supabaseUserId,
      sessionUserId: diagnosticoSessao.sessionUserId,
      authUserId: diagnosticoSessao.authUserId,
      policyEsperada:
        "bucket_id = 'documentos' and (storage.foldername(name))[1] = 'documents' and auth.uid()::text = (storage.foldername(name))[2]",
      error,
    });

    if (isBucketInexistente(error)) {
      throw new DocumentoStorageErro(
        "STORAGE_BUCKET_INEXISTENTE",
        `O bucket "${DOCUMENTOS_STORAGE_BUCKET}" não existe no Supabase Storage.`,
        error,
      );
    }

    throw new DocumentoStorageErro("STORAGE_UPLOAD_FALHOU", "O upload do PDF falhou.", error);
  }

  console.info("[Tribuno Documentos] Upload PDF concluído", {
    passo: "STORAGE_UPLOAD_SUCCESS",
    bucket: DOCUMENTOS_STORAGE_BUCKET,
    storagePath: path,
    authUid: supabaseUserId,
  });

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
  if (!storagePath) {
    throw new DocumentoStorageErro(
      "STORAGE_PATH_AUSENTE",
      "Este documento não tem storage_path guardado.",
    );
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new DocumentoStorageErro(
      "PDF_URL_INVALIDA",
      "Supabase não está configurado para gerar a URL do PDF.",
    );
  }

  const { data, error } = await withSupabaseTimeout(
    supabase.storage.from(DOCUMENTOS_STORAGE_BUCKET).createSignedUrl(storagePath, 60 * 30, options),
    "DOCUMENTOS_STORAGE_SIGNED_URL",
    12000,
  );

  if (error) {
    console.error("[Tribuno Documentos] Falha ao gerar URL assinada do PDF", {
      bucket: DOCUMENTOS_STORAGE_BUCKET,
      storagePath,
      error,
    });

    if (isBucketInexistente(error)) {
      throw new DocumentoStorageErro(
        "STORAGE_BUCKET_INEXISTENTE",
        `O bucket "${DOCUMENTOS_STORAGE_BUCKET}" não existe no Supabase Storage.`,
        error,
      );
    }

    throw new DocumentoStorageErro(
      "PDF_URL_INVALIDA",
      "Não foi possível gerar a URL do PDF.",
      error,
    );
  }

  if (!data.signedUrl) {
    throw new DocumentoStorageErro("PDF_URL_INVALIDA", "A URL assinada do PDF veio vazia.");
  }

  return data.signedUrl;
}
