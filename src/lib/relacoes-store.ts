import { useEffect, useState } from "react";
import type {
  ReferenciaObjetoTribuno,
  RelacaoTribuno,
  TipoObjetoTribuno,
  TipoRelacaoTribuno,
} from "./types";
import { guardarJSONPorUtilizador, lerJSONPorUtilizador } from "./user-storage";

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

function lerRelacoesLocais(): RelacaoTribuno[] {
  const parsed = lerJSONPorUtilizador<RelacaoTribuno[]>(STORAGE_KEY, []);
  return Array.isArray(parsed) ? parsed.filter(relacaoValida) : [];
}

function guardarRelacoesLocais(relacoes: RelacaoTribuno[]) {
  guardarJSONPorUtilizador(STORAGE_KEY, relacoes);
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
