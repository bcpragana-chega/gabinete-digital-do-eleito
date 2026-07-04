import { useEffect, useState } from "react";
import { adicionarEventoAutomaticoTimelineDossie } from "./dossie-timeline-store";
import {
  criarRelacaoTribuno,
  listarRelacoesPorObjeto,
  removerRelacaoTribunoPorObjetos,
} from "./relacoes-store";
import type { DossieDocumentoRelacionado } from "./types";
import { lerJSONPorUtilizador } from "./user-storage";

const STORAGE_KEY = "tribuno:dossie-documentos";
const EVENT_NAME = "tribuno:dossie-documentos";
const RELACOES_EVENT_NAME = "tribuno:relacoes";

function isBrowser() {
  return typeof window !== "undefined";
}

function lerRelacoesLegadas(): DossieDocumentoRelacionado[] {
  const parsed = lerJSONPorUtilizador<DossieDocumentoRelacionado[]>(STORAGE_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

function relacaoId(dossieId: string, documentoId: string) {
  return `relacao-assunto-documento-${dossieId}-${documentoId}`;
}

function migrarRelacoesLegadas() {
  lerRelacoesLegadas().forEach((relacao) => {
    criarRelacaoTribuno({
      origemTipo: "assunto",
      origemId: relacao.dossieId,
      destinoTipo: "documento",
      destinoId: relacao.documentoId,
      tipoRelacao: "associado_a",
    });
  });
}

function mapearRelacao(dossieId: string, documentoId: string, createdAt?: string) {
  return {
    id: relacaoId(dossieId, documentoId),
    dossieId,
    documentoId,
    createdAt: createdAt ?? new Date().toISOString(),
  };
}

function relacoesDoDossie(dossieId: string): DossieDocumentoRelacionado[] {
  migrarRelacoesLegadas();

  const porChave = new Map<string, DossieDocumentoRelacionado>();

  lerRelacoesLegadas()
    .filter((relacao) => relacao.dossieId === dossieId)
    .forEach((relacao) => porChave.set(relacao.documentoId, relacao));

  listarRelacoesPorObjeto("assunto", dossieId)
    .filter(
      (relacao) =>
        relacao.origemTipo === "assunto" &&
        relacao.origemId === dossieId &&
        relacao.destinoTipo === "documento" &&
        relacao.tipoRelacao === "associado_a",
    )
    .forEach((relacao) =>
      porChave.set(
        relacao.destinoId,
        mapearRelacao(dossieId, relacao.destinoId, relacao.createdAt),
      ),
    );

  return Array.from(porChave.values());
}

function relacoesDoDocumento(documentoId: string): DossieDocumentoRelacionado[] {
  migrarRelacoesLegadas();

  const porChave = new Map<string, DossieDocumentoRelacionado>();

  lerRelacoesLegadas()
    .filter((relacao) => relacao.documentoId === documentoId)
    .forEach((relacao) => porChave.set(relacao.dossieId, relacao));

  listarRelacoesPorObjeto("documento", documentoId)
    .filter(
      (relacao) =>
        relacao.origemTipo === "assunto" &&
        relacao.destinoTipo === "documento" &&
        relacao.destinoId === documentoId &&
        relacao.tipoRelacao === "associado_a",
    )
    .forEach((relacao) =>
      porChave.set(
        relacao.origemId,
        mapearRelacao(relacao.origemId, documentoId, relacao.createdAt),
      ),
    );

  return Array.from(porChave.values());
}

export function listarDocumentosDoDossie(dossieId: string): DossieDocumentoRelacionado[] {
  return relacoesDoDossie(dossieId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listarDossiesAssociadosAoDocumento(
  documentoId: string,
): DossieDocumentoRelacionado[] {
  return relacoesDoDocumento(documentoId);
}

export function associarDocumentoAoDossie(
  dossieId: string,
  documentoId: string,
): DossieDocumentoRelacionado | undefined {
  const existente = listarDocumentosDoDossie(dossieId).find(
    (relacao) => relacao.documentoId === documentoId,
  );

  if (existente) return existente;

  const relacaoGenerica = criarRelacaoTribuno({
    origemTipo: "assunto",
    origemId: dossieId,
    destinoTipo: "documento",
    destinoId: documentoId,
    tipoRelacao: "associado_a",
  });

  adicionarEventoAutomaticoTimelineDossie(dossieId, {
    titulo: "Documento associado",
    descricao: "Um documento existente foi ligado a este assunto.",
    tipo: "documento",
    origemTipo: "documento",
    origemId: documentoId,
  });

  if (isBrowser()) window.dispatchEvent(new Event(EVENT_NAME));

  return mapearRelacao(dossieId, documentoId, relacaoGenerica.createdAt);
}

export function desassociarDocumentoDoDossie(dossieId: string, documentoId: string) {
  removerRelacaoTribunoPorObjetos({
    origemTipo: "assunto",
    origemId: dossieId,
    destinoTipo: "documento",
    destinoId: documentoId,
    tipoRelacao: "associado_a",
  });

  if (isBrowser()) window.dispatchEvent(new Event(EVENT_NAME));
}

export function useDocumentosDoDossie(dossieId: string): DossieDocumentoRelacionado[] {
  const [relacoes, setRelacoes] = useState<DossieDocumentoRelacionado[]>([]);

  useEffect(() => {
    const atualizar = () => {
      setRelacoes(listarDocumentosDoDossie(dossieId));
    };

    atualizar();

    window.addEventListener(EVENT_NAME, atualizar);
    window.addEventListener(RELACOES_EVENT_NAME, atualizar);
    window.addEventListener("storage", atualizar);

    return () => {
      window.removeEventListener(EVENT_NAME, atualizar);
      window.removeEventListener(RELACOES_EVENT_NAME, atualizar);
      window.removeEventListener("storage", atualizar);
    };
  }, [dossieId]);

  return relacoes;
}
