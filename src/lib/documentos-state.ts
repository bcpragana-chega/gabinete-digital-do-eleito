import type { Documento, EstadoDocumento } from "./types";

/**
 * Codec temporário enquanto a Beta não tem uma coluna remota `importante`.
 * O marcador é reservado, nunca é exposto como tag do utilizador e pode ser
 * removido sem ambiguidade numa futura migração.
 */
export const DOCUMENTO_IMPORTANTE_TAG = "__tribuno:documento-importante:v1";

export type EstadoDocumentoLegado = EstadoDocumento | "Importante" | "Arquivado";

export function normalizarEstadoDocumento(valor: unknown): EstadoDocumento {
  return valor === "Revisto" ? "Revisto" : "Por rever";
}

export function normalizarDocumento<T extends Documento>(documento: T): T {
  const estadoLegado = documento.estado as EstadoDocumentoLegado;
  return {
    ...documento,
    estado: normalizarEstadoDocumento(estadoLegado),
    importante: documento.importante === true || estadoLegado === "Importante",
    archivedAt:
      documento.archivedAt ??
      (estadoLegado === "Arquivado" ? (documento.updatedAt ?? documento.createdAt) : undefined),
  };
}

export function tagsDeDominio(tags: unknown): string[] {
  return Array.isArray(tags)
    ? tags.filter(
        (tag): tag is string => typeof tag === "string" && tag !== DOCUMENTO_IMPORTANTE_TAG,
      )
    : [];
}

export function codificarImportanciaEmTags(tags: unknown, importante: boolean): string[] {
  const tagsLimpas = tagsDeDominio(tags);
  return importante ? [...tagsLimpas, DOCUMENTO_IMPORTANTE_TAG] : tagsLimpas;
}

export function importanciaDasTags(tags: unknown): boolean {
  return Array.isArray(tags) && tags.includes(DOCUMENTO_IMPORTANTE_TAG);
}

export function documentoAtivo(documento: Pick<Documento, "archivedAt">): boolean {
  return !documento.archivedAt;
}

export function documentoGeraPendenciaHoje(
  documento: Pick<Documento, "estado" | "importante" | "archivedAt">,
): boolean {
  return (
    documentoAtivo(documento) && (documento.estado === "Por rever" || documento.importante === true)
  );
}

export function alteracoesTratamentoDocumento(estado: EstadoDocumento): Pick<Documento, "estado"> {
  return { estado };
}

export function alteracoesImportanciaDocumento(importante: boolean): Pick<Documento, "importante"> {
  return { importante };
}

export function alteracoesArquivoDocumento(
  archivedAt: string | undefined,
): Pick<Documento, "archivedAt"> {
  return { archivedAt };
}
