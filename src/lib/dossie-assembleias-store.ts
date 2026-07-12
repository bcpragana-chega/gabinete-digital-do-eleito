import { useEffect, useState } from "react";
import { adicionarEventoAutomaticoTimelineDossie } from "./dossie-timeline-store";
import {
  criarRelacaoTribuno,
  listarRelacoesPorObjeto,
  listarRelacoesTribuno,
  removerRelacaoTribunoPorObjetos,
} from "./relacoes-store";
import { getSupabaseClient, withSupabaseTimeout } from "./supabase";
import type { DossieAssembleiaRelacionada } from "./types";
import { lerJSONPorUtilizador } from "./user-storage";

const STORAGE_KEY = "tribuno:dossie-assembleias";
const EVENT_NAME = "tribuno:dossie-assembleias";
const RELACOES_EVENT_NAME = "tribuno:relacoes";

type AssuntoSessaoRow = {
  assunto_id: string;
  sessao_id: string;
  created_at: string;
};

let relacoesRemotas: DossieAssembleiaRelacionada[] = [];
let remoteUserId: string | undefined;
let sincronizacaoEmCurso: Promise<void> | undefined;

function isBrowser() {
  return typeof window !== "undefined";
}

function lerRelacoesLegadas(): DossieAssembleiaRelacionada[] {
  const parsed = lerJSONPorUtilizador<DossieAssembleiaRelacionada[]>(STORAGE_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
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

function relacoesLocaisDoDossie(dossieId: string): DossieAssembleiaRelacionada[] {
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
      porChave.set(relacao.origemId, mapearRelacao(dossieId, relacao.origemId, relacao.createdAt)),
    );

  return Array.from(porChave.values());
}

function relacoesDoDossie(dossieId: string): DossieAssembleiaRelacionada[] {
  migrarRelacoesLegadas();

  const porChave = new Map<string, DossieAssembleiaRelacionada>();

  relacoesLocaisDoDossie(dossieId).forEach((relacao) =>
    porChave.set(relacao.assembleiaId, relacao),
  );

  relacoesRemotas
    .filter((relacao) => relacao.dossieId === dossieId)
    .forEach((relacao) => porChave.set(relacao.assembleiaId, relacao));

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

  relacoesRemotas
    .filter((relacao) => relacao.assembleiaId === assembleiaId)
    .forEach((relacao) => porChave.set(relacao.dossieId, relacao));

  return Array.from(porChave.values());
}

async function obterSessaoSupabase() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }

  const { data, error } = await withSupabaseTimeout(
    supabase.auth.getSession(),
    "ASSUNTO_SESSOES_GET_SESSION",
  );

  const userId = data.session?.user.id;
  if (error || !userId) {
    throw new Error("AUTH_REQUIRED");
  }

  return { supabase, userId };
}

async function carregarRelacoesRemotas() {
  const { supabase, userId } = await obterSessaoSupabase();

  if (remoteUserId && remoteUserId !== userId) {
    relacoesRemotas = [];
  }
  remoteUserId = userId;

  const { data, error } = await withSupabaseTimeout(
    supabase
      .from("assunto_sessoes")
      .select("assunto_id,sessao_id,created_at")
      .order("created_at", { ascending: false }),
    "ASSUNTO_SESSOES_SELECT",
  );

  if (error) throw error;

  relacoesRemotas = ((data ?? []) as AssuntoSessaoRow[]).map((row) =>
    mapearRelacao(row.assunto_id, row.sessao_id, row.created_at),
  );
}

async function migrarRelacoesLocaisParaRemoto() {
  const { supabase, userId } = await obterSessaoSupabase();
  const locaisPorChave = new Map<string, DossieAssembleiaRelacionada>();

  lerRelacoesLegadas().forEach((relacao) =>
    locaisPorChave.set(`${relacao.dossieId}:${relacao.assembleiaId}`, relacao),
  );

  listarRelacoesTribuno()
    .filter(
      (relacao) =>
        relacao.origemTipo === "sessao" &&
        relacao.destinoTipo === "assunto" &&
        relacao.tipoRelacao === "discutido_em",
    )
    .forEach((relacao) => {
      const local = mapearRelacao(relacao.destinoId, relacao.origemId, relacao.createdAt);
      locaisPorChave.set(`${local.dossieId}:${local.assembleiaId}`, local);
    });

  if (locaisPorChave.size === 0) return;

  const rows = Array.from(locaisPorChave.values()).map((relacao) => ({
    user_id: userId,
    assunto_id: relacao.dossieId,
    sessao_id: relacao.assembleiaId,
    created_at: relacao.createdAt,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await withSupabaseTimeout(
    supabase.from("assunto_sessoes").upsert(rows, {
      onConflict: "user_id,assunto_id,sessao_id",
      ignoreDuplicates: true,
    }),
    "ASSUNTO_SESSOES_MIGRATE",
  );

  if (error) throw error;
}

async function sincronizarRelacoesRemotas() {
  if (sincronizacaoEmCurso) return sincronizacaoEmCurso;

  sincronizacaoEmCurso = (async () => {
    await carregarRelacoesRemotas();
    await migrarRelacoesLocaisParaRemoto();
    await carregarRelacoesRemotas();
  })().finally(() => {
    sincronizacaoEmCurso = undefined;
  });

  return sincronizacaoEmCurso;
}

export function listarAssembleiasDoDossie(dossieId: string): DossieAssembleiaRelacionada[] {
  return relacoesDoDossie(dossieId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listarDossiesAssociadosAAssembleia(
  assembleiaId: string,
): DossieAssembleiaRelacionada[] {
  return relacoesDaAssembleia(assembleiaId);
}

export async function associarAssembleiaAoDossie(
  dossieId: string,
  assembleiaId: string,
): Promise<DossieAssembleiaRelacionada | undefined> {
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
  const relacao = mapearRelacao(dossieId, assembleiaId, relacaoGenerica.createdAt);

  try {
    const { supabase, userId } = await obterSessaoSupabase();
    const { error } = await withSupabaseTimeout(
      supabase.from("assunto_sessoes").upsert(
        {
          user_id: userId,
          assunto_id: dossieId,
          sessao_id: assembleiaId,
          created_at: relacao.createdAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,assunto_id,sessao_id" },
      ),
      "ASSUNTO_SESSOES_UPSERT",
    );

    if (error) throw error;

    relacoesRemotas = [
      relacao,
      ...relacoesRemotas.filter(
        (item) => !(item.dossieId === dossieId && item.assembleiaId === assembleiaId),
      ),
    ];
  } catch (error) {
    removerRelacaoTribunoPorObjetos({
      origemTipo: "sessao",
      origemId: assembleiaId,
      destinoTipo: "assunto",
      destinoId: dossieId,
      tipoRelacao: "discutido_em",
    });
    throw error;
  }

  adicionarEventoAutomaticoTimelineDossie(dossieId, {
    titulo: "Sessão ligada",
    descricao: "Uma sessão existente foi ligada a este assunto.",
    tipo: "assembleia",
    origemTipo: "assembleia",
    origemId: assembleiaId,
    origemHref: `/sessoes/${assembleiaId}`,
  });

  if (isBrowser()) window.dispatchEvent(new Event(EVENT_NAME));

  return relacao;
}

export async function desassociarAssembleiaDoDossie(dossieId: string, assembleiaId: string) {
  const { supabase } = await obterSessaoSupabase();
  const { error } = await withSupabaseTimeout(
    supabase
      .from("assunto_sessoes")
      .delete()
      .eq("assunto_id", dossieId)
      .eq("sessao_id", assembleiaId),
    "ASSUNTO_SESSOES_DELETE",
  );

  if (error) throw error;

  removerRelacaoTribunoPorObjetos({
    origemTipo: "sessao",
    origemId: assembleiaId,
    destinoTipo: "assunto",
    destinoId: dossieId,
    tipoRelacao: "discutido_em",
  });

  relacoesRemotas = relacoesRemotas.filter(
    (item) => !(item.dossieId === dossieId && item.assembleiaId === assembleiaId),
  );

  if (isBrowser()) window.dispatchEvent(new Event(EVENT_NAME));
}

export function useAssembleiasDoDossie(dossieId: string): DossieAssembleiaRelacionada[] {
  const [relacoes, setRelacoes] = useState<DossieAssembleiaRelacionada[]>([]);

  useEffect(() => {
    let ativo = true;

    const atualizar = () => {
      if (ativo) setRelacoes(listarAssembleiasDoDossie(dossieId));
    };

    atualizar();

    void sincronizarRelacoesRemotas()
      .then(atualizar)
      .catch((error) => {
        console.warn("[Tribuno] Não foi possível sincronizar relações assunto-sessão.", error);
      });

    window.addEventListener(EVENT_NAME, atualizar);
    window.addEventListener(RELACOES_EVENT_NAME, atualizar);
    window.addEventListener("storage", atualizar);

    return () => {
      ativo = false;
      window.removeEventListener(EVENT_NAME, atualizar);
      window.removeEventListener(RELACOES_EVENT_NAME, atualizar);
      window.removeEventListener("storage", atualizar);
    };
  }, [dossieId]);

  return relacoes;
}
