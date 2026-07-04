import type { DocumentoCriado } from "@/lib/types";
import { listarDossiesAssociadosAAssembleia } from "@/lib/dossie-assembleias-store";
import { adicionarEventoAutomaticoTimelineDossie } from "@/lib/dossie-timeline-store";
import { guardarJSONPorUtilizador, lerJSONPorUtilizador } from "@/lib/user-storage";

const STORAGE_KEY = "tribuno:documentos-a-criar";
const EVENT = "tribuno:documentos-a-criar";

function lerDocumentos(): DocumentoCriado[] {
  const parsed = lerJSONPorUtilizador<DocumentoCriado[]>(STORAGE_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

function guardarDocumentos(documentos: DocumentoCriado[]) {
  guardarJSONPorUtilizador(STORAGE_KEY, documentos);
  window.dispatchEvent(new Event(EVENT));
}

function gerarId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `documento-a-criar-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function hrefRascunho(documento: DocumentoCriado) {
  if (documento.assuntoId) {
    return `/dossies/${documento.assuntoId}/documentos/${documento.id}`;
  }

  if (!documento.assembleiaId || !documento.pontoId) return undefined;

  return `/assembleias/${documento.assembleiaId}/preparacao/pontos/${documento.pontoId}/rascunhos/${documento.id}`;
}

function registarDocumentoACriarNaTimeline(documento: DocumentoCriado, acao: "criado" | "editado") {
  const dossiesIds = new Set<string>();

  if (documento.assuntoId) {
    dossiesIds.add(documento.assuntoId);
  }

  if (documento.assembleiaId) {
    listarDossiesAssociadosAAssembleia(documento.assembleiaId).forEach((relacao) => {
      dossiesIds.add(relacao.dossieId);
    });
  }

  dossiesIds.forEach((dossieId) => {
    adicionarEventoAutomaticoTimelineDossie(dossieId, {
      titulo: acao === "criado" ? "Documento criado" : "Documento editado",
      descricao: documento.titulo,
      tipo: "documento",
      origemTipo: "documento-a-criar",
      origemId: documento.id,
      origemHref: hrefRascunho(documento),
    });
  });
}

export function listarDocumentosACriarDoPonto(
  assembleiaId: string,
  pontoId: string,
): DocumentoCriado[] {
  return lerDocumentos()
    .filter((documento) => documento.assembleiaId === assembleiaId && documento.pontoId === pontoId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listarDocumentosACriarDaAssembleia(assembleiaId: string): DocumentoCriado[] {
  return lerDocumentos()
    .filter((documento) => documento.assembleiaId === assembleiaId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listarDocumentosACriarDoAssunto(assuntoId: string): DocumentoCriado[] {
  return lerDocumentos()
    .filter((documento) => documento.assuntoId === assuntoId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function obterDocumentoACriarGlobal(rascunhoId: string): DocumentoCriado | undefined {
  return lerDocumentos().find((documento) => documento.id === rascunhoId);
}

export function obterDocumentoACriarPorId(
  assembleiaId: string,
  pontoId: string,
  rascunhoId: string,
): DocumentoCriado | undefined {
  return lerDocumentos().find(
    (documento) =>
      documento.assembleiaId === assembleiaId &&
      documento.pontoId === pontoId &&
      documento.id === rascunhoId,
  );
}

export function adicionarDocumentoACriarRascunho(
  data: Omit<DocumentoCriado, "id" | "estado" | "createdAt" | "updatedAt">,
) {
  const documentos = lerDocumentos();

  const novoDocumento: DocumentoCriado = {
    id: gerarId(),
    estado: "rascunho",
    createdAt: new Date().toISOString(),
    ...data,
  };

  guardarDocumentos([novoDocumento, ...documentos]);
  registarDocumentoACriarNaTimeline(novoDocumento, "criado");

  return novoDocumento;
}

export function atualizarDocumentoACriarRascunho(
  rascunhoId: string,
  data: Partial<
    Pick<
      DocumentoCriado,
      "titulo" | "conteudo" | "estado" | "assuntoId" | "assembleiaId" | "pontoId"
    >
  >,
) {
  const documentos = lerDocumentos();

  const documentosAtualizados = documentos.map((documento) =>
    documento.id === rascunhoId
      ? {
          ...documento,
          ...data,
          updatedAt: new Date().toISOString(),
        }
      : documento,
  );

  guardarDocumentos(documentosAtualizados);

  const atualizado = documentosAtualizados.find((documento) => documento.id === rascunhoId);
  if (atualizado) registarDocumentoACriarNaTimeline(atualizado, "editado");

  return atualizado;
}

export function associarDocumentoCriadoASessaoEPonto(
  rascunhoId: string,
  data: Pick<DocumentoCriado, "assembleiaId" | "pontoId">,
) {
  return atualizarDocumentoACriarRascunho(rascunhoId, data);
}

export function removerAssociacaoSessaoPontoDoDocumentoCriado(rascunhoId: string) {
  return atualizarDocumentoACriarRascunho(rascunhoId, {
    assembleiaId: undefined,
    pontoId: undefined,
  });
}

export function subscreverDocumentosACriar(listener: () => void) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", listener);

  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}
