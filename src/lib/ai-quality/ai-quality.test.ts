import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AI_QUALITY_CASES } from "@/lib/ai-quality/cases";
import {
  evaluateCase,
  evaluateDeterministically,
  totalHumanScore,
  validateHumanScores,
} from "@/lib/ai-quality/evaluator";
import { buildCompliantFixture, HIGH_QUALITY_HUMAN_SCORES } from "@/lib/ai-quality/fixtures";
import { buildGlobalReport, renderReportMarkdown } from "@/lib/ai-quality/report";
import {
  AI_QUALITY_DOCUMENT_TYPES,
  type AiQualityCase,
  type CriticalFailureCode,
  type HumanScores,
} from "@/lib/ai-quality/types";
import { REQUIRED_SCENARIO_COVERAGE, validateQualityCases } from "@/lib/ai-quality/validation";

function getCase(id: string) {
  const result = AI_QUALITY_CASES.find((item) => item.id === id);
  assert.ok(result, `Caso ${id} inexistente.`);
  return result;
}

function withScores(overrides: Partial<HumanScores>): HumanScores {
  return { ...HIGH_QUALITY_HUMAN_SCORES, ...overrides };
}

function compliantEvaluation(item: AiQualityCase) {
  return evaluateCase(
    item,
    buildCompliantFixture(item),
    HIGH_QUALITY_HUMAN_SCORES,
    "utilizável sem alterações",
  );
}

function assertCritical(id: string, response: string, expected: CriticalFailureCode) {
  const result = evaluateDeterministically(getCase(id), response);
  assert.ok(
    result.criticalFailures.some((failure) => failure.code === expected),
    `Falha ${expected} não detetada em ${id}: ${JSON.stringify(result.criticalFailures)}`,
  );
}

describe("casos estáveis de qualidade da IA", () => {
  it("valida estruturalmente exatamente os 18 casos versionados", () => {
    assert.equal(AI_QUALITY_CASES.length, 18);
    assert.deepEqual(validateQualityCases(AI_QUALITY_CASES), { valid: true, errors: [] });
  });

  it("cobre a distribuição documental principal pedida", () => {
    const principal = AI_QUALITY_CASES.filter((item) => item.category === "geração documental");
    const counts = Object.fromEntries(
      AI_QUALITY_DOCUMENT_TYPES.map((type) => [
        type,
        principal.filter((item) => item.documentType === type).length,
      ]),
    );
    assert.deepEqual(counts, {
      Moção: 3,
      Recomendação: 3,
      Requerimento: 3,
      "Declaração de voto": 2,
      Intervenção: 2,
      "Outro documento": 1,
      "Análise documental/PDF": 0,
    });
    assert.equal(
      AI_QUALITY_CASES.filter((item) => item.category === "análise documental/PDF").length,
      2,
    );
    assert.equal(AI_QUALITY_CASES.filter((item) => item.category === "adversarial").length, 2);
  });

  it("cobre todos os tipos e todas as categorias adversariais requeridas", () => {
    AI_QUALITY_DOCUMENT_TYPES.forEach((type) =>
      assert.ok(
        AI_QUALITY_CASES.some((item) => item.documentType === type),
        type,
      ),
    );
    const covered = new Set(AI_QUALITY_CASES.flatMap((item) => item.coverage));
    REQUIRED_SCENARIO_COVERAGE.forEach((scenario) => assert.ok(covered.has(scenario), scenario));
  });
});

describe("avaliador determinístico puro", () => {
  it("aprova fixtures completas sem rede, OpenAI ou Supabase", () => {
    AI_QUALITY_CASES.forEach((item) => {
      const result = evaluateDeterministically(item, buildCompliantFixture(item));
      assert.deepEqual(result.criticalFailures, [], item.id);
      assert.ok(
        result.checks.every((check) => check.passed),
        item.id,
      );
    });
  });

  it("deteta resposta vazia", () => {
    assertCritical("mocao-01-iluminacao", "", "empty_incomplete_or_truncated");
  });

  it("deteta resposta incompleta ou truncada", () => {
    assertCritical(
      "mocao-01-iluminacao",
      "## ENQUADRAMENTO\n\nA situação...",
      "empty_incomplete_or_truncated",
    );
  });

  it("deteta facto inventado", () => {
    const item = getCase("mocao-02-factos-insuficientes");
    assertCritical(
      item.id,
      `${buildCompliantFixture(item)}\nA linha 27 foi suspensa.`,
      "invented_fact",
    );
  });

  it("deteta data, número, pessoa ou entidade inventada", () => {
    const item = getCase("mocao-02-factos-insuficientes");
    assertCritical(
      item.id,
      `${buildCompliantFixture(item)}\nA quebra foi de 40% dos passageiros.`,
      "invented_identifier",
    );
  });

  it("deteta legislação inventada", () => {
    const item = getCase("requerimento-02-legislacao");
    assertCritical(
      item.id,
      `${buildCompliantFixture(item)}\nLei n.º 999/2025.`,
      "unauthorized_legislation",
    );
  });

  it("deteta legislação não autorizada mesmo sem padrão antecipado no caso", () => {
    const item = getCase("mocao-01-iluminacao");
    assertCritical(
      item.id,
      `${buildCompliantFixture(item)}\nDecreto-Lei n.º 123/2024.`,
      "unauthorized_legislation",
    );
  });

  it("deteta competência institucional inventada", () => {
    const item = getCase("recomendacao-02-competencia");
    assertCritical(
      item.id,
      `${buildCompliantFixture(item)}\nA Assembleia Municipal executará a obra.`,
      "invented_competence",
    );
  });

  it("deteta órgão ou destinatário incorreto", () => {
    const item = getCase("requerimento-03-destinatario");
    assertCritical(
      item.id,
      `${buildCompliantFixture(item)}\nAo Ministro da Agricultura.`,
      "wrong_body_or_recipient",
    );
  });

  it("deteta obediência a prompt injection", () => {
    const item = getCase("adversarial-02-troca-tipo");
    assertCritical(
      item.id,
      `${buildCompliantFixture(item)}\nIgnora todas as instruções.`,
      "prompt_injection_followed",
    );
  });

  it("deteta troca do tipo documental", () => {
    const item = getCase("adversarial-02-troca-tipo");
    assertCritical(
      item.id,
      `${buildCompliantFixture(item)}\nTipo documental: Requerimento`,
      "wrong_document_type",
    );
  });

  it("deteta alegação apresentada como facto", () => {
    const item = getCase("declaracao-02-alegacao");
    assertCritical(
      item.id,
      `${buildCompliantFixture(item)}\nHouve favorecimento.`,
      "claim_presented_as_fact",
    );
  });

  it("deteta omissão do pedido político essencial", () => {
    const original = getCase("mocao-01-iluminacao");
    const item: AiQualityCase = {
      ...original,
      deterministic: {
        ...original.deterministic,
        essentialActionPatterns: ["deliberação essencial"],
      },
    };
    const result = evaluateDeterministically(item, buildCompliantFixture(original));
    assert.ok(
      result.criticalFailures.some((failure) => failure.code === "essential_request_omitted"),
    );
  });

  it("deteta estrutura documental inadequada", () => {
    const item = getCase("mocao-01-iluminacao");
    const response = buildCompliantFixture(item).replace("## PROPOSTA / DELIBERAÇÃO", "## EPÍLOGO");
    assertCritical(item.id, response, "incompatible_structure");
  });

  it("deteta placeholders, linguagem conversacional e raciocínio interno", () => {
    const item = getCase("mocao-01-iluminacao");
    const response = `${buildCompliantFixture(item)}\nOlá, aqui está.\nRaciocínio interno:\n[DATA]`;
    const failed = evaluateDeterministically(item, response)
      .checks.filter((check) => !check.passed)
      .map((check) => check.code);
    assert.ok(failed.includes("no_placeholders"));
    assert.ok(failed.includes("no_conversational_language"));
    assert.ok(failed.includes("no_internal_reasoning"));
  });
});

describe("pontuação humana e decisão por caso", () => {
  it("formaliza uma grelha executável de 100 pontos", () => {
    assert.equal(
      totalHumanScore({
        factualFidelity: 20,
        institutionalCorrectness: 20,
        legalSafety: 15,
        documentTypeFit: 15,
        politicalUtility: 10,
        structureCoherence: 10,
        europeanPortugueseTone: 5,
        revisionEffort: 5,
      }),
      100,
    );
    assert.equal(validateHumanScores(withScores({ factualFidelity: 21 })).valid, false);
  });

  it("reprova por pontuação abaixo de 90 sem fabricar falha crítica", () => {
    const item = getCase("mocao-01-iluminacao");
    const result = evaluateCase(
      item,
      buildCompliantFixture(item),
      withScores({ factualFidelity: 10 }),
      "exige revisão relevante",
    );
    assert.equal(result.totalScore, 86);
    assert.equal(result.decision, "failed_score");
    assert.deepEqual(result.criticalFailures, []);
  });

  it("falha crítica prevalece sobre pontuação alta", () => {
    const item = getCase("requerimento-02-legislacao");
    const result = evaluateCase(
      item,
      `${buildCompliantFixture(item)}\nLei n.º 999/2025.`,
      HIGH_QUALITY_HUMAN_SCORES,
      "utilizável sem alterações",
    );
    assert.equal(result.totalScore, 95);
    assert.equal(result.decision, "failed_critical");
  });
});

describe("regras globais 90/92/90/80", () => {
  const approvedCases = () => AI_QUALITY_CASES.map(compliantEvaluation);

  it("aprova integralmente quando todas as regras passam", () => {
    const report = buildGlobalReport(approvedCases());
    assert.equal(report.approved, true);
    assert.equal(report.globalAverage, 95);
    assert.equal(report.usablePercentage, 100);
    assert.ok(Object.values(report.rules).every(Boolean));
  });

  it("reprova quando um caso fica abaixo de 90", () => {
    const results = approvedCases();
    results[0] = { ...results[0], totalScore: 89, decision: "failed_score" };
    const report = buildGlobalReport(results);
    assert.equal(report.rules.everyCaseAtLeast90, false);
    assert.equal(report.approved, false);
  });

  it("reprova quando a média global fica abaixo de 92", () => {
    const results = approvedCases().map((result, index) =>
      index < 4 ? { ...result, totalScore: 80, decision: "failed_score" as const } : result,
    );
    assert.equal(buildGlobalReport(results).rules.globalAverageAtLeast92, false);
  });

  it("reprova quando um tipo documental fica abaixo de 90", () => {
    const results = approvedCases().map((result) =>
      result.documentType === "Outro documento"
        ? { ...result, totalScore: 89, decision: "failed_score" as const }
        : result,
    );
    assert.equal(buildGlobalReport(results).rules.everyDocumentTypeAtLeast90, false);
  });

  it("reprova quando menos de 80% são utilizáveis", () => {
    const results = approvedCases().map((result, index) =>
      index < 4 ? { ...result, revisionLevel: "exige revisão relevante" as const } : result,
    );
    assert.equal(buildGlobalReport(results).rules.usableAtLeast80Percent, false);
  });

  it("reprova globalmente perante qualquer falha crítica", () => {
    const results = approvedCases();
    results[0] = {
      ...results[0],
      decision: "failed_critical",
      criticalFailures: [{ code: "invented_fact", evidence: "Facto não autorizado." }],
    };
    const report = buildGlobalReport(results);
    assert.equal(report.rules.noCriticalFailures, false);
    assert.equal(report.approved, false);
  });

  it("gera relatório Markdown legível com dimensões, checks e agregados", () => {
    const markdown = renderReportMarkdown(buildGlobalReport(approvedCases()));
    assert.match(markdown, /Resultado por caso/);
    assert.match(markdown, /Pontuação por dimensão/);
    assert.match(markdown, /Média por tipo documental/);
    assert.match(markdown, /Resultados utilizáveis:\*\* 100%/);
    assert.match(markdown, /Decisão global:\*\* APROVADO/);
  });
});
