import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { criarAssinaturaMaterialPreparacao } from "./session-preparation-signature";
import type { PontoOrdemTrabalhos } from "./pontos-store";
import type { Assembleia, Documento, DocumentoCriado, Dossie } from "./types";

const sessao: Assembleia = {
  id: "s1",
  nome: "Sessão",
  data: "2026-07-19",
  hora: "18:00",
  local: "Sala",
  estado: "preparacao",
  preparacaoEstado: "pronta",
};
const documento = {
  id: "d1",
  assembleiaId: "s1",
  titulo: "Convocatória",
  tipo: "Convocatória",
  data: "2026-07-19",
  estado: "Revisto",
  createdAt: "2026-07-18T10:00:00Z",
} satisfies Documento;
const ponto = {
  id: "p1",
  assembleiaId: "s1",
  numero: 1,
  titulo: "Orçamento",
  descricao: "Debate",
  estado: "Preparado",
  prioridade: "Alta",
  objetivoPolitico: "Esclarecer",
  posicaoPolitica: "A favor",
  mensagemPrincipal: "Transparência",
  notas: "",
  riscos: "",
  linhaIntervencao: "Questionar",
  notasInternas: "",
  sentidoVoto: "A favor",
  documentos: [],
  perguntas: [],
  acoes: [],
  documentosACriar: [],
} satisfies PontoOrdemTrabalhos;
const politico = {
  id: "r1",
  tipo: "Intervenção",
  titulo: "Intervenção",
  conteudo: "Texto",
  estado: "rascunho",
  assembleiaId: "s1",
  createdAt: "2026-07-18T10:00:00Z",
} satisfies DocumentoCriado;
const estrategia = {
  assembleiaId: "s1",
  objetivoPolitico: "Esclarecer",
  mensagemPrincipal: "Transparência",
  naoFazer: "",
  adversariosPrevisiveis: "",
  notasLivres: "",
};
const assunto = {
  id: "a1",
  titulo: "Mobilidade",
  estado: "ativo",
  prioridade: "Alta",
  objetivoPolitico: "Melhorar transportes",
  resumo: "Contexto",
  tags: ["transportes"],
  createdAt: "2026-07-18T10:00:00Z",
} satisfies Dossie;

function assinatura(
  overrides: Partial<Parameters<typeof criarAssinaturaMaterialPreparacao>[0]> = {},
) {
  return criarAssinaturaMaterialPreparacao({
    sessao,
    documentos: [documento],
    pontos: [ponto],
    estrategia,
    assuntos: [assunto],
    documentosPoliticos: [politico],
    ...overrides,
  });
}

describe("assinatura material da confirmação", () => {
  it("invalida a confirmação quando muda conteúdo material", () => {
    assert.notEqual(
      assinatura(),
      assinatura({ estrategia: { ...estrategia, mensagemPrincipal: "Nova posição" } }),
    );
    assert.notEqual(
      assinatura(),
      assinatura({ assuntos: [{ ...assunto, resumo: "Novo contexto" }] }),
    );
    assert.notEqual(
      assinatura(),
      assinatura({ documentosPoliticos: [{ ...politico, conteudo: "Texto revisto" }] }),
    );
  });

  it("ignora alterações técnicas sem impacto na preparação", () => {
    assert.equal(
      assinatura(),
      assinatura({
        sessao: { ...sessao, updatedAt: "2026-07-19T20:00:00Z" },
        documentos: [{ ...documento, updatedAt: "2026-07-19T20:00:00Z" }],
        pontos: [{ ...ponto, updatedAt: "2026-07-19T20:00:00Z" }],
        documentosPoliticos: [{ ...politico, updatedAt: "2026-07-19T20:00:00Z" }],
      }),
    );
  });

  it("aceita sessões antigas sem campos de confirmação", () => {
    assert.doesNotThrow(() => assinatura({ sessao: { ...sessao, preparacaoEstado: undefined } }));
  });
});
