import { useEffect, useState } from "react";
import type { Dossie, EstadoDossie, PrioridadeDossie } from "./types";
import {
  carregarAssuntosLocais,
  carregarAssuntosRemotos,
  apagarAssuntoRemoto,
  guardarAssuntoRemoto,
  guardarAssuntosLocais,
} from "@/lib/assuntos-repository";
import { obterUserIdAtual } from "@/lib/user-storage";

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
  return carregarAssuntosLocais();
}

function emitirAtualizacaoDossies() {
  window.dispatchEvent(new Event(EVENT_NAME));
}

function guardarDossiesLocais(dossies: Dossie[]) {
  guardarAssuntosLocais(dossies);
  emitirAtualizacaoDossies();
}

function guardarDossieRemotamente(dossie: Dossie) {
  const userId = obterUserIdAtual();
  if (!userId) return;

  void guardarAssuntoRemoto(userId, dossie).catch((error) => {
    console.warn("[Tribuno] Assunto guardado localmente, mas falhou no Supabase.", error);
  });
}

function apagarDossieRemotamente(id: string) {
  void apagarAssuntoRemoto(id).catch((error) => {
    console.warn("[Tribuno] Assunto apagado localmente, mas falhou no Supabase.", error);
  });
}

async function carregarDossiesRemotosSeDisponivel() {
  try {
    const remotos = await carregarAssuntosRemotos();
    if (!remotos) return;

    guardarDossiesLocais(remotos);
  } catch (error) {
    console.warn("[Tribuno] Não foi possível carregar assuntos do Supabase.", error);
  }
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
  guardarDossieRemotamente(novo);

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
  const atualizado = atualizados.find((dossie) => dossie.id === id);
  if (atualizado) guardarDossieRemotamente(atualizado);

  return atualizado;
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
  const atualizado = atualizados.find((dossie) => dossie.id === id);
  if (atualizado) guardarDossieRemotamente(atualizado);

  return atualizado;
}

export function apagarDossie(id: string): boolean {
  const todos = listarDossies();
  const atualizados = todos.filter((dossie) => dossie.id !== id);

  if (atualizados.length === todos.length) return false;

  guardarDossiesLocais(atualizados);
  apagarDossieRemotamente(id);

  return true;
}

export function useDossies(): Dossie[] {
  const [dossies, setDossies] = useState<Dossie[]>([]);

  useEffect(() => {
    const atualizar = () => {
      setDossies(listarDossies());
    };

    atualizar();
    void carregarDossiesRemotosSeDisponivel();

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
