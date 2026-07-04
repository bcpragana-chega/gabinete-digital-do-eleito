import { useEffect, useState } from "react";
import type { Dossie, EstadoDossie, PrioridadeDossie } from "./types";
import { guardarJSONPorUtilizador, lerJSONPorUtilizador } from "./user-storage";

const STORAGE_KEY = "tribuno:assuntos";
const EVENT_NAME = "tribuno:dossies";

export type DossieInput = {
  titulo: string;
  estado: EstadoDossie;
  prioridade: PrioridadeDossie;
  objetivoPolitico: string;
  resumo: string;
  tags: string[];
};

function lerDossiesLocais(): Dossie[] {
  const parsed = lerJSONPorUtilizador<Dossie[]>(STORAGE_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

function guardarDossiesLocais(dossies: Dossie[]) {
  guardarJSONPorUtilizador(STORAGE_KEY, dossies);
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function listarDossies(): Dossie[] {
  return lerDossiesLocais().sort((a, b) => {
    const dataA = a.updatedAt ?? a.createdAt;
    const dataB = b.updatedAt ?? b.createdAt;
    return dataB.localeCompare(dataA);
  });
}

export function obterDossie(id: string): Dossie | undefined {
  return listarDossies().find((dossie) => dossie.id === id);
}

export function adicionarDossie(input: DossieInput): Dossie {
  const agora = new Date().toISOString();
  const novo: Dossie = {
    id: `dossie-${crypto.randomUUID()}`,
    ...input,
    createdAt: agora,
    updatedAt: agora,
  };

  const atuais = lerDossiesLocais();
  guardarDossiesLocais([...atuais, novo]);

  return novo;
}

export function editarDossie(id: string, input: DossieInput): Dossie | undefined {
  const todos = listarDossies();
  const atualizados = todos.map((dossie) =>
    dossie.id === id
      ? {
          ...dossie,
          ...input,
          updatedAt: new Date().toISOString(),
        }
      : dossie,
  );

  guardarDossiesLocais(atualizados);

  return atualizados.find((dossie) => dossie.id === id);
}

export function arquivarDossie(id: string): Dossie | undefined {
  const todos = listarDossies();
  const agora = new Date().toISOString();

  const atualizados = todos.map((dossie) =>
    dossie.id === id
      ? {
          ...dossie,
          archivedAt: agora,
          updatedAt: agora,
        }
      : dossie,
  );

  guardarDossiesLocais(atualizados);

  return atualizados.find((dossie) => dossie.id === id);
}

export function useDossies(): Dossie[] {
  const [dossies, setDossies] = useState<Dossie[]>([]);

  useEffect(() => {
    const atualizar = () => {
      setDossies(listarDossies());
    };

    atualizar();

    window.addEventListener(EVENT_NAME, atualizar);
    window.addEventListener("storage", atualizar);

    return () => {
      window.removeEventListener(EVENT_NAME, atualizar);
      window.removeEventListener("storage", atualizar);
    };
  }, []);

  return dossies;
}

export function useDossie(id: string): Dossie | undefined {
  const dossies = useDossies();

  return dossies.find((dossie) => dossie.id === id);
}
