import { useEffect, useState } from "react";
import {
  aplicarDetalhesAcompanhamento,
  estadoAposAcontecimento,
  obterEstadoAtualAcompanhamento,
  ordenarAcompanhamentos,
  type AcompanhamentoPoliticoInput,
  type DetalhesAcompanhamentoPoliticoInput,
} from "@/lib/acompanhamento-politico";
import {
  atualizarDetalhesAcompanhamentoRemoto,
  guardarAcompanhamentoRemoto,
  listarAcompanhamentosRemotos,
  persistenciaLocalAcompanhamentosPermitida,
} from "@/lib/acompanhamentos-repository";
import { executarMutacaoIsolada } from "@/lib/confirmed-mutation";
import { obterUtilizadorSupabaseValidado } from "@/lib/supabase";
import type { AcompanhamentoPolitico, DocumentoCriado } from "@/lib/types";
import { listarDocumentosACriarDoAssunto } from "@/lib/documentos-a-criar-store";
import {
  guardarJSONParaUtilizador,
  lerJSONParaUtilizador,
  obterUserIdAtual,
} from "@/lib/user-storage";

const EVENT_NAME = "tribuno:acompanhamentos-politicos";
const STORAGE_KEY = "tribuno:acompanhamentos-politicos";
const cachePorUtilizador = new Map<string, AcompanhamentoPolitico[]>();
let utilizadorAtivo: string | undefined;

function emitir() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT_NAME));
}

async function userId() {
  if (persistenciaLocalAcompanhamentosPermitida()) {
    const localId = obterUserIdAtual();
    if (!localId) throw new Error("AUTH_REQUIRED");
    utilizadorAtivo = localId;
    return localId;
  }
  const user = await obterUtilizadorSupabaseValidado();
  if (!user?.id) throw new Error("AUTH_REQUIRED");
  utilizadorAtivo = user.id;
  return user.id;
}

export function listarAcompanhamentos(assuntoId?: string) {
  const atual = obterUserIdAtual();
  if (atual !== utilizadorAtivo) utilizadorAtivo = atual;
  const cache = utilizadorAtivo ? (cachePorUtilizador.get(utilizadorAtivo) ?? []) : [];
  const eventos = assuntoId ? cache.filter((item) => item.assuntoId === assuntoId) : cache;
  return ordenarAcompanhamentos(eventos);
}

export async function hidratarAcompanhamentos() {
  const ownerId = await userId();
  if (persistenciaLocalAcompanhamentosPermitida()) {
    const locais = lerJSONParaUtilizador<AcompanhamentoPolitico[]>(STORAGE_KEY, ownerId, []);
    cachePorUtilizador.set(ownerId, Array.isArray(locais) ? locais : []);
    emitir();
    return listarAcompanhamentos();
  }
  const remotos = await listarAcompanhamentosRemotos(ownerId);
  if ((await userId()) !== ownerId) return [];
  cachePorUtilizador.set(ownerId, remotos);
  emitir();
  return remotos;
}

export function documentosAssociaveisAoAcompanhamento(assuntoId: string): DocumentoCriado[] {
  return listarDocumentosACriarDoAssunto(assuntoId);
}

export async function registarAcontecimento(assuntoId: string, input: AcompanhamentoPoliticoInput) {
  const ownerId = await userId();
  const agora = new Date().toISOString();
  const evento: AcompanhamentoPolitico = {
    id: `acomp-${crypto.randomUUID()}`,
    assuntoId,
    documentoCriadoId: input.documentoCriadoId || undefined,
    tipo: input.tipo,
    data: input.data,
    descricao: input.descricao.trim(),
    destinatario: input.destinatario?.trim() || undefined,
    prazo: input.prazo || undefined,
    proximaAcaoEm: input.proximaAcaoEm || undefined,
    estado: estadoAposAcontecimento(
      input,
      obterEstadoAtualAcompanhamento(listarAcompanhamentos(assuntoId)),
    ),
    createdAt: agora,
    updatedAt: agora,
  };

  if (persistenciaLocalAcompanhamentosPermitida()) {
    const atuais = cachePorUtilizador.get(ownerId) ?? [];
    const atualizados = [...atuais, evento];
    guardarJSONParaUtilizador(STORAGE_KEY, ownerId, atualizados);
    cachePorUtilizador.set(ownerId, atualizados);
    emitir();
    return evento;
  }

  return executarMutacaoIsolada({
    userId: ownerId,
    persistirRemoto: (id) => guardarAcompanhamentoRemoto(id, evento),
    obterUserIdAtivo: async () => (await obterUtilizadorSupabaseValidado())?.id,
    confirmarLocal: () => {
      const atuais = cachePorUtilizador.get(ownerId) ?? [];
      cachePorUtilizador.set(ownerId, [...atuais.filter((item) => item.id !== evento.id), evento]);
      emitir();
      return evento;
    },
  });
}

export async function editarDetalhesAcontecimento(
  eventoId: string,
  input: DetalhesAcompanhamentoPoliticoInput,
) {
  const ownerId = await userId();
  const atuais = cachePorUtilizador.get(ownerId) ?? [];
  const existente = atuais.find((item) => item.id === eventoId);
  if (!existente) throw new Error("ACOMPANHAMENTO_NOT_FOUND_OR_FORBIDDEN");

  const atualizado = aplicarDetalhesAcompanhamento(existente, input, new Date().toISOString());
  if (persistenciaLocalAcompanhamentosPermitida()) {
    const atualizados = atuais.map((item) => (item.id === eventoId ? atualizado : item));
    guardarJSONParaUtilizador(STORAGE_KEY, ownerId, atualizados);
    cachePorUtilizador.set(ownerId, atualizados);
    emitir();
    return atualizado;
  }

  let confirmado: AcompanhamentoPolitico | undefined;
  return executarMutacaoIsolada({
    userId: ownerId,
    persistirRemoto: async (id) => {
      confirmado = await atualizarDetalhesAcompanhamentoRemoto(id, eventoId, input);
    },
    obterUserIdAtivo: async () => (await obterUtilizadorSupabaseValidado())?.id,
    confirmarLocal: () => {
      const eventoConfirmado = confirmado;
      if (!eventoConfirmado) throw new Error("ACOMPANHAMENTO_UPDATE_NOT_CONFIRMED");
      const atuaisDoOwner = cachePorUtilizador.get(ownerId) ?? [];
      cachePorUtilizador.set(
        ownerId,
        atuaisDoOwner.map((item) => (item.id === eventoId ? eventoConfirmado : item)),
      );
      emitir();
      return eventoConfirmado;
    },
  });
}

export function resolverAcompanhamento(
  assuntoId: string,
  descricao = "Problema marcado como resolvido.",
) {
  return registarAcontecimento(assuntoId, {
    tipo: "resolucao",
    data: new Date().toISOString().slice(0, 10),
    descricao,
    estado: "resolvido",
  });
}

export function encerrarAcompanhamento(assuntoId: string) {
  return registarAcontecimento(assuntoId, {
    tipo: "nota",
    data: new Date().toISOString().slice(0, 10),
    descricao: "Acompanhamento encerrado sem resolução.",
    estado: "encerrado_sem_resolucao",
  });
}

export function useAcompanhamentos(assuntoId?: string) {
  const [eventos, setEventos] = useState(() => listarAcompanhamentos(assuntoId));
  useEffect(() => {
    const atualizar = () => setEventos(listarAcompanhamentos(assuntoId));
    atualizar();
    void hidratarAcompanhamentos().catch(() => undefined);
    window.addEventListener(EVENT_NAME, atualizar);
    return () => window.removeEventListener(EVENT_NAME, atualizar);
  }, [assuntoId]);
  return eventos;
}
