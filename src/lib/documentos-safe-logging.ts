export function documentoIdMascarado(documentoId: string) {
  return documentoId.slice(0, 8);
}

export function logPreviewDocumentoFalhou(documentoId: string, codigo: string) {
  console.warn("[Tribuno Documentos] Preview PDF indisponível", {
    operacao: "DOCUMENTO_PREVIEW_FALHOU",
    documentoId: documentoIdMascarado(documentoId),
    codigo,
  });
}

export function logSignedUrlDocumentoFalhou(codigo: string) {
  console.error("[Tribuno Documentos] Falha ao gerar URL assinada do PDF", {
    operacao: "DOCUMENTOS_STORAGE_SIGNED_URL_FALHOU",
    codigo,
  });
}
