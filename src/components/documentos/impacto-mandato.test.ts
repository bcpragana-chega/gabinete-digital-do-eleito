import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { analiseGeralPodeMostrarImpacto } from "../../lib/institutional-document-impact";
import { ImpactoMandatoResumo } from "./ImpactoMandatoResumo";
import type { AnaliseDocumentoInstitucional, ImpactoMandatoDocumento } from "../../lib/types";

const impacto: ImpactoMandatoDocumento = {
  relevancia: "alta",
  justificacaoRelevancia: "A decisão altera as condições de acesso ao apoio.",
  referenciaDocumento: "Deliberação, página 3",
  confianca: 0.94,
  alteracoesDecisoes: [
    {
      descricao: "O limite do apoio aumentou.",
      referenciaDocumento: "Artigo 5.º",
      confianca: 0.91,
    },
  ],
  acoes: [
    {
      tipo: "recomendada",
      descricao: "Rever os pedidos pendentes abrangidos.",
      referenciaDocumento: "Artigo 8.º",
      confianca: 0.86,
    },
    {
      tipo: "exigida",
      descricao: "Entregar os elementos indicados.",
      prazo: "até 30 de setembro",
      referenciaDocumento: "Artigo 10.º",
      confianca: 0.97,
    },
  ],
  proximaAcao: {
    descricao: "Confirmar quais pedidos pendentes são abrangidos.",
    referenciaDocumento: "Artigos 5.º e 8.º",
    confianca: 0.84,
  },
};

function analise(tipoDocumento: AnaliseDocumentoInstitucional["tipoDocumento"]) {
  return {
    tipoDocumento,
    confiancaGlobal: 0.9,
    pontosOrdemTrabalhos: [],
    informacaoRelevante: [],
    camposIncertos: [],
    resumoCompreensao: "Documento analisado.",
  } satisfies AnaliseDocumentoInstitucional;
}

describe("impacto do documento no mandato", () => {
  it("integra o resumo na revisão geral e no detalhe canónico", () => {
    const intake = readFileSync(
      new URL("./InstitutionalDocumentIntake.tsx", import.meta.url),
      "utf8",
    );
    const detalhe = readFileSync(
      new URL("./DocumentoRecebidoDetalhe.tsx", import.meta.url),
      "utf8",
    );
    const revisaoGeral = intake.slice(
      intake.indexOf("function DocumentReviewForm"),
      intake.indexOf("export function ReviewForm"),
    );
    assert.match(revisaoGeral, /<ImpactoMandatoResumo impacto=\{analise\.impactoMandato\}/);
    assert.match(
      detalhe,
      /analiseGeralPodeMostrarImpacto\(documento\.analiseInstitucional\)[\s\S]*<ImpactoMandatoResumo/,
    );
  });

  it("apresenta as quatro secções compactas e apenas o prazo explícito recebido", () => {
    const html = renderToStaticMarkup(createElement(ImpactoMandatoResumo, { impacto }));
    assert.match(html, /Porque importa/);
    assert.match(html, /O que mudou ou foi decidido/);
    assert.match(html, /O que exige atenção/);
    assert.match(html, /Próxima ação sugerida/);
    assert.match(html, /Prazo:.*até 30 de setembro/);
    assert.equal((html.match(/Prazo:/g) ?? []).length, 1);
    assert.match(html, /Referência: Artigo 10.º/);
    assert.match(html, /Confiança: 97%/);
  });

  it("omite listas vazias e comunica ausência de impacto prático seguro", () => {
    const html = renderToStaticMarkup(createElement(ImpactoMandatoResumo, {}));
    assert.match(html, /Não foi identificado impacto prático seguro neste documento/);
    assert.doesNotMatch(
      html,
      /O que mudou ou foi decidido|O que exige atenção|Próxima ação sugerida/,
    );
  });

  it("é mostrado em documentos gerais sem alterar convocatórias e ordens de trabalhos", () => {
    assert.equal(analiseGeralPodeMostrarImpacto(analise("ata")), true);
    assert.equal(analiseGeralPodeMostrarImpacto(analise("regulamento")), true);
    assert.equal(analiseGeralPodeMostrarImpacto(analise("convocatoria")), false);
    assert.equal(analiseGeralPodeMostrarImpacto(analise("ordem_trabalhos")), false);
    assert.equal(analiseGeralPodeMostrarImpacto(undefined), false);
  });
});
