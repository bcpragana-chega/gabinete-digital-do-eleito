import type { Documento, DocumentoCriado } from "@/lib/types";

export function rotaDocumentoInstitucional(
  documento: Pick<Documento, "id"> & Partial<Pick<Documento, "assembleiaId">>,
) {
  return documento.assembleiaId
    ? `/sessoes/${encodeURIComponent(documento.assembleiaId)}/documentos/${encodeURIComponent(documento.id)}`
    : `/biblioteca/documentos/${encodeURIComponent(documento.id)}`;
}

export function rotaDocumentoCriado(documento: Pick<DocumentoCriado, "id">) {
  return hrefDocumentoCriado(documento.id);
}

export function hrefDocumentoCriado(documentoId: string) {
  return `/documentos/${encodeURIComponent(documentoId)}`;
}
