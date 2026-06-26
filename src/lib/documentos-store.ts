import { useEffect, useState } from "react";
import type { Documento, EstadoDocumento, TipoDocumento } from "./types";
import {
  documentos as mockDocs,
  getDocumento as getMockDocumento,
} from "./mock-data";

const STORAGE_KEY = "tribuno.documents.v1";
const EVENT = "tribuno:documents";

function isBrowser() {
  return typeof window !== "undefined";
}

function read(): Documento[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Documento[]) : [];
  } catch {
    return [];
  }
}

function write(docs: Documento[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
  window.dispatchEvent(new Event(EVENT));
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
  return doc;
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

  const mocks = mockDocs.filter((d) => d.assembleiaId === assembleiaId);
  return [...mocks, ...locais].sort((a, b) => b.data.localeCompare(a.data));
}

export function useDocumento(docId: string): Documento | undefined {
  const [doc, setDoc] = useState<Documento | undefined>(() =>
    getMockDocumento(docId),
  );

  useEffect(() => {
    const sync = () => {
      const mock = getMockDocumento(docId);
      if (mock) {
        setDoc(mock);
        return;
      }
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
