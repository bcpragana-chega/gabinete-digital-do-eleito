import { useEffect, useState } from "react";
import type { CategoriaRelacionadoDossie, DossieRelacionado } from "./types";

const STORAGE_KEY = "tribuno.dossie-relacionados.v1";
const EVENT_NAME = "tribuno:dossie-relacionados";

export type DossieRelacionadoInput = {
  categoria: CategoriaRelacionadoDossie;
  nome: string;
  descricao: string;
  tipo: string;
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

function lerRelacionadosLocais(): DossieRelacionado[] {
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

function guardarRelacionadosLocais(relacionados: DossieRelacionado[]) {
  if (!isBrowser()) return;

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(relacionados));
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function listarRelacionadosDossie(dossieId: string): DossieRelacionado[] {
  return lerRelacionadosLocais()
    .filter((item) => item.dossieId === dossieId)
    .sort((a, b) => {
      const dataA = a.updatedAt ?? a.createdAt;
      const dataB = b.updatedAt ?? b.createdAt;
      return dataB.localeCompare(dataA);
    });
}

export function adicionarRelacionadoDossie(
  dossieId: string,
  input: DossieRelacionadoInput,
): DossieRelacionado {
  const agora = new Date().toISOString();
  const relacionado: DossieRelacionado = {
    id: `relacionado-${gerarId()}`,
    dossieId,
    ...input,
    createdAt: agora,
    updatedAt: agora,
  };

  guardarRelacionadosLocais([...lerRelacionadosLocais(), relacionado]);

  return relacionado;
}

export function editarRelacionadoDossie(
  id: string,
  input: DossieRelacionadoInput,
): DossieRelacionado | undefined {
  const relacionados = lerRelacionadosLocais();
  const atualizados = relacionados.map((item) =>
    item.id === id
      ? {
          ...item,
          ...input,
          updatedAt: new Date().toISOString(),
        }
      : item,
  );

  guardarRelacionadosLocais(atualizados);

  return atualizados.find((item) => item.id === id);
}

export function apagarRelacionadoDossie(id: string) {
  guardarRelacionadosLocais(lerRelacionadosLocais().filter((item) => item.id !== id));
}

export function useRelacionadosDossie(dossieId: string): DossieRelacionado[] {
  const [relacionados, setRelacionados] = useState<DossieRelacionado[]>([]);

  useEffect(() => {
    const atualizar = () => {
      setRelacionados(listarRelacionadosDossie(dossieId));
    };

    atualizar();

    window.addEventListener(EVENT_NAME, atualizar);
    window.addEventListener("storage", atualizar);

    return () => {
      window.removeEventListener(EVENT_NAME, atualizar);
      window.removeEventListener("storage", atualizar);
    };
  }, [dossieId]);

  return relacionados;
}
