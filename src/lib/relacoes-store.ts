import { useEffect, useState } from "react";
import type {
  ReferenciaObjetoTribuno,
  RelacaoTribuno,
  TipoObjetoTribuno,
  TipoRelacaoTribuno,
} from "./types";
import {
  guardarJSONParaUtilizador,
  guardarJSONPorUtilizador,
  lerJSONParaUtilizador,
  lerJSONPorUtilizador,
} from "./user-storage";
import { obterUtilizadorSupabaseValidado } from "./supabase";
import {
  associarPontoDocumentoRemoto,
  carregarPontoDocumentosRemotos,
  type PontoDocumentoRow,
  removerPontoDocumentoRemoto,
} from "./ponto-documentos-repository";

const STORAGE_KEY = "tribuno:relacoes";
const EVENT_NAME = "tribuno:relacoes";

export type RelacaoTribunoInput = {
  origemTipo: TipoObjetoTribuno;
  origemId: string;
  destinoTipo: TipoObjetoTribuno;
  destinoId: string;
  tipoRelacao: TipoRelacaoTribuno;
};

function gerarId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function relacaoValida(relacao: Partial<RelacaoTribuno>): relacao is RelacaoTribuno {
  return Boolean(
    relacao.id &&
    relacao.origemTipo &&
    relacao.origemId &&
    relacao.destinoTipo &&
    relacao.destinoId &&
    relacao.tipoRelacao &&
    relacao.createdAt &&
    relacao.updatedAt,
  );
}

function lerRelacoesLocais(userId?: string): RelacaoTribuno[] {
  const parsed = userId
    ? lerJSONParaUtilizador<RelacaoTribuno[]>(STORAGE_KEY, userId, [])
    : lerJSONPorUtilizador<RelacaoTribuno[]>(STORAGE_KEY, []);
  return Array.isArray(parsed) ? parsed.filter(relacaoValida) : [];
}

function guardarRelacoesLocais(relacoes: RelacaoTribuno[], userId?: string) {
  if (userId) guardarJSONParaUtilizador(STORAGE_KEY, userId, relacoes);
  else guardarJSONPorUtilizador(STORAGE_KEY, relacoes);
  window.dispatchEvent(new Event(EVENT_NAME));
}

function mesmaRelacao(relacao: RelacaoTribuno | RelacaoTribunoInput, input: RelacaoTribunoInput) {
  return (
    relacao.origemTipo === input.origemTipo &&
    relacao.origemId === input.origemId &&
    relacao.destinoTipo === input.destinoTipo &&
    relacao.destinoId === input.destinoId &&
    relacao.tipoRelacao === input.tipoRelacao
  );
}

function envolveObjeto(relacao: RelacaoTribuno, objeto: ReferenciaObjetoTribuno) {
  return (
    (relacao.origemTipo === objeto.tipo && relacao.origemId === objeto.id) ||
    (relacao.destinoTipo === objeto.tipo && relacao.destinoId === objeto.id)
  );
}

export function listarRelacoesTribuno(): RelacaoTribuno[] {
  return lerRelacoesLocais().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listarRelacoesPorObjeto(tipo: TipoObjetoTribuno, id: string): RelacaoTribuno[] {
  return listarRelacoesTribuno().filter((relacao) => envolveObjeto(relacao, { tipo, id }));
}

export function existeRelacaoTribuno(input: RelacaoTribunoInput): boolean {
  return lerRelacoesLocais().some((relacao) => mesmaRelacao(relacao, input));
}

export function obterRelacaoTribuno(input: RelacaoTribunoInput): RelacaoTribuno | undefined {
  return lerRelacoesLocais().find((relacao) => mesmaRelacao(relacao, input));
}

export function criarRelacaoTribuno(input: RelacaoTribunoInput): RelacaoTribuno {
  const relacoes = lerRelacoesLocais();
  const existente = relacoes.find((relacao) => mesmaRelacao(relacao, input));

  if (existente) return existente;

  const agora = new Date().toISOString();
  const relacao: RelacaoTribuno = {
    id: `relacao-${gerarId()}`,
    ...input,
    createdAt: agora,
    updatedAt: agora,
  };

  guardarRelacoesLocais([relacao, ...relacoes]);
  return relacao;
}

export function removerRelacaoTribuno(id: string) {
  guardarRelacoesLocais(lerRelacoesLocais().filter((relacao) => relacao.id !== id));
}

export function removerRelacaoTribunoPorObjetos(input: RelacaoTribunoInput) {
  guardarRelacoesLocais(lerRelacoesLocais().filter((relacao) => !mesmaRelacao(relacao, input)));
}

async function userIdValidado() {
  const user = await obterUtilizadorSupabaseValidado();
  if (!user?.id) throw new Error("AUTH_REQUIRED");
  return user.id;
}

function relacaoPontoDocumento(pontoId: string, documentoId: string, createdAt: string) {
  return {
    id: `ponto-documento-${pontoId}-${documentoId}`,
    origemTipo: "ponto",
    origemId: pontoId,
    destinoTipo: "documento",
    destinoId: documentoId,
    tipoRelacao: "usado_em",
    createdAt,
    updatedAt: createdAt,
  } satisfies RelacaoTribuno;
}

export async function persistirRelacaoPontoDocumentoComDependencias<T>(input: {
  persistirRemoto: () => Promise<T>;
  confirmarLocal: (confirmacao: T) => void;
}) {
  const confirmacao = await input.persistirRemoto();
  input.confirmarLocal(confirmacao);
  return confirmacao;
}

function relacoesHistoricasDoPonto(relacoes: RelacaoTribuno[], pontoId: string) {
  return relacoes.filter(
    (relacao) =>
      relacao.origemTipo === "ponto" &&
      relacao.origemId === pontoId &&
      relacao.destinoTipo === "documento" &&
      relacao.tipoRelacao === "usado_em",
  );
}

export async function reconciliarRelacoesPontoDocumentoComDependencias(input: {
  pontoId: string;
  locais: RelacaoTribuno[];
  carregarRemotas: () => Promise<PontoDocumentoRow[]>;
  migrarRemota: (documentoId: string) => Promise<PontoDocumentoRow>;
}) {
  const remotas = await input.carregarRemotas();
  const porDocumento = new Map(remotas.map((row) => [row.documento_id, row]));
  for (const local of relacoesHistoricasDoPonto(input.locais, input.pontoId)) {
    if (porDocumento.has(local.destinoId)) continue;
    const migrada = await input.migrarRemota(local.destinoId);
    porDocumento.set(migrada.documento_id, migrada);
  }
  return Array.from(porDocumento.values());
}

export async function hidratarRelacoesPontoDocumentoComDependencias(input: {
  ownerId: string;
  pontoId: string;
  lerLocais: (userId: string) => RelacaoTribuno[];
  guardarLocais: (relacoes: RelacaoTribuno[], userId: string) => void;
  carregarRemotas: () => Promise<PontoDocumentoRow[]>;
  migrarRemota: (documentoId: string) => Promise<PontoDocumentoRow>;
  obterUserIdAtivo: () => Promise<string | undefined>;
}) {
  const locais = input.lerLocais(input.ownerId);
  const rows = await reconciliarRelacoesPontoDocumentoComDependencias({
    pontoId: input.pontoId,
    locais,
    carregarRemotas: input.carregarRemotas,
    migrarRemota: input.migrarRemota,
  });
  if ((await input.obterUserIdAtivo()) !== input.ownerId) return;
  const atuais = locais.filter(
    (relacao) =>
      !(
        relacao.origemTipo === "ponto" &&
        relacao.origemId === input.pontoId &&
        relacao.destinoTipo === "documento" &&
        relacao.tipoRelacao === "usado_em"
      ),
  );
  input.guardarLocais(
    [
      ...rows.map((row) => relacaoPontoDocumento(input.pontoId, row.documento_id, row.created_at)),
      ...atuais,
    ],
    input.ownerId,
  );
}

export async function hidratarRelacoesPontoDocumento(pontoId: string) {
  const ownerId = await userIdValidado();
  return hidratarRelacoesPontoDocumentoComDependencias({
    ownerId,
    pontoId,
    lerLocais: lerRelacoesLocais,
    guardarLocais: guardarRelacoesLocais,
    carregarRemotas: () => carregarPontoDocumentosRemotos(ownerId, pontoId),
    migrarRemota: (documentoId) => associarPontoDocumentoRemoto(ownerId, pontoId, documentoId),
    obterUserIdAtivo: async () => (await obterUtilizadorSupabaseValidado())?.id,
  });
}

export async function associarDocumentoAoPontoConfirmado(pontoId: string, documentoId: string) {
  const ownerId = await userIdValidado();
  let relacao: RelacaoTribuno | undefined;
  await persistirRelacaoPontoDocumentoComDependencias({
    persistirRemoto: async () => {
      const row = await associarPontoDocumentoRemoto(ownerId, pontoId, documentoId);
      if ((await obterUtilizadorSupabaseValidado())?.id !== ownerId) {
        throw new Error("AUTH_CONTEXT_CHANGED");
      }
      return row;
    },
    confirmarLocal: (row) => {
      const input: RelacaoTribunoInput = {
        origemTipo: "ponto",
        origemId: pontoId,
        destinoTipo: "documento",
        destinoId: documentoId,
        tipoRelacao: "usado_em",
      };
      const atuais = lerRelacoesLocais(ownerId).filter((item) => !mesmaRelacao(item, input));
      relacao = relacaoPontoDocumento(pontoId, documentoId, row.created_at);
      guardarRelacoesLocais([relacao, ...atuais], ownerId);
    },
  });
  return relacao!;
}

export async function removerDocumentoDoPontoConfirmado(pontoId: string, documentoId: string) {
  const ownerId = await userIdValidado();
  await persistirRelacaoPontoDocumentoComDependencias({
    persistirRemoto: async () => {
      await removerPontoDocumentoRemoto(ownerId, pontoId, documentoId);
      if ((await obterUtilizadorSupabaseValidado())?.id !== ownerId) {
        throw new Error("AUTH_CONTEXT_CHANGED");
      }
    },
    confirmarLocal: () => {
      const input: RelacaoTribunoInput = {
        origemTipo: "ponto",
        origemId: pontoId,
        destinoTipo: "documento",
        destinoId: documentoId,
        tipoRelacao: "usado_em",
      };
      guardarRelacoesLocais(
        lerRelacoesLocais(ownerId).filter((relacao) => !mesmaRelacao(relacao, input)),
        ownerId,
      );
    },
  });
}

export function useRelacoesPorObjeto(tipo: TipoObjetoTribuno, id: string): RelacaoTribuno[] {
  const [relacoes, setRelacoes] = useState<RelacaoTribuno[]>([]);

  useEffect(() => {
    const atualizar = () => {
      setRelacoes(listarRelacoesPorObjeto(tipo, id));
    };

    atualizar();

    window.addEventListener(EVENT_NAME, atualizar);
    window.addEventListener("storage", atualizar);

    return () => {
      window.removeEventListener(EVENT_NAME, atualizar);
      window.removeEventListener("storage", atualizar);
    };
  }, [tipo, id]);

  return relacoes;
}
