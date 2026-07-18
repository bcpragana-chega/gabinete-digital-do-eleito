import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calcularEstadoUxAssunto, sugerirTituloDocumento, tipoPorIntencao } from "@/lib/assunto-ux";
import type { DocumentoCriado } from "@/lib/types";

const base = {
  assuntoId: "assunto-1",
  objetivoPolitico: "Melhorar o espaço público",
  resumo: "Contexto suficiente",
  estado: "ativo" as const,
  totalNotas: 0,
  totalEventos: 0,
  totalDocumentosRelacionados: 0,
  sessoesIds: ["sessao-1"],
  documentosCriados: [] as DocumentoCriado[],
};

describe("próxima ação do assunto", () => {
  it("prioriza objetivo em falta", () => {
    assert.equal(
      calcularEstadoUxAssunto({ ...base, objetivoPolitico: "" }).acaoPrincipal.tipo,
      "editar",
    );
  });

  it("prioriza contexto em falta", () => {
    assert.equal(
      calcularEstadoUxAssunto({ ...base, resumo: "", sessoesIds: [] }).titulo,
      "Adicionar contexto ao assunto",
    );
  });

  it("recomenda documento sem depender de sessão", () => {
    const estado = calcularEstadoUxAssunto({ ...base, sessoesIds: [] });
    assert.equal(estado.titulo, "Preparar um documento");
    assert.equal(estado.acaoPrincipal.label, "Criar documento");
    assert.equal(estado.acoesSecundarias[0]?.label, "Associar sessão mais tarde");
  });

  it("recomenda documento quando contexto e sessão existem", () => {
    assert.equal(calcularEstadoUxAssunto(base).titulo, "Preparar um documento");
  });

  it("abre rascunho para revisão", () => {
    const documento = {
      id: "doc-1",
      titulo: "Moção",
      tipo: "Moção",
      conteudo: "",
      estado: "rascunho",
      assuntoId: "assunto-1",
      createdAt: "2026-07-12T00:00:00Z",
    } as DocumentoCriado;
    assert.equal(
      calcularEstadoUxAssunto({ ...base, documentosCriados: [documento] }).acaoPrincipal.label,
      "Abrir e rever",
    );
  });
});

describe("criação por intenção", () => {
  it("mapeia intenções para tipos editáveis", () => {
    assert.equal(tipoPorIntencao("proposta"), "Recomendação");
    assert.equal(tipoPorIntencao("informacoes"), "Requerimento");
  });

  it("sugere título localmente", () => {
    assert.equal(
      sugerirTituloDocumento({ tipo: "Recomendação", assuntoTitulo: "Iluminação pública" }),
      "Recomendação sobre Iluminação pública",
    );
  });
});
