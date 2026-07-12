import { useEffect, useState } from "react";
import { listarDossiesAssociadosAAssembleia } from "./dossie-assembleias-store";
import { listarDossiesAssociadosAoDocumento } from "./dossie-documentos-store";
import { adicionarEventoAutomaticoTimelineDossie } from "./dossie-timeline-store";
import {
  carregarDocumentoRemotoPorId,
  carregarDocumentosLocais,
  carregarDocumentosRemotos,
  guardarDocumentoRemoto,
  guardarDocumentosLocais,
} from "./documentos-repository";
import { uploadDocumentoPDF } from "./documentos-storage";
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
  if (!userId) return Promise.resolve();

  return guardarDocumentoRemoto(userId, documento).catch((error) => {
    console.warn("[Tribuno] Não foi possível sincronizar o documento no Supabase.", error);
  });
}

async function guardarDocumentoRemotamenteObrigatorio(documento: Documento) {
  const userId = obterUserIdAtual();
  if (!userId) return;

  await guardarDocumentoRemoto(userId, documento);
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
  origem?: string;
  ficheiroNome?: string;
  ficheiroTipo?: string;
  ficheiroTamanho?: number;
  textoExtraido?: string;
  resumo?: string;
  notas?: string;
  tags?: string[];
}

function criarDocumento(input: NovoDocumentoInput, id = crypto.randomUUID()): Documento {
  const agora = new Date().toISOString();
  return {
    id,
    createdAt: agora,
    updatedAt: agora,
    assembleiaOrigemId: input.assembleiaId !== "biblioteca" ? input.assembleiaId : undefined,
    ...input,
  };
}

function persistirDocumento(doc: Documento) {
  const docs = read();
  docs.push(doc);
  write(docs);
  void guardarDocumentoRemotamente(doc);
  registarDocumentoCriadoNaTimeline(doc);
}

export function adicionarDocumento(input: NovoDocumentoInput): Documento {
  const doc = criarDocumento(input);
  persistirDocumento(doc);
  return doc;
}

export async function adicionarDocumentoComUpload(
  input: NovoDocumentoInput & { ficheiro?: File },
): Promise<Documento> {
  const id = crypto.randomUUID();
  const { ficheiro, ...metadata } = input;
  let camposUpload: Partial<Documento> = {};

  if (ficheiro) {
    camposUpload = await uploadDocumentoPDF(id, ficheiro);
  }

  const doc = criarDocumento(
    {
      ...metadata,
      origem: ficheiro ? "upload" : metadata.origem,
      ficheiroNome: camposUpload.ficheiroNome ?? metadata.ficheiroNome,
      ficheiroTipo: camposUpload.ficheiroTipo ?? metadata.ficheiroTipo,
      ficheiroTamanho: camposUpload.ficheiroTamanho ?? metadata.ficheiroTamanho,
    },
    id,
  );

  const documentoComStorage: Documento = {
    ...doc,
    storageBucket: camposUpload.storageBucket,
    storagePath: camposUpload.storagePath,
  };

  const docs = read();
  docs.push(documentoComStorage);
  write(docs);

  if (ficheiro) {
    console.info("[Tribuno Documentos] A guardar metadados remotos do PDF", {
      documentoId: documentoComStorage.id,
      storageBucket: documentoComStorage.storageBucket,
      storagePath: documentoComStorage.storagePath,
    });
    await guardarDocumentoRemotamenteObrigatorio(documentoComStorage);
  } else {
    void guardarDocumentoRemotamente(documentoComStorage);
  }

  registarDocumentoCriadoNaTimeline(documentoComStorage);
  return documentoComStorage;
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
    let ativo = true;

    const sync = () => {
      const local = read().find((d) => d.id === docId);
      if (ativo) setDoc(local);
    };

    async function carregarRemotoDireto() {
      try {
        await carregarDocumentosRemotosSeDisponivel();

        const local = read().find((d) => d.id === docId);
        if (local?.storagePath) return;

        const remoto = await carregarDocumentoRemotoPorId(docId);
        if (!ativo || !remoto) return;

        const documentos = read();
        const existe = documentos.some((documento) => documento.id === docId);
        const atualizados = existe
          ? documentos.map((documento) =>
              documento.id === docId ? { ...documento, ...remoto } : documento,
            )
          : [...documentos, remoto];

        write(atualizados);
        setDoc((atual) => (atual ? { ...atual, ...remoto } : remoto));
      } catch (error) {
        console.warn("[Tribuno] Não foi possível carregar o documento remoto.", error);
      }
    }

    sync();
    void carregarRemotoDireto();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      ativo = false;
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [docId]);

  return doc;
}
