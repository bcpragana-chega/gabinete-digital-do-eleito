import { useEffect, useState } from "react";
import { adicionarEventoAutomaticoTimelineDossie } from "./dossie-timeline-store";
import {
  criarRelacaoTribuno,
  listarRelacoesPorObjeto,
  removerRelacaoTribunoPorObjetos,
} from "./relacoes-store";
import type { DossieAssembleiaRelacionada } from "./types";

const STORAGE_KEY = "tribuno.dossie-assembleias.v1";
const EVENT_NAME = "tribuno:dossie-assembleias";
const RELACOES_EVENT_NAME = "tribuno:relacoes";

function isBrowser() {
  return typeof window !== "undefined";
}

function lerRelacoesLegadas(): DossieAssembleiaRelacionada[] {
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

function relacaoId(dossieId: string, assembleiaId: string) {
  return `relacao-sessao-assunto-${assembleiaId}-${dossieId}`;
}

function mapearRelacao(dossieId: string, assembleiaId: string, createdAt?: string) {
  return {
    id: relacaoId(dossieId, assembleiaId),
    dossieId,
    assembleiaId,
    createdAt: createdAt ?? new Date().toISOString(),
  };
}

function migrarRelacoesLegadas() {
  lerRelacoesLegadas().forEach((relacao) => {
    criarRelacaoTribuno({
      origemTipo: "sessao",
      origemId: relacao.assembleiaId,
      destinoTipo: "assunto",
      destinoId: relacao.dossieId,
      tipoRelacao: "discutido_em",
    });
  });
}

function relacoesDoDossie(dossieId: string): DossieAssembleiaRelacionada[] {
  migrarRelacoesLegadas();

  const porChave = new Map<string, DossieAssembleiaRelacionada>();

  lerRelacoesLegadas()
    .filter((relacao) => relacao.dossieId === dossieId)
    .forEach((relacao) => porChave.set(relacao.assembleiaId, relacao));

  listarRelacoesPorObjeto("assunto", dossieId)
    .filter(
      (relacao) =>
        relacao.origemTipo === "sessao" &&
        relacao.destinoTipo === "assunto" &&
        relacao.destinoId === dossieId &&
        relacao.tipoRelacao === "discutido_em",
    )
    .forEach((relacao) =>
      porChave.set(
        relacao.origemId,
        mapearRelacao(dossieId, relacao.origemId, relacao.createdAt),
      ),
    );

  return Array.from(porChave.values());
}

function relacoesDaAssembleia(assembleiaId: string): DossieAssembleiaRelacionada[] {
  migrarRelacoesLegadas();

  const porChave = new Map<string, DossieAssembleiaRelacionada>();

  lerRelacoesLegadas()
    .filter((relacao) => relacao.assembleiaId === assembleiaId)
    .forEach((relacao) => porChave.set(relacao.dossieId, relacao));

  listarRelacoesPorObjeto("sessao", assembleiaId)
    .filter(
      (relacao) =>
        relacao.origemTipo === "sessao" &&
        relacao.origemId === assembleiaId &&
        relacao.destinoTipo === "assunto" &&
        relacao.tipoRelacao === "discutido_em",
    )
    .forEach((relacao) =>
      porChave.set(
        relacao.destinoId,
        mapearRelacao(relacao.destinoId, assembleiaId, relacao.createdAt),
      ),
    );

  return Array.from(porChave.values());
}

export function listarAssembleiasDoDossie(dossieId: string): DossieAssembleiaRelacionada[] {
  return relacoesDoDossie(dossieId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listarDossiesAssociadosAAssembleia(
  assembleiaId: string,
): DossieAssembleiaRelacionada[] {
  return relacoesDaAssembleia(assembleiaId);
}

export function associarAssembleiaAoDossie(
  dossieId: string,
  assembleiaId: string,
): DossieAssembleiaRelacionada | undefined {
  const existente = listarAssembleiasDoDossie(dossieId).find(
    (relacao) => relacao.assembleiaId === assembleiaId,
  );

  if (existente) return existente;

  const relacaoGenerica = criarRelacaoTribuno({
    origemTipo: "sessao",
    origemId: assembleiaId,
    destinoTipo: "assunto",
    destinoId: dossieId,
    tipoRelacao: "discutido_em",
  });

  adicionarEventoAutomaticoTimelineDossie(dossieId, {
    titulo: "Sessão ligada",
    descricao: "Uma sessão existente foi ligada a este assunto.",
    tipo: "assembleia",
    origemTipo: "assembleia",
    origemId: assembleiaId,
    origemHref: `/assembleias/${assembleiaId}`,
  });

  if (isBrowser()) window.dispatchEvent(new Event(EVENT_NAME));

  return mapearRelacao(dossieId, assembleiaId, relacaoGenerica.createdAt);
}

export function desassociarAssembleiaDoDossie(dossieId: string, assembleiaId: string) {
  removerRelacaoTribunoPorObjetos({
    origemTipo: "sessao",
    origemId: assembleiaId,
    destinoTipo: "assunto",
    destinoId: dossieId,
    tipoRelacao: "discutido_em",
  });

  if (isBrowser()) window.dispatchEvent(new Event(EVENT_NAME));
}

export function useAssembleiasDoDossie(dossieId: string): DossieAssembleiaRelacionada[] {
  const [relacoes, setRelacoes] = useState<DossieAssembleiaRelacionada[]>([]);

  useEffect(() => {
    const atualizar = () => {
      setRelacoes(listarAssembleiasDoDossie(dossieId));
    };

    atualizar();

    window.addEventListener(EVENT_NAME, atualizar);
    window.addEventListener(RELACOES_EVENT_NAME, atualizar);
    window.addEventListener("storage", atualizar);

    return () => {
      window.removeEventListener(EVENT_NAME, atualizar);
      window.removeEventListener(RELACOES_EVENT_NAME, atualizar);
      window.removeEventListener("storage", atualizar);
    };
  }, [dossieId]);

  return relacoes;
}
