import { useEffect, useState } from "react";
import type { Dossie, EstadoDossie, PrioridadeDossie } from "./types";
import {
  carregarAssuntosLocais,
  carregarAssuntosRemotos,
  apagarAssuntoRemoto,
  guardarAssuntoRemoto,
  guardarAssuntosLocais,
} from "@/lib/assuntos-repository";
import { executarHidratacaoIsolada, executarMutacaoIsolada } from "@/lib/confirmed-mutation";
import { obterUtilizadorSupabaseValidado } from "@/lib/supabase";

const EVENT_NAME = "tribuno:dossies";
let hidratacaoAtual = 0;

export type DossieInput = {
  titulo: string;
  estado: EstadoDossie;
  prioridade: PrioridadeDossie;
  objetivoPolitico: string;
  resumo: string;
  tags: string[];
};

function lerDossiesLocais(userId?: string): Dossie[] {
  return carregarAssuntosLocais(userId);
}

function emitirAtualizacaoDossies() {
  window.dispatchEvent(new Event(EVENT_NAME));
}

function guardarDossiesLocais(dossies: Dossie[], userId?: string) {
  guardarAssuntosLocais(dossies, userId);
  emitirAtualizacaoDossies();
}

async function obterUserIdValidado() {
  const user = await obterUtilizadorSupabaseValidado();
  if (!user?.id) throw new Error("AUTH_REQUIRED");
  return user.id;
}

async function guardarDossieRemotamente(userId: string, dossie: Dossie) {
  await guardarAssuntoRemoto(userId, dossie);
}

async function carregarDossiesRemotosSeDisponivel() {
  try {
    const hidratacaoId = ++hidratacaoAtual;
    const userId = await obterUserIdValidado();
    await executarHidratacaoIsolada({
      userId,
      carregarRemoto: carregarAssuntosRemotos,
      obterUserIdAtivo: async () => (await obterUtilizadorSupabaseValidado())?.id,
      isAtual: () => hidratacaoId === hidratacaoAtual,
      confirmarLocal: (ownerId, remotos) => guardarDossiesLocais(remotos ?? [], ownerId),
    });
  } catch {
    console.warn("[Tribuno] Carregamento remoto de assuntos falhou.", {
      operacao: "ASSUNTOS_LOAD_FALHOU",
    });
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

export async function adicionarDossie(
  input: DossieInput,
  options?: { id?: string },
): Promise<Dossie> {
  const userId = await obterUserIdValidado();
  const agora = new Date().toISOString();
  const novo: Dossie = {
    id: options?.id ?? `dossie-${crypto.randomUUID()}`,
    ...input,
    createdAt: agora,
    updatedAt: agora,
  };

  return executarMutacaoIsolada({
    userId,
    persistirRemoto: (ownerId) => guardarDossieRemotamente(ownerId, novo),
    obterUserIdAtivo: async () => (await obterUtilizadorSupabaseValidado())?.id,
    confirmarLocal: (ownerId) => {
      const atuais = lerDossiesLocais(ownerId);
      guardarDossiesLocais([...atuais.filter((item) => item.id !== novo.id), novo], ownerId);
      return novo;
    },
  });
}

export async function editarDossie(id: string, input: DossieInput) {
  const userId = await obterUserIdValidado();
  const todos = lerDossiesLocais(userId);
  const atualizados = todos.map((dossie) =>
    dossie.id === id
      ? {
          ...dossie,
          ...input,
          updatedAt: new Date().toISOString(),
        }
      : dossie,
  );

  const atualizado = atualizados.find((dossie) => dossie.id === id);
  if (!atualizado) return undefined;
  return executarMutacaoIsolada({
    userId,
    persistirRemoto: (ownerId) => guardarDossieRemotamente(ownerId, atualizado),
    obterUserIdAtivo: async () => (await obterUtilizadorSupabaseValidado())?.id,
    confirmarLocal: (ownerId) => {
      guardarDossiesLocais(atualizados, ownerId);
      return atualizado;
    },
  });
}

export async function arquivarDossie(id: string) {
  const userId = await obterUserIdValidado();
  const todos = lerDossiesLocais(userId);
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

  const atualizado = atualizados.find((dossie) => dossie.id === id);
  if (!atualizado) return undefined;
  return executarMutacaoIsolada({
    userId,
    persistirRemoto: (ownerId) => guardarDossieRemotamente(ownerId, atualizado),
    obterUserIdAtivo: async () => (await obterUtilizadorSupabaseValidado())?.id,
    confirmarLocal: (ownerId) => {
      guardarDossiesLocais(atualizados, ownerId);
      return atualizado;
    },
  });
}

export async function apagarDossie(id: string): Promise<boolean> {
  const userId = await obterUserIdValidado();
  const todos = lerDossiesLocais(userId);
  const atualizados = todos.filter((dossie) => dossie.id !== id);

  if (atualizados.length === todos.length) return false;

  return executarMutacaoIsolada({
    userId,
    persistirRemoto: () => apagarAssuntoRemoto(id),
    obterUserIdAtivo: async () => (await obterUtilizadorSupabaseValidado())?.id,
    confirmarLocal: (ownerId) => {
      guardarDossiesLocais(atualizados, ownerId);
      return true;
    },
  });
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
