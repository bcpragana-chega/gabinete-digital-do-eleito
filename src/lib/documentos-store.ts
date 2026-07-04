import { useEffect, useState } from "react";
import { listarDossiesAssociadosAAssembleia } from "./dossie-assembleias-store";
import { listarDossiesAssociadosAoDocumento } from "./dossie-documentos-store";
import { adicionarEventoAutomaticoTimelineDossie } from "./dossie-timeline-store";
import type { Documento, EstadoDocumento, TipoDocumento } from "./types";
import { guardarJSONPorUtilizador, lerJSONPorUtilizador } from "./user-storage";

const STORAGE_KEY = "tribuno:documentos";
const EVENT = "tribuno:documents";

function read(): Documento[] {
  const parsed = lerJSONPorUtilizador<Documento[]>(STORAGE_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

function write(docs: Documento[]) {
  guardarJSONPorUtilizador(STORAGE_KEY, docs);
  window.dispatchEvent(new Event(EVENT));
}

function hrefDocumento(documento: Documento) {
  return `/assembleias/${documento.assembleiaId}/documentos/${documento.id}`;
}

function registarDocumentoCriadoNaTimeline(documento: Documento) {
  listarDossiesAssociadosAAssembleia(documento.assembleiaId).forEach((relacao) => {
    adicionarEventoAutomaticoTimelineDossie(relacao.dossieId, {
      titulo: "Documento criado",
      descricao: documento.titulo,
      tipo: "documento",
      origemTipo: "documento",
      origemId: documento.id,
      origemHref: hrefDocumento(documento),
    });
  });
}

function registarDocumentoEditadoNaTimeline(documento: Documento) {
  const relacoes = [
    ...listarDossiesAssociadosAAssembleia(documento.assembleiaId),
    ...listarDossiesAssociadosAoDocumento(documento.id),
  ];
  const dossies = new Set(relacoes.map((relacao) => relacao.dossieId));

  dossies.forEach((dossieId) => {
    adicionarEventoAutomaticoTimelineDossie(dossieId, {
      titulo: "Documento editado",
      descricao: documento.titulo,
      tipo: "documento",
      origemTipo: "documento",
      origemId: documento.id,
      origemHref: hrefDocumento(documento),
    });
  });
}

export interface NovoDocumentoInput {
  assembleiaId: string;
  titulo: string;
  tipo: TipoDocumento;
  data: string;
  estado: EstadoDocumento;
  ficheiroNome?: string;
  ficheiroTipo?: string;
  notas?: string;
}

export function adicionarDocumento(input: NovoDocumentoInput): Documento {
  const doc: Documento = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...input,
  };
  const docs = read();
  docs.push(doc);
  write(docs);
  registarDocumentoCriadoNaTimeline(doc);
  return doc;
}

export function editarDocumento(
  id: string,
  input: Partial<Omit<Documento, "id" | "createdAt">>,
): Documento | undefined {
  const docs = read();
  const atualizados = docs.map((doc) =>
    doc.id === id
      ? {
          ...doc,
          ...input,
        }
      : doc,
  );

  write(atualizados);

  const atualizado = atualizados.find((doc) => doc.id === id);
  if (atualizado) registarDocumentoEditadoNaTimeline(atualizado);

  return atualizado;
}

export function listarDocumentosLocais(assembleiaId?: string): Documento[] {
  const all = read();
  return assembleiaId ? all.filter((d) => d.assembleiaId === assembleiaId) : all;
}

export function useDocumentosDaAssembleia(assembleiaId: string): Documento[] {
  const [locais, setLocais] = useState<Documento[]>([]);

  useEffect(() => {
    const sync = () => setLocais(listarDocumentosLocais(assembleiaId));
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [assembleiaId]);

  return locais.sort((a, b) => b.data.localeCompare(a.data));
}

export function useDocumento(docId: string): Documento | undefined {
  const [doc, setDoc] = useState<Documento | undefined>(() => read().find((d) => d.id === docId));

  useEffect(() => {
    const sync = () => {
      const local = read().find((d) => d.id === docId);
      setDoc(local);
    };
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [docId]);

  return doc;
}
