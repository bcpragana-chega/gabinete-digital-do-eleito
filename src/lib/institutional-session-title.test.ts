import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  gerarTituloSessaoInstitucional,
  gerarTituloSessaoManual,
  resolverTituloSessaoInstitucional,
} from "./institutional-session-title";

describe("título determinístico da sessão institucional", () => {
  it("compõe sessão ordinária com freguesia e data legível", () => {
    assert.equal(
      gerarTituloSessaoInstitucional({
        tipo: "ordinaria",
        entidade: "Freguesia de Porches",
        data: "2026-04-28",
      }),
      "Sessão ordinária · Porches · 28 abril 2026",
    );
  });

  it("compõe sessão extraordinária com assembleia municipal", () => {
    assert.equal(
      gerarTituloSessaoInstitucional({
        tipo: "extraordinaria",
        entidade: "Assembleia Municipal de Lagoa",
        data: "2026-05-15",
      }),
      "Sessão extraordinária · Lagoa · 15 maio 2026",
    );
  });

  it("omite tipo desconhecido e remove o prefixo institucional", () => {
    assert.equal(
      gerarTituloSessaoInstitucional({
        tipo: "desconhecida",
        orgao: "Assembleia de Freguesia de Porches",
      }),
      "Sessão · Porches",
    );
  });

  it("aceita apenas data", () => {
    assert.equal(gerarTituloSessaoInstitucional({ data: "2026-04-28" }), "Sessão · 28 abril 2026");
  });

  it("deriva o título da data ISO canónica sem corromper o ano", () => {
    const titulo = gerarTituloSessaoInstitucional({
      tipo: "ordinaria",
      entidade: "Freguesia de Porches",
      data: "2026-06-30",
    });
    assert.equal(titulo, "Sessão ordinária · Porches · 30 junho 2026");
    assert.doesNotMatch(titulo, /3066/);
    assert.doesNotMatch(
      gerarTituloSessaoInstitucional({ entidade: "Freguesia de Porches", data: "3066-06-30" }),
      /3066/,
    );
  });

  it("usa Sessão sem dados", () => {
    assert.equal(gerarTituloSessaoInstitucional(), "Sessão");
  });

  it("omite datas inválidas", () => {
    assert.equal(
      gerarTituloSessaoInstitucional({ entidade: "Freguesia de Porches", data: "2026-02-30" }),
      "Sessão · Porches",
    );
  });

  it("não usa uma designação genérica de órgão no título", () => {
    assert.equal(
      gerarTituloSessaoInstitucional({
        orgao: "Órgão Deliberativo (Assembleia)",
        data: "2026-06-30",
      }),
      "Sessão · 30 junho 2026",
    );
  });

  it("remove o prefixo apenas no título", () => {
    const sessao = { entidade: "Câmara Municipal de Lagoa" };
    assert.equal(gerarTituloSessaoInstitucional(sessao), "Sessão · Lagoa");
    assert.equal(sessao.entidade, "Câmara Municipal de Lagoa");
  });

  it("não substitui um título personalizado quando os campos mudam", () => {
    assert.equal(
      resolverTituloSessaoInstitucional({
        tituloAtual: "Reunião sobre o orçamento",
        personalizado: true,
        sessao: { tipo: "extraordinaria", entidade: "Município de Lagoa" },
      }),
      "Reunião sobre o orçamento",
    );
  });
});

describe("título da criação manual", () => {
  it("gera um título institucional sem intervenção do utilizador", () => {
    assert.equal(
      gerarTituloSessaoManual({
        tipoSessao: "Ordinária",
        data: "2026-09-30",
      }),
      "Sessão ordinária — 30 de setembro de 2026",
    );
  });

  it("integra naturalmente o título adicional", () => {
    assert.equal(
      gerarTituloSessaoManual({
        tipoSessao: "Extraordinária",
        data: "2026-09-30",
        tituloAdicional: "  Orçamento suplementar  ",
      }),
      "Sessão extraordinária — Orçamento suplementar",
    );
  });
});
