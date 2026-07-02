import { useEffect, useState } from "react";
import type { DossieAssembleiaRelacionada } from "./types";

const STORAGE_KEY = "tribuno.dossie-assembleias.v1";
const EVENT_NAME = "tribuno:dossie-assembleias";

function isBrowser() {
  return typeof window !== "undefined";
}

function gerarId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function lerRelacoesLocais(): DossieAssembleiaRelacionada[] {
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

function guardarRelacoesLocais(relacoes: DossieAssembleiaRelacionada[]) {
  if (!isBrowser()) return;

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(relacoes));
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function listarAssembleiasDoDossie(dossieId: string): DossieAssembleiaRelacionada[] {
  return lerRelacoesLocais()
    .filter((relacao) => relacao.dossieId === dossieId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function associarAssembleiaAoDossie(
  dossieId: string,
  assembleiaId: string,
): DossieAssembleiaRelacionada | undefined {
  const relacoes = lerRelacoesLocais();
  const existente = relacoes.find(
    (relacao) => relacao.dossieId === dossieId && relacao.assembleiaId === assembleiaId,
  );

  if (existente) return existente;

  const relacao: DossieAssembleiaRelacionada = {
    id: `dossie-assembleia-${gerarId()}`,
    dossieId,
    assembleiaId,
    createdAt: new Date().toISOString(),
  };

  guardarRelacoesLocais([...relacoes, relacao]);

  return relacao;
}

export function desassociarAssembleiaDoDossie(dossieId: string, assembleiaId: string) {
  guardarRelacoesLocais(
    lerRelacoesLocais().filter(
      (relacao) => !(relacao.dossieId === dossieId && relacao.assembleiaId === assembleiaId),
    ),
  );
}

export function useAssembleiasDoDossie(dossieId: string): DossieAssembleiaRelacionada[] {
  const [relacoes, setRelacoes] = useState<DossieAssembleiaRelacionada[]>([]);

  useEffect(() => {
    const atualizar = () => {
      setRelacoes(listarAssembleiasDoDossie(dossieId));
    };

    atualizar();

    window.addEventListener(EVENT_NAME, atualizar);
    window.addEventListener("storage", atualizar);

    return () => {
      window.removeEventListener(EVENT_NAME, atualizar);
      window.removeEventListener("storage", atualizar);
    };
  }, [dossieId]);

  return relacoes;
}
