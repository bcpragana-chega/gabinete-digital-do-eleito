import { useEffect, useState } from "react";
import type { Assembleia, EstadoAssembleia } from "./types";
import { assembleias as mockAssembleias } from "./mock-data";

const STORAGE_KEY = "tribuno.assembleias.v1";
const EVENT_NAME = "tribuno:assembleias";

type NovaAssembleiaInput = {
  nome: string;
  data: string;
  hora: string;
  local: string;
  estado: EstadoAssembleia;
};

type EditarAssembleiaInput = NovaAssembleiaInput;

function isBrowser() {
  return typeof window !== "undefined";
}

function lerAssembleiasLocais(): Assembleia[] {
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

function guardarAssembleiasLocais(assembleias: Assembleia[]) {
  if (!isBrowser()) return;

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(assembleias));
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function listarAssembleias(): Assembleia[] {
  const locais = lerAssembleiasLocais();

  const todas = [...mockAssembleias, ...locais];

  return todas.sort((a, b) => {
    const dataA = `${a.data}T${a.hora || "00:00"}`;
    const dataB = `${b.data}T${b.hora || "00:00"}`;

    return dataB.localeCompare(dataA);
  });
}

export function obterAssembleia(id: string): Assembleia | undefined {
  return listarAssembleias().find((assembleia) => assembleia.id === id);
}

export function adicionarAssembleia(input: NovaAssembleiaInput): Assembleia {
  const nova: Assembleia = {
    id: `asm-${crypto.randomUUID()}`,
    nome: input.nome,
    data: input.data,
    hora: input.hora,
    local: input.local,
    estado: input.estado,
  };

  const atuais = lerAssembleiasLocais();
  guardarAssembleiasLocais([...atuais, nova]);

  return nova;
}

export function editarAssembleia(id: string, input: EditarAssembleiaInput): Assembleia | undefined {
  const atuais = lerAssembleiasLocais();

  const atualizada = atuais.map((assembleia) =>
    assembleia.id === id
      ? {
          ...assembleia,
          nome: input.nome,
          data: input.data,
          hora: input.hora,
          local: input.local,
          estado: input.estado,
        }
      : assembleia,
  );

  guardarAssembleiasLocais(atualizada);

  return atualizada.find((assembleia) => assembleia.id === id);
}

export function useAssembleias(): Assembleia[] {
  const [assembleias, setAssembleias] = useState<Assembleia[]>([]);

  useEffect(() => {
    const atualizar = () => {
      setAssembleias(listarAssembleias());
    };

    atualizar();

    window.addEventListener(EVENT_NAME, atualizar);
    window.addEventListener("storage", atualizar);

    return () => {
      window.removeEventListener(EVENT_NAME, atualizar);
      window.removeEventListener("storage", atualizar);
    };
  }, []);

  return assembleias;
}

export function useAssembleia(id: string): Assembleia | undefined {
  const assembleias = useAssembleias();

  return assembleias.find((assembleia) => assembleia.id === id);
}