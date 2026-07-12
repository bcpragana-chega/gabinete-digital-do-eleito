import { getSupabaseClient, isSupabaseConfigured, withSupabaseTimeout } from "@/lib/supabase";

export const DOCUMENTOS_STORAGE_BUCKET = "documentos";
export const PDF_MAX_BYTES = 20 * 1024 * 1024;
export const PDF_MIME_TYPE = "application/pdf";

export type DocumentoStorageErroCodigo =
  | "STORAGE_BUCKET_INEXISTENTE"
  | "STORAGE_UPLOAD_FALHOU"
  | "STORAGE_DELETE_FALHOU"
  | "STORAGE_PATH_INVALIDO"
  | "STORAGE_PATH_AUSENTE"
  | "PDF_URL_INVALIDA"
  | "PDF_MIME_INVALIDO"
  | "PDF_EXTENSAO_INVALIDA"
  | "PDF_VAZIO"
  | "PDF_DEMASIADO_GRANDE"
  | "PDF_ASSINATURA_INVALIDA";

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

export async function validarDocumentoPDF(file: File): Promise<void> {
  if (file.type !== PDF_MIME_TYPE) {
    throw new DocumentoStorageErro("PDF_MIME_INVALIDO", "Escolha um ficheiro PDF válido.");
  }

  if (!file.name.toLowerCase().endsWith(".pdf")) {
    throw new DocumentoStorageErro("PDF_EXTENSAO_INVALIDA", "Escolha um ficheiro PDF válido.");
  }

  if (file.size === 0) {
    throw new DocumentoStorageErro("PDF_VAZIO", "O ficheiro PDF está vazio.");
  }

  if (file.size > PDF_MAX_BYTES) {
    throw new DocumentoStorageErro("PDF_DEMASIADO_GRANDE", "O PDF deve ter no máximo 20 MB.");
  }

  const assinatura = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  const assinaturaPDF = [0x25, 0x50, 0x44, 0x46, 0x2d];

  if (
    assinatura.length !== assinaturaPDF.length ||
    !assinaturaPDF.every((byte, index) => assinatura[index] === byte)
  ) {
    throw new DocumentoStorageErro("PDF_ASSINATURA_INVALIDA", "Escolha um ficheiro PDF válido.");
  }
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

function documentoIdMascarado(documentoId: string) {
  return documentoId.slice(0, 8);
}

export function validarStoragePathDocumento(storagePath: string, userId: string) {
  const path = storagePath.trim();
  const namespace = `${DOCUMENTOS_STORAGE_BUCKET}/${userId}/`;

  if (!path || !path.startsWith(namespace) || path.length <= namespace.length) {
    throw new DocumentoStorageErro(
      "STORAGE_PATH_INVALIDO",
      "Não foi possível eliminar completamente o documento. Tente novamente.",
    );
  }

  return path;
}

export async function uploadDocumentoPDF(documentoId: string, file: File) {
  await validarDocumentoPDF(file);

  const supabaseUserId = await obterSupabaseUserId();
  const supabase = getSupabaseClient();

  if (!supabase || !supabaseUserId) {
    console.error("[Tribuno Documentos][STORAGE DIAG] Sem sessão válida para upload", {
      operacao: "STORAGE_UPLOAD_SEM_SESSAO",
      documentoId: documentoIdMascarado(documentoId),
    });
    throw new DocumentoStorageErro(
      "STORAGE_UPLOAD_FALHOU",
      "Não foi possível iniciar sessão no armazenamento de documentos.",
    );
  }

  const path = `documentos/${supabaseUserId}/${documentoId}/${Date.now()}-${limparNomeFicheiro(file.name)}`;

  console.info("[Tribuno Documentos] Upload PDF iniciado", {
    operacao: "STORAGE_UPLOAD_INICIADO",
    documentoId: documentoIdMascarado(documentoId),
  });

  const { error } = await withSupabaseTimeout(
    supabase.storage.from(DOCUMENTOS_STORAGE_BUCKET).upload(path, file, {
      cacheControl: "3600",
      contentType: PDF_MIME_TYPE,
      upsert: true,
    }),
    "DOCUMENTOS_STORAGE_UPLOAD",
    30000,
  );

  if (error) {
    console.error("[Tribuno Documentos] Upload PDF falhou", {
      operacao: "STORAGE_UPLOAD_FALHOU",
      documentoId: documentoIdMascarado(documentoId),
      codigo: isBucketInexistente(error) ? "STORAGE_BUCKET_INEXISTENTE" : "STORAGE_UPLOAD_FALHOU",
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
    operacao: "STORAGE_UPLOAD_CONCLUIDO",
    documentoId: documentoIdMascarado(documentoId),
  });

  return {
    storageBucket: DOCUMENTOS_STORAGE_BUCKET,
    storagePath: path,
    ficheiroNome: file.name,
    ficheiroTipo: PDF_MIME_TYPE,
    ficheiroTamanho: file.size,
  };
}

export async function removerDocumentoPDF(storagePath: string): Promise<void> {
  if (!storagePath.trim()) {
    throw new DocumentoStorageErro(
      "STORAGE_PATH_INVALIDO",
      "Não foi possível eliminar completamente o documento. Tente novamente.",
    );
  }

  const supabaseUserId = await obterSupabaseUserId();
  const supabase = getSupabaseClient();

  if (!supabase || !supabaseUserId) {
    throw new DocumentoStorageErro(
      "STORAGE_DELETE_FALHOU",
      "Não foi possível eliminar completamente o documento. Tente novamente.",
    );
  }

  const pathValidado = validarStoragePathDocumento(storagePath, supabaseUserId);
  const { error } = await withSupabaseTimeout(
    supabase.storage.from(DOCUMENTOS_STORAGE_BUCKET).remove([pathValidado]),
    "DOCUMENTOS_STORAGE_DELETE",
    15000,
  );

  if (error) {
    console.error("[Tribuno Documentos] Remoção do PDF falhou", {
      operacao: "STORAGE_DELETE_FALHOU",
      codigo: "STORAGE_DELETE_FALHOU",
    });
    throw new DocumentoStorageErro(
      "STORAGE_DELETE_FALHOU",
      "Não foi possível eliminar completamente o documento. Tente novamente.",
      error,
    );
  }
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
