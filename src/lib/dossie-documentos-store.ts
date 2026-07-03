import { useEffect, useState } from "react";
import { adicionarEventoAutomaticoTimelineDossie } from "./dossie-timeline-store";
import type { DossieDocumentoRelacionado } from "./types";

const STORAGE_KEY = "tribuno.dossie-documentos.v1";
const EVENT_NAME = "tribuno:dossie-documentos";

function isBrowser() {
  return typeof window !== "undefined";
}

function gerarId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function lerRelacoesLocais(): DossieDocumentoRelacionado[] {
  if (!isBrowser()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed;
  } catch {
    return [];
  }
}

function guardarRelacoesLocais(relacoes: DossieDocumentoRelacionado[]) {
  if (!isBrowser()) return;

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(relacoes));
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function listarDocumentosDoDossie(dossieId: string): DossieDocumentoRelacionado[] {
  return lerRelacoesLocais()
    .filter((relacao) => relacao.dossieId === dossieId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listarDossiesAssociadosAoDocumento(documentoId: string): DossieDocumentoRelacionado[] {
  return lerRelacoesLocais().filter((relacao) => relacao.documentoId === documentoId);
}

export function associarDocumentoAoDossie(
  dossieId: string,
  documentoId: string,
): DossieDocumentoRelacionado | undefined {
  const relacoes = lerRelacoesLocais();
  const existente = relacoes.find(
    (relacao) => relacao.dossieId === dossieId && relacao.documentoId === documentoId,
  );

  if (existente) return existente;

  const relacao: DossieDocumentoRelacionado = {
    id: `dossie-documento-${gerarId()}`,
    dossieId,
    documentoId,
    createdAt: new Date().toISOString(),
  };

  guardarRelacoesLocais([...relacoes, relacao]);
  adicionarEventoAutomaticoTimelineDossie(dossieId, {
    titulo: "Documento associado",
    descricao: "Um documento existente foi ligado a este assunto.",
    tipo: "documento",
    origemTipo: "documento",
    origemId: documentoId,
  });

  return relacao;
}

export function desassociarDocumentoDoDossie(dossieId: string, documentoId: string) {
  guardarRelacoesLocais(
    lerRelacoesLocais().filter(
      (relacao) => !(relacao.dossieId === dossieId && relacao.documentoId === documentoId),
    ),
  );
}

export function useDocumentosDoDossie(dossieId: string): DossieDocumentoRelacionado[] {
  const [relacoes, setRelacoes] = useState<DossieDocumentoRelacionado[]>([]);

  useEffect(() => {
    const atualizar = () => {
      setRelacoes(listarDocumentosDoDossie(dossieId));
    };

    atualizar();

    window.addEventListener(EVENT_NAME, atualizar);
    window.addEventListener("storage", atualizar);

    return () => {
      window.removeEventListener(EVENT_NAME, atualizar);
      window.removeEventListener("storage", atualizar);
    };
  }, [dossieId]);

  return relacoes;
}
