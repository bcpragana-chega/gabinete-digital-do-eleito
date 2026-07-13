import { useEffect, useState } from "react";
import type { Assembleia, EstadoAssembleia } from "./types";
import {
  apagarAssembleiaRemota,
  carregarAssembleiasLocais,
  carregarAssembleiasRemotas,
  guardarAssembleiaRemota,
  atualizarPreparacaoAssembleiaRemota,
  guardarAssembleiasLocais as persistirAssembleiasLocais,
} from "@/lib/assembleias-repository";
import { executarHidratacaoIsolada, executarMutacaoIsolada } from "@/lib/confirmed-mutation";
import { obterUtilizadorSupabaseValidado } from "@/lib/supabase";

const EVENT_NAME = "tribuno:assembleias";
let hidratacaoAtual = 0;

type NovaAssembleiaInput = {
  nome: string;
  data: string;
  hora: string;
  local: string;
  estado: EstadoAssembleia;
};

type EditarAssembleiaInput = NovaAssembleiaInput;

function lerAssembleiasLocais(userId?: string): Assembleia[] {
  return carregarAssembleiasLocais(userId);
}

function guardarAssembleiasLocais(assembleias: Assembleia[], userId?: string) {
  persistirAssembleiasLocais(assembleias, userId);
  window.dispatchEvent(new Event(EVENT_NAME));
}

async function obterUserIdValidado() {
  const user = await obterUtilizadorSupabaseValidado();
  if (!user?.id) throw new Error("AUTH_REQUIRED");
  return user.id;
}

async function guardarAssembleiaRemotamente(userId: string, assembleia: Assembleia) {
  await guardarAssembleiaRemota(userId, assembleia);
}

export async function carregarAssembleiasRemotasSeDisponivel() {
  try {
    const hidratacaoId = ++hidratacaoAtual;
    const userId = await obterUserIdValidado();
    await executarHidratacaoIsolada({
      userId,
      carregarRemoto: carregarAssembleiasRemotas,
      obterUserIdAtivo: async () => (await obterUtilizadorSupabaseValidado())?.id,
      isAtual: () => hidratacaoId === hidratacaoAtual,
      confirmarLocal: (ownerId, remotas) => guardarAssembleiasLocais(remotas ?? [], ownerId),
    });
  } catch {
    console.warn("[Tribuno] Carregamento remoto de sessões falhou.", {
      operacao: "SESSOES_LOAD_FALHOU",
    });
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

export async function adicionarAssembleia(
  input: NovaAssembleiaInput,
  options?: { id?: string },
): Promise<Assembleia> {
  const userId = await obterUserIdValidado();
  const agora = new Date().toISOString();
  const nova: Assembleia = {
    id: options?.id ?? `asm-${crypto.randomUUID()}`,
    nome: input.nome,
    data: input.data,
    hora: input.hora,
    local: input.local,
    estado: input.estado,
    createdAt: agora,
    updatedAt: agora,
  };

  return executarMutacaoIsolada({
    userId,
    persistirRemoto: (ownerId) => guardarAssembleiaRemotamente(ownerId, nova),
    obterUserIdAtivo: async () => (await obterUtilizadorSupabaseValidado())?.id,
    confirmarLocal: (ownerId) => {
      const atuais = lerAssembleiasLocais(ownerId);
      guardarAssembleiasLocais([...atuais.filter((item) => item.id !== nova.id), nova], ownerId);
      return nova;
    },
  });
}

export async function editarAssembleia(id: string, input: EditarAssembleiaInput) {
  const userId = await obterUserIdValidado();
  const atuais = lerAssembleiasLocais(userId);

  const atualizadas = atuais.map((assembleia) =>
    assembleia.id === id
      ? {
          ...assembleia,
          nome: input.nome,
          data: input.data,
          hora: input.hora,
          local: input.local,
          estado: input.estado,
          preparacaoEstado: "em_preparacao" as const,
          dadosConfirmadosEm: undefined,
          revisaoFinalConfirmadaEm: undefined,
          prontaEm: undefined,
          updatedAt: new Date().toISOString(),
        }
      : assembleia,
  );

  const atualizada = atualizadas.find((assembleia) => assembleia.id === id);
  if (!atualizada) return undefined;
  return executarMutacaoIsolada({
    userId,
    persistirRemoto: (ownerId) => guardarAssembleiaRemotamente(ownerId, atualizada),
    obterUserIdAtivo: async () => (await obterUtilizadorSupabaseValidado())?.id,
    confirmarLocal: (ownerId) => {
      guardarAssembleiasLocais(atualizadas, ownerId);
      return atualizada;
    },
  });
}

export async function editarAssembleiaConfirmada(id: string, input: EditarAssembleiaInput) {
  const userId = await obterUserIdValidado();
  const atual = lerAssembleiasLocais(userId).find((assembleia) => assembleia.id === id);
  if (!atual) throw new Error("ASSEMBLEIA_NOT_FOUND");
  const atualizada: Assembleia = {
    ...atual,
    ...input,
    preparacaoEstado: "em_preparacao",
    dadosConfirmadosEm: undefined,
    revisaoFinalConfirmadaEm: undefined,
    prontaEm: undefined,
    updatedAt: new Date().toISOString(),
  };
  await guardarAssembleiaRemota(userId, atualizada);
  if ((await obterUtilizadorSupabaseValidado())?.id !== userId) {
    throw new Error("AUTH_CONTEXT_CHANGED");
  }
  return substituirAssembleiaLocal(atualizada, userId);
}

function substituirAssembleiaLocal(assembleia: Assembleia, userId?: string) {
  const atuais = lerAssembleiasLocais(userId);
  guardarAssembleiasLocais(
    [assembleia, ...atuais.filter((item) => item.id !== assembleia.id)],
    userId,
  );
  return assembleia;
}

/** @internal Garante que a cache só muda depois da confirmação remota. */
export async function persistirPreparacaoConfirmadaComDependencias(
  persistirRemoto: () => Promise<Assembleia>,
  persistirLocal: (assembleia: Assembleia) => Assembleia = substituirAssembleiaLocal,
) {
  const confirmada = await persistirRemoto();
  return persistirLocal(confirmada);
}

async function persistirPreparacaoIsolada(persistirRemoto: () => Promise<Assembleia>) {
  const userId = await obterUserIdValidado();
  const confirmada = await persistirRemoto();
  if ((await obterUtilizadorSupabaseValidado())?.id !== userId) {
    throw new Error("AUTH_CONTEXT_CHANGED");
  }
  return substituirAssembleiaLocal(confirmada, userId);
}

export async function confirmarDadosAssembleia(id: string) {
  const agora = new Date().toISOString();
  return persistirPreparacaoIsolada(() =>
    atualizarPreparacaoAssembleiaRemota(id, {
      dados_confirmados_at: agora,
      revisao_final_confirmada_at: null,
      preparacao_estado: "em_preparacao",
      pronta_em: null,
    }),
  );
}

export async function confirmarRevisaoFinalAssembleia(id: string) {
  return persistirPreparacaoIsolada(() =>
    atualizarPreparacaoAssembleiaRemota(id, {
      revisao_final_confirmada_at: new Date().toISOString(),
      preparacao_estado: "em_preparacao",
      pronta_em: null,
    }),
  );
}

export async function marcarAssembleiaPronta(id: string) {
  return persistirPreparacaoIsolada(() =>
    atualizarPreparacaoAssembleiaRemota(id, {
      preparacao_estado: "pronta",
      pronta_em: new Date().toISOString(),
    }),
  );
}

export async function reabrirPreparacaoAssembleia(id: string) {
  return persistirPreparacaoIsolada(() =>
    atualizarPreparacaoAssembleiaRemota(id, {
      preparacao_estado: "em_preparacao",
      revisao_final_confirmada_at: null,
      pronta_em: null,
    }),
  );
}

export async function arquivarAssembleia(id: string) {
  const userId = await obterUserIdValidado();
  const atuais = lerAssembleiasLocais(userId);
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

  const atualizada = atualizadas.find((assembleia) => assembleia.id === id);
  if (!atualizada) return undefined;
  return executarMutacaoIsolada({
    userId,
    persistirRemoto: (ownerId) => guardarAssembleiaRemotamente(ownerId, atualizada),
    obterUserIdAtivo: async () => (await obterUtilizadorSupabaseValidado())?.id,
    confirmarLocal: (ownerId) => {
      guardarAssembleiasLocais(atualizadas, ownerId);
      return atualizada;
    },
  });
}

export async function apagarAssembleia(id: string): Promise<boolean> {
  const userId = await obterUserIdValidado();
  const atuais = lerAssembleiasLocais(userId);
  const atualizadas = atuais.filter((assembleia) => assembleia.id !== id);

  if (atualizadas.length === atuais.length) return false;

  return executarMutacaoIsolada({
    userId,
    persistirRemoto: () => apagarAssembleiaRemota(id),
    obterUserIdAtivo: async () => (await obterUtilizadorSupabaseValidado())?.id,
    confirmarLocal: (ownerId) => {
      guardarAssembleiasLocais(atualizadas, ownerId);
      return true;
    },
  });
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
