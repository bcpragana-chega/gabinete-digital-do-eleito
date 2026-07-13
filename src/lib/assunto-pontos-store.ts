import { useEffect, useState } from "react";
import { getSupabaseClient, withSupabaseTimeout } from "@/lib/supabase";
import {
  listarRelacoesPorObjeto,
  listarRelacoesTribuno,
  removerRelacaoTribunoPorObjetos,
} from "@/lib/relacoes-store";
import type { AssuntoPontoRelacionado } from "@/lib/types";

const EVENT = "tribuno:assunto-pontos";
let remotas: AssuntoPontoRelacionado[] = [];

async function contexto() {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("SUPABASE_NOT_CONFIGURED");
  const { data, error } = await withSupabaseTimeout(
    supabase.auth.getSession(),
    "ASSUNTO_PONTOS_AUTH",
  );
  if (error || !data.session?.user.id) throw new Error("AUTH_REQUIRED");
  return { supabase, userId: data.session.user.id };
}

function mapear(row: { id: string; assunto_id: string; ponto_id: string; created_at: string }) {
  return {
    id: row.id,
    assuntoId: row.assunto_id,
    pontoId: row.ponto_id,
    createdAt: row.created_at,
  };
}

export function listarAssuntosDoPonto(pontoId: string) {
  const porAssunto = new Map<string, AssuntoPontoRelacionado>();
  listarRelacoesPorObjeto("ponto", pontoId)
    .filter(
      (r) => r.origemTipo === "ponto" && r.origemId === pontoId && r.destinoTipo === "assunto",
    )
    .forEach((r) =>
      porAssunto.set(r.destinoId, {
        id: r.id,
        assuntoId: r.destinoId,
        pontoId,
        createdAt: r.createdAt,
      }),
    );
  remotas.filter((r) => r.pontoId === pontoId).forEach((r) => porAssunto.set(r.assuntoId, r));
  return Array.from(porAssunto.values());
}

export async function carregarAssuntosDosPontos() {
  const { supabase, userId } = await contexto();
  const legadas = listarRelacoesTribuno().filter(
    (r) =>
      r.origemTipo === "ponto" &&
      r.destinoTipo === "assunto" &&
      r.tipoRelacao === "relacionado_com",
  );
  if (legadas.length > 0) {
    const { error: migrationError } = await withSupabaseTimeout(
      supabase.from("assunto_pontos").upsert(
        legadas.map((r) => ({
          user_id: userId,
          assunto_id: r.destinoId,
          ponto_id: r.origemId,
          created_at: r.createdAt,
        })),
        { onConflict: "user_id,assunto_id,ponto_id", ignoreDuplicates: true },
      ),
      "ASSUNTO_PONTOS_MIGRATE",
    );
    if (migrationError) throw migrationError;
  }
  const { data, error } = await withSupabaseTimeout(
    supabase.from("assunto_pontos").select("id,assunto_id,ponto_id,created_at"),
    "ASSUNTO_PONTOS_SELECT",
  );
  if (error) throw error;
  remotas = (data ?? []).map((row) => mapear(row as never));
  window.dispatchEvent(new Event(EVENT));
  return remotas;
}

export async function associarAssuntoAoPonto(assuntoId: string, pontoId: string) {
  const { supabase, userId } = await contexto();
  const { data, error } = await withSupabaseTimeout(
    supabase
      .from("assunto_pontos")
      .upsert(
        { user_id: userId, assunto_id: assuntoId, ponto_id: pontoId },
        { onConflict: "user_id,assunto_id,ponto_id" },
      )
      .select("id,assunto_id,ponto_id,created_at")
      .single(),
    "ASSUNTO_PONTOS_UPSERT",
  );
  if (error) throw error;
  if (!data) throw new Error("ASSUNTO_PONTO_NOT_CONFIRMED");
  const relacao = mapear(data as never);
  remotas = [
    relacao,
    ...remotas.filter((r) => !(r.assuntoId === assuntoId && r.pontoId === pontoId)),
  ];
  window.dispatchEvent(new Event(EVENT));
  return relacao;
}

export async function desassociarAssuntoDoPonto(assuntoId: string, pontoId: string) {
  const { supabase } = await contexto();
  const { error } = await withSupabaseTimeout(
    supabase.from("assunto_pontos").delete().eq("assunto_id", assuntoId).eq("ponto_id", pontoId),
    "ASSUNTO_PONTOS_DELETE",
  );
  if (error) throw error;
  remotas = remotas.filter((r) => !(r.assuntoId === assuntoId && r.pontoId === pontoId));
  removerRelacaoTribunoPorObjetos({
    origemTipo: "ponto",
    origemId: pontoId,
    destinoTipo: "assunto",
    destinoId: assuntoId,
    tipoRelacao: "relacionado_com",
  });
  window.dispatchEvent(new Event(EVENT));
}

export function useAssuntosDoPonto(pontoId: string) {
  const [relacoes, setRelacoes] = useState<AssuntoPontoRelacionado[]>([]);
  useEffect(() => {
    const atualizar = () => setRelacoes(listarAssuntosDoPonto(pontoId));
    atualizar();
    void carregarAssuntosDosPontos().catch(() => undefined);
    window.addEventListener(EVENT, atualizar);
    return () => window.removeEventListener(EVENT, atualizar);
  }, [pontoId]);
  return relacoes;
}
