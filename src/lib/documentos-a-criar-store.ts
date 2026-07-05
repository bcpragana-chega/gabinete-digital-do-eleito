import type { DocumentoCriado } from "@/lib/types";
import { listarDossiesAssociadosAAssembleia } from "@/lib/dossie-assembleias-store";
import { adicionarEventoAutomaticoTimelineDossie } from "@/lib/dossie-timeline-store";
import {
  criarConteudoInicialInstitucional,
  isTipoDocumentoInstitucional,
} from "@/lib/documentos-institucionais";
import {
  carregarDocumentosCriadosLocais,
  carregarDocumentosCriadosRemotos,
  guardarDocumentoCriadoRemoto,
  guardarDocumentosCriadosLocais,
} from "@/lib/documentos-criados-repository";
import { obterUserIdAtual } from "@/lib/user-storage";

const EVENT = "tribuno:documentos-a-criar";
let remoteLoadPromise: Promise<void> | undefined;

function lerDocumentos(): DocumentoCriado[] {
  void carregarDocumentosCriadosRemotosSeDisponivel();
  return carregarDocumentosCriadosLocais();
}

function guardarDocumentos(documentos: DocumentoCriado[]) {
  guardarDocumentosCriadosLocais(documentos);
  window.dispatchEvent(new Event(EVENT));
}

function mergeDocumentos(local: DocumentoCriado[], remoto: DocumentoCriado[]) {
  const porId = new Map<string, DocumentoCriado>();
  local.forEach((documento) => porId.set(documento.id, documento));
  remoto.forEach((documento) => {
    const localAtual = porId.get(documento.id);
    porId.set(documento.id, localAtual ? { ...localAtual, ...documento } : documento);
  });
  return Array.from(porId.values());
}

function guardarDocumentoRemotamente(documento: DocumentoCriado) {
  const userId = obterUserIdAtual();
  if (!userId) return;

  guardarDocumentoCriadoRemoto(userId, documento).catch((error) => {
    console.warn("[Tribuno] Não foi possível sincronizar o documento a criar no Supabase.", error);
  });
}

export function carregarDocumentosCriadosRemotosSeDisponivel() {
  if (remoteLoadPromise) return remoteLoadPromise;

  remoteLoadPromise = carregarDocumentosCriadosRemotos()
    .then((remotos) => {
      if (!remotos) return;

      const locais = carregarDocumentosCriadosLocais();
      if (remotos.length === 0 && locais.length > 0) return;

      guardarDocumentos(mergeDocumentos(locais, remotos));
    })
    .catch((error) => {
      console.warn("[Tribuno] Não foi possível carregar documentos a criar do Supabase.", error);
    })
    .finally(() => {
      remoteLoadPromise = undefined;
    });

  return remoteLoadPromise;
}

function gerarId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `documento-a-criar-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function notaBase(conteudo?: string) {
  const limpo = conteudo?.trim();
  if (!limpo || limpo === "Rascunho inicial.") return "[Escrever aqui notas de preparação.]";
  return limpo;
}

export function criarConteudoInicialDocumento(documento: {
  tipo: DocumentoCriado["tipo"];
  titulo: string;
  conteudo?: string;
}) {
  const titulo = documento.titulo.trim() || "[Título do documento]";
  const base = notaBase(documento.conteudo);

  if (isTipoDocumentoInstitucional(documento.tipo)) {
    return criarConteudoInicialInstitucional(documento.tipo, titulo, base);
  }

  if (documento.tipo === "Declaração de voto") {
    return `# ${titulo}

## Identificação da votação

[Identificar o ponto, proposta ou deliberação a que se refere a declaração de voto.]

## Sentido de voto

[A favor / Contra / Abstenção]

## Fundamentação política

[Explicar as razões principais do sentido de voto.]

## Posição assumida

[Clarificar compromissos, reservas, alertas ou condições políticas.]

## Notas de preparação

${base}

## Local e data

[Local], [data]

## Assinatura

[Nome e cargo]`;
  }

  if (documento.tipo === "Intervenção") {
    return `# ${titulo}

## Objetivo da intervenção

[Definir o que se pretende alcançar com esta intervenção.]

## Mensagem principal

[Escrever a ideia central em linguagem clara e direta.]

## Pontos a abordar

1. [Primeiro ponto.]
2. [Segundo ponto.]
3. [Terceiro ponto.]

## Dados ou exemplos a referir

[Inserir factos, exemplos locais, números ou referências relevantes.]

## Encerramento

[Frase final com pedido, posição ou compromisso.]

## Notas de preparação

${base}`;
  }

  return `# ${titulo}

## Objetivo

[Explicar o objetivo deste documento.]

## Contexto

[Descrever o enquadramento e a razão para criar este documento.]

## Conteúdo principal

[Desenvolver aqui o conteúdo do documento.]

## Próximos passos

1. [Ação seguinte.]
2. [Responsável ou destinatário.]
3. [Prazo ou momento de apresentação.]

## Notas de preparação

${base}`;
}

function hrefRascunho(documento: DocumentoCriado) {
  if (documento.assuntoId) {
    return `/assuntos/${documento.assuntoId}/documentos/${documento.id}`;
  }

  if (!documento.assembleiaId) return undefined;

  if (!documento.pontoId) {
    return `/sessoes/${documento.assembleiaId}/preparacao/documentos-a-criar/${documento.id}`;
  }

  return `/sessoes/${documento.assembleiaId}/preparacao/pontos/${documento.pontoId}/rascunhos/${documento.id}`;
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
  const conteudo = criarConteudoInicialDocumento(data);

  const novoDocumento: DocumentoCriado = {
    id: gerarId(),
    estado: "rascunho",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    origem: data.origem ?? "manual",
    formatoConteudo: data.formatoConteudo ?? "markdown",
    ...data,
    conteudo,
  };

  guardarDocumentos([novoDocumento, ...documentos]);
  guardarDocumentoRemotamente(novoDocumento);
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
  if (atualizado) {
    guardarDocumentoRemotamente(atualizado);
    registarDocumentoACriarNaTimeline(atualizado, "editado");
  }

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
