import { useEffect, useState } from "react";
import type { HistoricoEvento, TipoHistoricoEvento } from "./types";
import { guardarJSONPorUtilizador, lerJSONPorUtilizador } from "./user-storage";

const STORAGE_KEY = "tribuno:historico";
const EVENT_NAME = "tribuno:historico-pontos";
const COALESCE_MS = 60_000;

export type HistoricoEventoInput = {
  pontoId: string;
  tipo: TipoHistoricoEvento;
  acao: string;
  descricao: string;
  autor?: string;
};

function gerarId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function lerHistorico(): HistoricoEvento[] {
  const parsed = lerJSONPorUtilizador<HistoricoEvento[]>(STORAGE_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

function guardarHistorico(eventos: HistoricoEvento[]) {
  guardarJSONPorUtilizador(STORAGE_KEY, eventos);
  window.dispatchEvent(new Event(EVENT_NAME));
}

function deveAgruparEvento(maisRecente: HistoricoEvento | undefined, input: HistoricoEventoInput) {
  if (!maisRecente) return false;
  if (maisRecente.pontoId !== input.pontoId) return false;
  if (maisRecente.tipo !== input.tipo) return false;
  if (maisRecente.acao !== input.acao) return false;

  return Date.now() - new Date(maisRecente.data).getTime() < COALESCE_MS;
}

export function obterHistoricoDoPonto(pontoId: string): HistoricoEvento[] {
  return lerHistorico()
    .filter((evento) => evento.pontoId === pontoId)
    .sort((a, b) => b.data.localeCompare(a.data));
}

export function adicionarEventoHistorico(input: HistoricoEventoInput): HistoricoEvento {
  const eventos = lerHistorico();
  const agora = new Date().toISOString();
  const eventosDoPonto = eventos
    .filter((evento) => evento.pontoId === input.pontoId)
    .sort((a, b) => b.data.localeCompare(a.data));
  const maisRecente = eventosDoPonto[0];

  if (deveAgruparEvento(maisRecente, input)) {
    const atualizado: HistoricoEvento = {
      ...maisRecente,
      data: agora,
      descricao: input.descricao,
      autor: input.autor ?? maisRecente.autor,
    };

    guardarHistorico(eventos.map((evento) => (evento.id === atualizado.id ? atualizado : evento)));
    return atualizado;
  }

  const evento: HistoricoEvento = {
    id: `historico-${gerarId()}`,
    pontoId: input.pontoId,
    data: agora,
    tipo: input.tipo,
    acao: input.acao,
    descricao: input.descricao,
    autor: input.autor ?? "Tribuno",
  };

  guardarHistorico([evento, ...eventos]);
  return evento;
}

export function limparHistoricoDoPonto(pontoId: string) {
  guardarHistorico(lerHistorico().filter((evento) => evento.pontoId !== pontoId));
}

export function useHistoricoDoPonto(pontoId: string): HistoricoEvento[] {
  const [eventos, setEventos] = useState<HistoricoEvento[]>([]);

  useEffect(() => {
    const atualizar = () => setEventos(obterHistoricoDoPonto(pontoId));

    atualizar();
    window.addEventListener(EVENT_NAME, atualizar);
    window.addEventListener("storage", atualizar);

    return () => {
      window.removeEventListener(EVENT_NAME, atualizar);
      window.removeEventListener("storage", atualizar);
    };
  }, [pontoId]);

  return eventos;
}
