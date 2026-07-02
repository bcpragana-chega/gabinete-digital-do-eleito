import { useEffect, useState } from "react";
import type { DossieTimelineEvento, TipoEventoTimelineDossie } from "./types";

const STORAGE_KEY = "tribuno.dossie-timeline.v1";
const EVENT_NAME = "tribuno:dossie-timeline";

export type DossieTimelineEventoInput = {
  titulo: string;
  descricao: string;
  data: string;
  tipo: TipoEventoTimelineDossie;
  automatico?: boolean;
  origemTipo?: string;
  origemId?: string;
  origemHref?: string;
};

function isBrowser() {
  return typeof window !== "undefined";
}

function gerarId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function lerEventosLocais(): DossieTimelineEvento[] {
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

function guardarEventosLocais(eventos: DossieTimelineEvento[]) {
  if (!isBrowser()) return;

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(eventos));
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function listarEventosTimelineDossie(dossieId: string): DossieTimelineEvento[] {
  return lerEventosLocais()
    .filter((evento) => evento.dossieId === dossieId)
    .sort((a, b) => b.data.localeCompare(a.data));
}

export function listarTodosEventosTimelineDossie(): DossieTimelineEvento[] {
  return lerEventosLocais().sort((a, b) => b.data.localeCompare(a.data));
}

export function adicionarEventoTimelineDossie(
  dossieId: string,
  input: DossieTimelineEventoInput,
): DossieTimelineEvento {
  const agora = new Date().toISOString();
  const evento: DossieTimelineEvento = {
    id: `evento-${gerarId()}`,
    dossieId,
    ...input,
    createdAt: agora,
    updatedAt: agora,
  };

  guardarEventosLocais([...lerEventosLocais(), evento]);

  return evento;
}

export function adicionarEventoAutomaticoTimelineDossie(
  dossieId: string,
  input: Omit<DossieTimelineEventoInput, "automatico" | "data"> & { data?: string },
) {
  return adicionarEventoTimelineDossie(dossieId, {
    ...input,
    automatico: true,
    data: input.data ?? new Date().toISOString().slice(0, 10),
  });
}

export function editarEventoTimelineDossie(
  id: string,
  input: DossieTimelineEventoInput,
): DossieTimelineEvento | undefined {
  const eventos = lerEventosLocais();
  const atualizados = eventos.map((evento) =>
    evento.id === id
      ? {
          ...evento,
          ...input,
          updatedAt: new Date().toISOString(),
        }
      : evento,
  );

  guardarEventosLocais(atualizados);

  return atualizados.find((evento) => evento.id === id);
}

export function apagarEventoTimelineDossie(id: string) {
  guardarEventosLocais(lerEventosLocais().filter((evento) => evento.id !== id));
}

export function useEventosTimelineDossie(dossieId: string): DossieTimelineEvento[] {
  const [eventos, setEventos] = useState<DossieTimelineEvento[]>([]);

  useEffect(() => {
    const atualizar = () => {
      setEventos(listarEventosTimelineDossie(dossieId));
    };

    atualizar();

    window.addEventListener(EVENT_NAME, atualizar);
    window.addEventListener("storage", atualizar);

    return () => {
      window.removeEventListener(EVENT_NAME, atualizar);
      window.removeEventListener("storage", atualizar);
    };
  }, [dossieId]);

  return eventos;
}
