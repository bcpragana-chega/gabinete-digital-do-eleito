import assert from "node:assert/strict";
import { test } from "node:test";
import {
  construirContextoGeracaoDocumento,
  construirFactosEspecificos,
} from "@/lib/ai/context-builder.server";
import type { AssuntoContexto } from "@/lib/ai/types";

test("contexto de geração inclui assunto, notas, timeline, anteriores, anexos e entrada", async () => {
  const fetchAnterior = globalThis.fetch;
  const urlAnterior = process.env.SUPABASE_URL;
  const chaveAnterior = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_URL = "https://supabase.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";

  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = new URL(String(input));
    const tabela = url.pathname.split("/").at(-1);
    const dados: Record<string, unknown[]> = {
      profiles: [
        {
          nome_institucional: "Eleito Teste",
          cargo: "Membro da Assembleia de Freguesia",
          orgao: "Assembleia de Freguesia",
          organizacao: "Grupo Municipal",
          territorio: "Porches",
          municipio: "Lagoa",
          freguesia: "Porches",
          assinatura_institucional: null,
        },
      ],
      assuntos: [
        {
          id: "assunto-1",
          titulo: "Mobilidade local",
          descricao: "Descrição factual",
          objetivo_politico: "Melhorar acessos",
          prioridade: "Alta",
          estado: "ativo",
          tags: ["mobilidade"],
          created_at: "2026-07-01T10:00:00.000Z",
          updated_at: "2026-07-10T10:00:00.000Z",
        },
      ],
      documentos_criados: [
        {
          id: "anterior-1",
          tipo: "recomendacao",
          titulo: "Documento anterior",
          conteudo: "Conteúdo anterior",
          resumo: null,
          notas: null,
          created_at: "2026-07-02T10:00:00.000Z",
          updated_at: "2026-07-02T10:00:00.000Z",
          assembleia_id: null,
        },
      ],
      documentos: [
        {
          id: "anexo-1",
          tipo: "relatorio",
          titulo: "Anexo factual",
          texto_extraido: "Texto extraído do anexo",
          resumo: null,
          notas: null,
          assembleia_origem_id: null,
        },
      ],
    };

    return {
      ok: true,
      json: async () => dados[tabela ?? ""] ?? [],
    } as Response;
  }) as typeof fetch;

  try {
    const contexto = await construirContextoGeracaoDocumento(
      { authenticatedUserId: "user-1" },
      {
        assuntoId: "assunto-1",
        tipo: "Recomendação",
        titulo: "Recomendação sobre mobilidade",
        conteudoInicial: "Informação adicional do eleito",
        documentosRelacionadosIds: ["anexo-1"],
        assuntoNotas: ["Nota factual"],
        assuntoTimeline: ["2026-07-10 · Reunião realizada"],
      },
    );

    assert.deepEqual(
      {
        titulo: contexto.assunto.titulo,
        descricao: contexto.assunto.descricao,
        objetivo: contexto.assunto.objetivo,
        prioridade: contexto.assunto.prioridade,
        estado: contexto.assunto.estado,
        tags: contexto.assunto.tags,
        notas: contexto.assunto.notas,
        timeline: contexto.assunto.timeline,
        conteudoInicial: contexto.entrada.conteudoInicial,
        documentoAnterior: contexto.documentosRelacionados[0]?.conteudo,
        anexo: contexto.anexosTextuais[0]?.textoExtraido,
      },
      {
        titulo: "Mobilidade local",
        descricao: "Descrição factual",
        objetivo: "Melhorar acessos",
        prioridade: "Alta",
        estado: "ativo",
        tags: ["mobilidade"],
        notas: ["Nota factual"],
        timeline: ["2026-07-10 · Reunião realizada"],
        conteudoInicial: "Informação adicional do eleito",
        documentoAnterior: "Conteúdo anterior",
        anexo: "Texto extraído do anexo",
      },
    );
  } finally {
    globalThis.fetch = fetchAnterior;
    if (urlAnterior === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = urlAnterior;
    if (chaveAnterior === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = chaveAnterior;
  }
});

test("factos específicos distinguem Assuntos com o mesmo título sem contaminação", () => {
  const base: AssuntoContexto = {
    id: "assunto",
    titulo: "Iluminação pública",
    tags: [],
    notas: [],
    timeline: [],
    historico: [],
  };
  const assuntoA = {
    ...base,
    id: "assunto-a",
    descricao:
      "Rua da Igreja, Porches. Três candeeiros apagados. Situação reportada há dois meses.",
  };
  const assuntoB = {
    ...base,
    id: "assunto-b",
    descricao:
      "Urbanização das Acácias. Troço pedonal sem qualquer ponto de iluminação. Residentes utilizam o percurso durante a noite.",
  };

  const factosA = construirFactosEspecificos(assuntoA, [], [])
    .map((facto) => facto.resumo)
    .join(" ");
  const factosB = construirFactosEspecificos(assuntoB, [], [])
    .map((facto) => facto.resumo)
    .join(" ");

  assert.match(factosA, /Rua da Igreja, Porches/);
  assert.match(factosA, /Três candeeiros apagados/);
  assert.match(factosA, /dois meses/);
  assert.doesNotMatch(factosA, /Urbanização das Acácias|troço pedonal/i);
  assert.match(factosB, /Urbanização das Acácias/);
  assert.match(factosB, /Troço pedonal sem qualquer ponto de iluminação/);
  assert.match(factosB, /durante a noite/);
  assert.doesNotMatch(factosB, /Rua da Igreja|três candeeiros|dois meses/i);
});
