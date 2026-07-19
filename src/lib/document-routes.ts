import type { Documento, DocumentoCriado } from "@/lib/types";

export function rotaDocumentoInstitucional(
  documento: Pick<Documento, "id"> & Partial<Pick<Documento, "assembleiaId">>,
) {
  const documentoId = encodeURIComponent(documento.id);
  return documento.assembleiaId && documento.assembleiaId !== "biblioteca"
    ? `/documentos/${documentoId}?origem=sessao&sessaoId=${encodeURIComponent(documento.assembleiaId)}`
    : `/documentos/${documentoId}?origem=biblioteca`;
}

export function rotaDocumentoCriado(documento: Pick<DocumentoCriado, "id">) {
  return hrefDocumentoCriado(documento.id);
}

export function hrefDocumentoCriado(documentoId: string) {
  return `/documentos/${encodeURIComponent(documentoId)}`;
}
