import { useEffect, useState } from "react";
import { listarDossiesAssociadosAAssembleia } from "./dossie-assembleias-store";
import { listarDossiesAssociadosAoDocumento } from "./dossie-documentos-store";
import { adicionarEventoAutomaticoTimelineDossie } from "./dossie-timeline-store";
import {
  carregarDocumentoRemotoPorId,
  carregarDocumentosLocais,
  carregarDocumentosRemotos,
  apagarDocumentoRemoto,
  guardarDocumentoRemoto,
  guardarDocumentosLocais,
} from "./documentos-repository";
import { removerDocumentoPDF, uploadDocumentoPDF } from "./documentos-storage";
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
  if (!userId) {
    throw new Error("Não foi possível concluir o carregamento do documento. Tente novamente.");
  }

  const guardado = await guardarDocumentoRemoto(userId, documento);
  if (!guardado) {
    throw new Error("Não foi possível concluir o carregamento do documento. Tente novamente.");
  }
}

export class DocumentoOperacaoErro extends Error {
  causaOriginal: unknown;
  causaLimpeza?: unknown;

  constructor(mensagem: string, causaOriginal: unknown, causaLimpeza?: unknown) {
    super(mensagem);
    this.name = "DocumentoOperacaoErro";
    this.causaOriginal = causaOriginal;
    this.causaLimpeza = causaLimpeza;
  }
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
  notas?: string;
}

function criarDocumento(input: NovoDocumentoInput, id: string = crypto.randomUUID()): Documento {
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

type DocumentoUploadDependencias = {
  gerarId: () => string;
  upload: typeof uploadDocumentoPDF;
  guardarObrigatorio: typeof guardarDocumentoRemotamenteObrigatorio;
  guardarOpcional: typeof guardarDocumentoRemotamente;
  remover: typeof removerDocumentoPDF;
  ler: typeof read;
  escrever: typeof write;
  registarTimeline: typeof registarDocumentoCriadoNaTimeline;
};

/** @internal Permite testar atomicidade e rollback sem aceder ao Storage real. */
export async function adicionarDocumentoComUploadComDependencias(
  input: NovoDocumentoInput & { ficheiro?: File },
  dependencias: DocumentoUploadDependencias,
): Promise<Documento> {
  const id = dependencias.gerarId();
  const { ficheiro, ...metadata } = input;
  let camposUpload: Partial<Documento> = {};

  if (ficheiro) {
    camposUpload = await dependencias.upload(id, ficheiro);
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

  const docs = dependencias.ler();

  if (ficheiro) {
    try {
      await dependencias.guardarObrigatorio(documentoComStorage);
    } catch (error) {
      try {
        if (documentoComStorage.storagePath) {
          await dependencias.remover(documentoComStorage.storagePath);
        }
      } catch (erroLimpeza) {
        console.error("[Tribuno Documentos] Upload e rollback falharam", {
          operacao: "DOCUMENTO_UPLOAD_ROLLBACK_FALHOU",
          documentoId: documentoComStorage.id.slice(0, 8),
          temFicheiro: Boolean(documentoComStorage.storagePath),
          codigoErro: "METADADOS_E_STORAGE_DELETE_FALHARAM",
        });
        throw new DocumentoOperacaoErro(
          "Não foi possível concluir o carregamento do documento. Tente novamente.",
          error,
          erroLimpeza,
        );
      }
      throw new DocumentoOperacaoErro(
        "Não foi possível concluir o carregamento do documento. Tente novamente.",
        error,
      );
    }
  } else {
    void dependencias.guardarOpcional(documentoComStorage);
  }

  docs.push(documentoComStorage);
  dependencias.escrever(docs);
  dependencias.registarTimeline(documentoComStorage);
  return documentoComStorage;
}

export async function adicionarDocumentoComUpload(
  input: NovoDocumentoInput & { ficheiro?: File },
): Promise<Documento> {
  return adicionarDocumentoComUploadComDependencias(input, {
    gerarId: () => crypto.randomUUID(),
    upload: uploadDocumentoPDF,
    guardarObrigatorio: guardarDocumentoRemotamenteObrigatorio,
    guardarOpcional: guardarDocumentoRemotamente,
    remover: removerDocumentoPDF,
    ler: read,
    escrever: write,
    registarTimeline: registarDocumentoCriadoNaTimeline,
  });
}

type DocumentoDeleteDependencias = {
  apagarRemoto: typeof apagarDocumentoRemoto;
  ler: typeof read;
  escrever: typeof write;
};

/** @internal Permite testar que o estado local só muda após sucesso remoto. */
export async function apagarDocumentoComDependencias(
  id: string,
  dependencias: DocumentoDeleteDependencias,
): Promise<void> {
  try {
    await dependencias.apagarRemoto(id);
  } catch (error) {
    throw new DocumentoOperacaoErro(
      "Não foi possível eliminar completamente o documento. Tente novamente.",
      error,
    );
  }
  dependencias.escrever(dependencias.ler().filter((documento) => documento.id !== id));
}

export async function apagarDocumento(id: string): Promise<void> {
  await apagarDocumentoComDependencias(id, {
    apagarRemoto: apagarDocumentoRemoto,
    ler: read,
    escrever: write,
  });
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
