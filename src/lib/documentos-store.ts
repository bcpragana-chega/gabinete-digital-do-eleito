import { useEffect, useState } from "react";
import { listarDossiesAssociadosAAssembleia } from "./dossie-assembleias-store";
import { listarDossiesAssociadosAoDocumento } from "./dossie-documentos-store";
import { adicionarEventoAutomaticoTimelineDossie } from "./dossie-timeline-store";
import {
  carregarDocumentosLocais,
  carregarDocumentosRemotos,
  guardarDocumentoRemoto,
  guardarDocumentosLocais,
} from "./documentos-repository";
import type { Documento, EstadoDocumento, TipoDocumento } from "./types";
import { obterUserIdAtual } from "./user-storage";

const EVENT = "tribuno:documents";
let remoteLoadPromise: Promise<void> | undefined;

function read(): Documento[] {
  return carregarDocumentosLocais();
}

function write(docs: Documento[]) {
  guardarDocumentosLocais(docs);
  window.dispatchEvent(new Event(EVENT));
}

function mergeDocumentos(local: Documento[], remoto: Documento[]) {
  const porId = new Map<string, Documento>();
  local.forEach((documento) => porId.set(documento.id, documento));
  remoto.forEach((documento) => {
    const localAtual = porId.get(documento.id);
    porId.set(documento.id, localAtual ? { ...localAtual, ...documento } : documento);
  });
  return Array.from(porId.values());
}

function guardarDocumentoRemotamente(documento: Documento) {
  const userId = obterUserIdAtual();
  console.info("[DOCUMENTOS DIAG] PASSO 2 documentos-store recebeu o documento", {
    userId,
    documento,
  });

  if (!userId) {
    console.warn("[DOCUMENTOS DIAG] PASSO 2 parado: não existe userId local/autenticado");
    return;
  }

  guardarDocumentoRemoto(userId, documento).catch((error) => {
    console.error("[DOCUMENTOS DIAG] Sincronização remota falhou no documentos-store", {
      documentoId: documento.id,
      error,
    });
  });
}

export function carregarDocumentosRemotosSeDisponivel() {
  if (remoteLoadPromise) return remoteLoadPromise;

  remoteLoadPromise = carregarDocumentosRemotos()
    .then((remotos) => {
      if (!remotos) return;

      const locais = read();
      if (remotos.length === 0 && locais.length > 0) return;

      write(mergeDocumentos(locais, remotos));
    })
    .catch((error) => {
      console.warn("[Tribuno] Não foi possível carregar documentos do Supabase.", error);
    })
    .finally(() => {
      remoteLoadPromise = undefined;
    });

  return remoteLoadPromise;
}

function hrefDocumento(documento: Documento) {
  return `/sessoes/${documento.assembleiaId}/documentos/${documento.id}`;
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
  console.info("[DOCUMENTOS DIAG] PASSO 2 adicionarDocumento chamado", {
    input,
  });

  const agora = new Date().toISOString();
  const doc: Documento = {
    id: crypto.randomUUID(),
    createdAt: agora,
    updatedAt: agora,
    assembleiaOrigemId: input.assembleiaId !== "biblioteca" ? input.assembleiaId : undefined,
    ...input,
  };
  console.info("[DOCUMENTOS DIAG] PASSO 2 documento normalizado na store", {
    documento: doc,
  });
  const docs = read();
  docs.push(doc);
  write(docs);
  guardarDocumentoRemotamente(doc);
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
          assembleiaOrigemId:
            input.assembleiaId && input.assembleiaId !== "biblioteca"
              ? input.assembleiaId
              : (input.assembleiaOrigemId ?? doc.assembleiaOrigemId),
          updatedAt: new Date().toISOString(),
        }
      : doc,
  );

  write(atualizados);

  const atualizado = atualizados.find((doc) => doc.id === id);
  if (atualizado) {
    guardarDocumentoRemotamente(atualizado);
    registarDocumentoEditadoNaTimeline(atualizado);
  }

  return atualizado;
}

export function listarDocumentosLocais(assembleiaId?: string): Documento[] {
  const all = read();
  return assembleiaId ? all.filter((d) => d.assembleiaId === assembleiaId) : all;
}

export function useDocumentos(): Documento[] {
  const [locais, setLocais] = useState<Documento[]>([]);

  useEffect(() => {
    const sync = () => setLocais(listarDocumentosLocais());
    sync();
    void carregarDocumentosRemotosSeDisponivel();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return locais.sort((a, b) => b.data.localeCompare(a.data));
}

export function useDocumentosDaAssembleia(assembleiaId: string): Documento[] {
  const [locais, setLocais] = useState<Documento[]>([]);

  useEffect(() => {
    const sync = () => setLocais(listarDocumentosLocais(assembleiaId));
    sync();
    void carregarDocumentosRemotosSeDisponivel();
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
    void carregarDocumentosRemotosSeDisponivel();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [docId]);

  return doc;
}
