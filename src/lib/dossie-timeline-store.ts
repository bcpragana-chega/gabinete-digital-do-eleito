import { useEffect, useState } from "react";
import type { DossieTimelineEvento, TipoEventoTimelineDossie } from "./types";
import { guardarJSONPorUtilizador, lerJSONPorUtilizador } from "./user-storage";

const STORAGE_KEY = "tribuno:timeline";
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

function gerarId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function lerEventosLocais(): DossieTimelineEvento[] {
  const parsed = lerJSONPorUtilizador<DossieTimelineEvento[]>(STORAGE_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

function guardarEventosLocais(eventos: DossieTimelineEvento[]) {
  guardarJSONPorUtilizador(STORAGE_KEY, eventos);
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
