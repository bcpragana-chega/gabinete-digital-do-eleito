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

  void guardarAssembleiaRemota(userId, assembleia).catch(() => {
    console.warn("[Tribuno] Sincronização de sessão falhou.", {
      operacao: "SESSAO_SYNC_FALHOU",
      documentoId: assembleia.id.slice(0, 8),
    });
  });
}

function apagarAssembleiaRemotamente(id: string) {
  void apagarAssembleiaRemota(id).catch(() => {
    console.warn("[Tribuno] Eliminação remota de sessão falhou.", {
      operacao: "SESSAO_DELETE_FALHOU",
      documentoId: id.slice(0, 8),
    });
  });
}

async function carregarAssembleiasRemotasSeDisponivel() {
  try {
    const remotas = await carregarAssembleiasRemotas();
    if (!remotas) return;

    guardarAssembleiasLocais(remotas);
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
          preparacaoEstado: "em_preparacao" as const,
          dadosConfirmadosEm: undefined,
          revisaoFinalConfirmadaEm: undefined,
          prontaEm: undefined,
          updatedAt: new Date().toISOString(),
        }
      : assembleia,
  );

  guardarAssembleiasLocais(atualizadas);
  const atualizada = atualizadas.find((assembleia) => assembleia.id === id);
  if (atualizada) guardarAssembleiaRemotamente(atualizada);

  return atualizada;
}

export async function editarAssembleiaConfirmada(id: string, input: EditarAssembleiaInput) {
  const atual = lerAssembleiasLocais().find((assembleia) => assembleia.id === id);
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
  const userId = obterUserIdAtual();
  if (!userId) throw new Error("AUTH_REQUIRED");
  await guardarAssembleiaRemota(userId, atualizada);
  return substituirAssembleiaLocal(atualizada);
}

function substituirAssembleiaLocal(assembleia: Assembleia) {
  const atuais = lerAssembleiasLocais();
  guardarAssembleiasLocais([assembleia, ...atuais.filter((item) => item.id !== assembleia.id)]);
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

export async function confirmarDadosAssembleia(id: string) {
  const agora = new Date().toISOString();
  return persistirPreparacaoConfirmadaComDependencias(() =>
    atualizarPreparacaoAssembleiaRemota(id, {
      dados_confirmados_at: agora,
      revisao_final_confirmada_at: null,
      preparacao_estado: "em_preparacao",
      pronta_em: null,
    }),
  );
}

export async function confirmarRevisaoFinalAssembleia(id: string) {
  return persistirPreparacaoConfirmadaComDependencias(() =>
    atualizarPreparacaoAssembleiaRemota(id, {
      revisao_final_confirmada_at: new Date().toISOString(),
      preparacao_estado: "em_preparacao",
      pronta_em: null,
    }),
  );
}

export async function marcarAssembleiaPronta(id: string) {
  return persistirPreparacaoConfirmadaComDependencias(() =>
    atualizarPreparacaoAssembleiaRemota(id, {
      preparacao_estado: "pronta",
      pronta_em: new Date().toISOString(),
    }),
  );
}

export async function reabrirPreparacaoAssembleia(id: string) {
  return persistirPreparacaoConfirmadaComDependencias(() =>
    atualizarPreparacaoAssembleiaRemota(id, {
      preparacao_estado: "em_preparacao",
      revisao_final_confirmada_at: null,
      pronta_em: null,
    }),
  );
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
