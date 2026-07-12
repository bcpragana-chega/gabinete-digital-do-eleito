import { useEffect, useState } from "react";
import type { Assembleia, EstadoAssembleia } from "./types";
import {
  apagarAssembleiaRemota,
  carregarAssembleiasLocais,
  carregarAssembleiasRemotas,
  guardarAssembleiaRemota,
  guardarAssembleiasLocais as persistirAssembleiasLocais,
} from "@/lib/assembleias-repository";
import { obterUserIdAtual } from "@/lib/user-storage";

const EVENT_NAME = "tribuno:assembleias";

type NovaAssembleiaInput = {
  nome: string;
  data: string;
  hora: string;
  local: string;
  estado: EstadoAssembleia;
};

type EditarAssembleiaInput = NovaAssembleiaInput;

function lerAssembleiasLocais(): Assembleia[] {
  return carregarAssembleiasLocais();
}

function guardarAssembleiasLocais(assembleias: Assembleia[]) {
  persistirAssembleiasLocais(assembleias);
  window.dispatchEvent(new Event(EVENT_NAME));
}

function guardarAssembleiaRemotamente(assembleia: Assembleia) {
  const userId = obterUserIdAtual();
  if (!userId) return;

  void guardarAssembleiaRemota(userId, assembleia).catch((error) => {
    console.warn("[Tribuno] Sessão guardada localmente, mas falhou no Supabase.", error);
  });
}

function apagarAssembleiaRemotamente(id: string) {
  void apagarAssembleiaRemota(id).catch((error) => {
    console.warn("[Tribuno] Sessão apagada localmente, mas falhou no Supabase.", error);
  });
}

async function carregarAssembleiasRemotasSeDisponivel() {
  try {
    const remotas = await carregarAssembleiasRemotas();
    if (!remotas) return;

    guardarAssembleiasLocais(remotas);
  } catch (error) {
    console.warn("[Tribuno] Não foi possível carregar sessões do Supabase.", error);
  }
}

export function listarAssembleias(): Assembleia[] {
  return lerAssembleiasLocais().sort((a, b) => {
    const dataA = `${a.data}T${a.hora || "00:00"}`;
    const dataB = `${b.data}T${b.hora || "00:00"}`;

    return dataB.localeCompare(dataA);
  });
}

export function obterAssembleia(id: string): Assembleia | undefined {
  return listarAssembleias().find((assembleia) => assembleia.id === id);
}

export function adicionarAssembleia(input: NovaAssembleiaInput): Assembleia {
  const agora = new Date().toISOString();
  const nova: Assembleia = {
    id: `asm-${crypto.randomUUID()}`,
    nome: input.nome,
    data: input.data,
    hora: input.hora,
    local: input.local,
    estado: input.estado,
    createdAt: agora,
    updatedAt: agora,
  };

  const atuais = lerAssembleiasLocais();
  guardarAssembleiasLocais([...atuais, nova]);
  guardarAssembleiaRemotamente(nova);

  return nova;
}

export function editarAssembleia(id: string, input: EditarAssembleiaInput): Assembleia | undefined {
  const atuais = lerAssembleiasLocais();

  const atualizadas = atuais.map((assembleia) =>
    assembleia.id === id
      ? {
          ...assembleia,
          nome: input.nome,
          data: input.data,
          hora: input.hora,
          local: input.local,
          estado: input.estado,
          updatedAt: new Date().toISOString(),
        }
      : assembleia,
  );

  guardarAssembleiasLocais(atualizadas);
  const atualizada = atualizadas.find((assembleia) => assembleia.id === id);
  if (atualizada) guardarAssembleiaRemotamente(atualizada);

  return atualizada;
}

export function arquivarAssembleia(id: string): Assembleia | undefined {
  const atuais = lerAssembleiasLocais();
  const agora = new Date().toISOString();

  const atualizadas = atuais.map((assembleia) =>
    assembleia.id === id
      ? {
          ...assembleia,
          estado: "arquivada" as EstadoAssembleia,
          archivedAt: agora,
          updatedAt: agora,
        }
      : assembleia,
  );

  guardarAssembleiasLocais(atualizadas);
  const atualizada = atualizadas.find((assembleia) => assembleia.id === id);
  if (atualizada) guardarAssembleiaRemotamente(atualizada);

  return atualizada;
}

export function apagarAssembleia(id: string): boolean {
  const atuais = lerAssembleiasLocais();
  const atualizadas = atuais.filter((assembleia) => assembleia.id !== id);

  if (atualizadas.length === atuais.length) return false;

  guardarAssembleiasLocais(atualizadas);
  apagarAssembleiaRemotamente(id);

  return true;
}

export function useAssembleias(): Assembleia[] {
  const [assembleias, setAssembleias] = useState<Assembleia[]>([]);

  useEffect(() => {
    const atualizar = () => {
      setAssembleias(listarAssembleias());
    };

    atualizar();
    void carregarAssembleiasRemotasSeDisponivel();

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
