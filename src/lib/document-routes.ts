import type { Documento, DocumentoCriado } from "@/lib/types";

export function rotaDocumentoInstitucional(
  documento: Pick<Documento, "id"> & Partial<Pick<Documento, "assembleiaId">>,
) {
  return documento.assembleiaId
    ? `/sessoes/${encodeURIComponent(documento.assembleiaId)}/documentos/${encodeURIComponent(documento.id)}`
    : `/biblioteca/documentos/${encodeURIComponent(documento.id)}`;
}

export function rotaDocumentoCriado(
  documento: Pick<DocumentoCriado, "id" | "assuntoId" | "assembleiaId" | "pontoId">,
) {
  if (documento.assuntoId) {
    return `/assuntos/${encodeURIComponent(documento.assuntoId)}/documentos/${encodeURIComponent(documento.id)}`;
  }

  if (documento.assembleiaId && documento.pontoId) {
    return `/sessoes/${encodeURIComponent(documento.assembleiaId)}/preparacao/pontos/${encodeURIComponent(documento.pontoId)}/rascunhos/${encodeURIComponent(documento.id)}`;
  }

  if (documento.assembleiaId) {
    return `/sessoes/${encodeURIComponent(documento.assembleiaId)}/preparacao/documentos-a-criar/${encodeURIComponent(documento.id)}`;
  }

  return undefined;
}
