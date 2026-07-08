import { useEffect, useState } from "react";
import { listarDossiesAssociadosAoDocumento } from "./dossie-documentos-store";
import { adicionarEventoAutomaticoTimelineDossie } from "./dossie-timeline-store";
import type { DocumentoInboxItem, EstadoInboxDocumento } from "./types";
import { guardarJSONPorUtilizador, lerJSONPorUtilizador } from "./user-storage";

const STORAGE_KEY = "tribuno:inbox";
const EVENT_NAME = "tribuno:inbox";

function lerInboxLocal(): DocumentoInboxItem[] {
  const parsed = lerJSONPorUtilizador<DocumentoInboxItem[]>(STORAGE_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

function guardarInboxLocal(items: DocumentoInboxItem[]) {
  guardarJSONPorUtilizador(STORAGE_KEY, items);
  window.dispatchEvent(new Event(EVENT_NAME));
}

function obterOuCriarItem(documentoId: string): DocumentoInboxItem {
  return (
    lerInboxLocal().find((item) => item.documentoId === documentoId) ?? {
      documentoId,
      estado: "Novo",
    }
  );
}

function atualizarItem(documentoId: string, patch: Partial<DocumentoInboxItem>) {
  const atuais = lerInboxLocal();
  const existente = atuais.find((item) => item.documentoId === documentoId);
  const atualizado: DocumentoInboxItem = {
    ...(existente ?? obterOuCriarItem(documentoId)),
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  const proximos = existente
    ? atuais.map((item) => (item.documentoId === documentoId ? atualizado : item))
    : [...atuais, atualizado];

  guardarInboxLocal(proximos);
  return atualizado;
}

export function listarInboxDocumentos(): DocumentoInboxItem[] {
  return lerInboxLocal();
}

export function obterInboxDocumento(documentoId: string): DocumentoInboxItem {
  return obterOuCriarItem(documentoId);
}

export function definirEstadoInboxDocumento(documentoId: string, estado: EstadoInboxDocumento) {
  return atualizarItem(documentoId, { estado });
}

export function associarInboxDocumentoADossie(documentoId: string, dossieId: string) {
  return atualizarItem(documentoId, {
    dossieId,
    estado: "Em análise",
  });
}

export function associarInboxDocumentoAAssembleia(documentoId: string, assembleiaId: string) {
  return atualizarItem(documentoId, {
    assembleiaId,
    estado: "Em análise",
  });
}

export function marcarInboxDocumentoComoTratado(documentoId: string) {
  return atualizarItem(documentoId, { estado: "Tratado" });
}

export function arquivarInboxDocumento(documentoId: string) {
  const atualizado = atualizarItem(documentoId, {
    archivedAt: new Date().toISOString(),
    estado: "Tratado",
  });

  const dossies = new Set([
    ...(atualizado.dossieId ? [atualizado.dossieId] : []),
    ...listarDossiesAssociadosAoDocumento(documentoId).map((relacao) => relacao.dossieId),
  ]);

  dossies.forEach((dossieId) => {
    adicionarEventoAutomaticoTimelineDossie(dossieId, {
      titulo: "Documento arquivado",
         descricao: "Um documento ligado ao assunto foi arquivado na Caixa de Entrada.",
      tipo: "documento",
      origemTipo: "documento",
      origemId: documentoId,
    });
  });

  return atualizado;
}

export function useInboxDocumentos(): DocumentoInboxItem[] {
  const [items, setItems] = useState<DocumentoInboxItem[]>([]);

  useEffect(() => {
    const atualizar = () => setItems(listarInboxDocumentos());

    atualizar();
    window.addEventListener(EVENT_NAME, atualizar);
    window.addEventListener("storage", atualizar);

    return () => {
      window.removeEventListener(EVENT_NAME, atualizar);
      window.removeEventListener("storage", atualizar);
    };
  }, []);

  return items;
}
