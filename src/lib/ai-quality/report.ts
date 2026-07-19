import { AI_QUALITY_CASES } from "@/lib/ai-quality/cases";
import type {
  CaseEvaluation,
  CorpusIntegrity,
  EvaluationCategory,
  GlobalEvaluationReport,
  QualityDocumentType,
} from "@/lib/ai-quality/types";

function round(value: number) {
  return Math.round(value * 100) / 100;
}

export function buildGlobalReport(cases: CaseEvaluation[]): GlobalEvaluationReport {
  const corpusIntegrity = evaluateCorpusIntegrity(cases);

  const grouped = new Map<string, number[]>();
  cases.forEach((result) => {
    const scores = grouped.get(result.documentType) ?? [];
    scores.push(result.totalScore);
    grouped.set(result.documentType, scores);
  });
  const averageByDocumentType = Object.fromEntries(
    [...grouped.entries()].map(([type, scores]) => [
      type,
      round(scores.reduce((sum, score) => sum + score, 0) / scores.length),
    ]),
  );
  const globalAverage = cases.length
    ? round(cases.reduce((sum, result) => sum + result.totalScore, 0) / cases.length)
    : 0;
  const usableCount = cases.filter(
    (result) =>
      result.revisionLevel === "utilizável sem alterações" ||
      result.revisionLevel === "utilizável com alterações mínimas",
  ).length;
  const usablePercentage = cases.length ? round((usableCount / cases.length) * 100) : 0;
  const criticalFailureCount = cases.reduce(
    (sum, result) => sum + result.criticalFailures.length,
    0,
  );
  const rules = {
    completeCorpus: corpusIntegrity.complete,
    everyCaseAtLeast90: cases.every((result) => result.totalScore >= 90),
    globalAverageAtLeast92: cases.length > 0 && globalAverage >= 92,
    everyDocumentTypeAtLeast90:
      corpusIntegrity.missingDocumentTypes.length === 0 &&
      Object.values(averageByDocumentType).every((average) => average >= 90),
    noCriticalFailures: criticalFailureCount === 0,
    allDeterministicChecksPassed: cases.every((result) =>
      result.checks.every((item) => item.passed),
    ),
    usableAtLeast80Percent: usablePercentage >= 80,
  };

  return {
    cases,
    corpusIntegrity,
    averageByDocumentType,
    globalAverage,
    usablePercentage,
    criticalFailureCount,
    rules,
    approved: Object.values(rules).every(Boolean),
  };
}

function evaluateCorpusIntegrity(cases: CaseEvaluation[]): CorpusIntegrity {
  const expectedById = new Map(AI_QUALITY_CASES.map((item) => [item.id, item]));
  const counts = new Map<string, number>();
  cases.forEach((result) => counts.set(result.caseId, (counts.get(result.caseId) ?? 0) + 1));

  const missingCaseIds = AI_QUALITY_CASES.filter((item) => !counts.has(item.id)).map(
    (item) => item.id,
  );
  const duplicateCaseIds = [...counts.entries()].filter(([, count]) => count > 1).map(([id]) => id);
  const unknownCaseIds = [...counts.keys()].filter((id) => !expectedById.has(id));
  const documentTypeMismatches = cases.flatMap((result) => {
    const expected = expectedById.get(result.caseId);
    return expected && expected.documentType !== result.documentType
      ? [
          {
            caseId: result.caseId,
            expected: expected.documentType,
            received: result.documentType,
          },
        ]
      : [];
  });
  const correctlyRepresentedCases = cases.filter((result) => {
    const expected = expectedById.get(result.caseId);
    return expected?.documentType === result.documentType;
  });
  const representedCategories = new Set(
    correctlyRepresentedCases.flatMap((result) => {
      const expected = expectedById.get(result.caseId);
      return expected ? [expected.category] : [];
    }),
  );
  const expectedCategories = [
    ...new Set(AI_QUALITY_CASES.map((item) => item.category)),
  ] as EvaluationCategory[];
  const missingCategories = expectedCategories.filter(
    (category) => !representedCategories.has(category),
  );
  const representedDocumentTypes = new Set(
    correctlyRepresentedCases.map((result) => result.documentType),
  );
  const expectedDocumentTypes = [
    ...new Set(AI_QUALITY_CASES.map((item) => item.documentType)),
  ] as QualityDocumentType[];
  const missingDocumentTypes = expectedDocumentTypes.filter(
    (type) => !representedDocumentTypes.has(type),
  );

  const complete =
    cases.length === AI_QUALITY_CASES.length &&
    missingCaseIds.length === 0 &&
    duplicateCaseIds.length === 0 &&
    unknownCaseIds.length === 0 &&
    documentTypeMismatches.length === 0 &&
    missingCategories.length === 0 &&
    missingDocumentTypes.length === 0;

  return {
    complete,
    missingCaseIds,
    duplicateCaseIds,
    unknownCaseIds,
    documentTypeMismatches,
    missingCategories,
    missingDocumentTypes,
  };
}

export function renderReportMarkdown(report: GlobalEvaluationReport) {
  const caseRows = report.cases.map((result) => {
    const failures = result.criticalFailures.map((failure) => failure.code).join(", ") || "—";
    const failedChecks =
      result.checks
        .filter((item) => !item.passed)
        .map((item) => item.code)
        .join(", ") || "—";
    return `| ${result.caseId} | ${result.documentType} | ${result.totalScore} | ${result.decision} | ${result.revisionLevel} | ${failures} | ${failedChecks} |`;
  });
  const typeRows = Object.entries(report.averageByDocumentType).map(
    ([type, average]) => `| ${type} | ${average} |`,
  );
  const dimensionDetails = report.cases.map(
    (result) =>
      `- **${result.caseId}**: ${Object.entries(result.scoreByDimension)
        .map(([dimension, score]) => `${dimension} ${score}`)
        .join("; ")}.`,
  );
  const integrity = report.corpusIntegrity;
  const listOrDash = (items: string[]) => items.join(", ") || "—";
  const typeMismatches =
    integrity.documentTypeMismatches
      .map((item) => `${item.caseId}: esperado ${item.expected}, recebido ${item.received}`)
      .join("; ") || "—";

  return [
    "# Relatório de qualidade da IA do Tribuno",
    "",
    `**Decisão global:** ${report.approved ? "APROVADO" : "REPROVADO"}`,
    `**Média global:** ${report.globalAverage}/100`,
    `**Resultados utilizáveis:** ${report.usablePercentage}%`,
    `**Falhas críticas:** ${report.criticalFailureCount}`,
    "",
    "## Integridade do corpus",
    "",
    `- Corpus completo: ${integrity.complete ? "sim" : "não"}`,
    `- Casos em falta: ${listOrDash(integrity.missingCaseIds)}`,
    `- Casos duplicados: ${listOrDash(integrity.duplicateCaseIds)}`,
    `- Casos desconhecidos: ${listOrDash(integrity.unknownCaseIds)}`,
    `- Tipos adulterados: ${typeMismatches}`,
    `- Categorias em falta: ${listOrDash(integrity.missingCategories)}`,
    `- Tipos documentais em falta: ${listOrDash(integrity.missingDocumentTypes)}`,
    "",
    "## Resultado por caso",
    "",
    "| Caso | Tipo | Pontuação | Decisão | Revisão | Falhas críticas | Verificações falhadas |",
    "| --- | --- | ---: | --- | --- | --- | --- |",
    ...caseRows,
    "",
    "## Pontuação por dimensão",
    "",
    ...dimensionDetails,
    "",
    "## Média por tipo documental",
    "",
    "| Tipo | Média |",
    "| --- | ---: |",
    ...typeRows,
    "",
    "## Regras globais",
    "",
    `- Corpus integral: ${report.rules.completeCorpus ? "sim" : "não"}`,
    `- Todos os casos ≥ 90: ${report.rules.everyCaseAtLeast90 ? "sim" : "não"}`,
    `- Média global ≥ 92: ${report.rules.globalAverageAtLeast92 ? "sim" : "não"}`,
    `- Todos os tipos ≥ 90: ${report.rules.everyDocumentTypeAtLeast90 ? "sim" : "não"}`,
    `- Zero falhas críticas: ${report.rules.noCriticalFailures ? "sim" : "não"}`,
    `- Todas as verificações determinísticas aprovadas: ${report.rules.allDeterministicChecksPassed ? "sim" : "não"}`,
    `- Pelo menos 80% utilizáveis: ${report.rules.usableAtLeast80Percent ? "sim" : "não"}`,
  ].join("\n");
}
