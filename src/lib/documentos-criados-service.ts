import {
  carregarDocumentosCriadosLocais,
  carregarDocumentoCriadoRemotoPorId,
} from "@/lib/documentos-criados-repository";
import { hidratarDocumentoACriarLocal } from "@/lib/documentos-a-criar-store";
import { getSupabaseClient, isSupabaseConfigured, withSupabaseTimeout } from "@/lib/supabase";
import type { DocumentoCriado } from "@/lib/types";

export type DocumentoCriadoServiceErroCodigo = "SESSAO_EXPIRADA" | "INDISPONIVEL";

export class DocumentoCriadoServiceErro extends Error {
  codigo: DocumentoCriadoServiceErroCodigo;
  causa?: unknown;

  constructor(codigo: DocumentoCriadoServiceErroCodigo, mensagem: string, causa?: unknown) {
    super(mensagem);
    this.name = "DocumentoCriadoServiceErro";
    this.codigo = codigo;
    this.causa = causa;
  }
}

type EstadoSessaoRemota = "valida" | "expirada" | "indisponivel";

type DocumentoCriadoServiceDependencias = {
  remotoConfigurado: () => boolean;
  obterEstadoSessao: () => Promise<EstadoSessaoRemota>;
  carregarRemotoPorId: (id: string) => Promise<DocumentoCriado | undefined>;
  carregarCache: () => DocumentoCriado[];
  hidratarCache: (documento: DocumentoCriado) => void;
};

function erroDeAutorizacao(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const status = "status" in error ? Number(error.status) : undefined;
  const name = "name" in error && typeof error.name === "string" ? error.name : "";
  return status === 401 || status === 403 || name === "AuthSessionMissingError";
}

async function obterEstadoSessao(): Promise<EstadoSessaoRemota> {
  const supabase = getSupabaseClient();
  if (!supabase) return "indisponivel";

  try {
    const { data, error } = await withSupabaseTimeout(
      supabase.auth.getUser(),
      "DOCUMENTO_CRIADO_SERVICE_GET_USER",
      8000,
    );
    if (error) return erroDeAutorizacao(error) ? "expirada" : "indisponivel";
    return data.user?.id ? "valida" : "expirada";
  } catch (error) {
    return erroDeAutorizacao(error) ? "expirada" : "indisponivel";
  }
}

/** @internal Permite testar a estratégia sem carregar listas ou aceder ao Supabase real. */
export async function obterDocumentoCriadoPorIdComDependencias(
  documentoId: string,
  dependencias: DocumentoCriadoServiceDependencias,
): Promise<DocumentoCriado | undefined> {
  const id = documentoId.trim();
  if (!id) return undefined;

  const cache = dependencias.carregarCache().find((documento) => documento.id === id);
  if (!dependencias.remotoConfigurado()) return cache;

  const estadoSessao = await dependencias.obterEstadoSessao();
  if (estadoSessao === "expirada") {
    throw new DocumentoCriadoServiceErro(
      "SESSAO_EXPIRADA",
      "A sua sessão expirou. Inicie sessão novamente.",
    );
  }
  if (estadoSessao === "indisponivel") {
    throw new DocumentoCriadoServiceErro(
      "INDISPONIVEL",
      "Não foi possível carregar o documento. Tente novamente.",
    );
  }

  try {
    const remoto = await dependencias.carregarRemotoPorId(id);
    if (!remoto) return undefined;
    dependencias.hidratarCache(remoto);
    return remoto;
  } catch (error) {
    if (erroDeAutorizacao(error)) {
      throw new DocumentoCriadoServiceErro(
        "SESSAO_EXPIRADA",
        "A sua sessão expirou. Inicie sessão novamente.",
        error,
      );
    }
    throw new DocumentoCriadoServiceErro(
      "INDISPONIVEL",
      "Não foi possível carregar o documento. Tente novamente.",
      error,
    );
  }
}

export function documentoCriadoPertenceAoAssunto(documento: DocumentoCriado, assuntoId: string) {
  return Boolean(assuntoId) && documento.assuntoId === assuntoId;
}

export function hrefDocumentoCriadoNoAssunto(documento: DocumentoCriado) {
  return documento.assuntoId
    ? `/assuntos/${documento.assuntoId}/documentos/${documento.id}`
    : undefined;
}

export async function obterDocumentoCriadoPorId(documentoId: string) {
  return obterDocumentoCriadoPorIdComDependencias(documentoId, {
    remotoConfigurado: isSupabaseConfigured,
    obterEstadoSessao,
    carregarRemotoPorId: carregarDocumentoCriadoRemotoPorId,
    carregarCache: carregarDocumentosCriadosLocais,
    hidratarCache: hidratarDocumentoACriarLocal,
  });
}
