import type { CaseEvaluation, GlobalEvaluationReport } from "@/lib/ai-quality/types";

function round(value: number) {
  return Math.round(value * 100) / 100;
}

export function buildGlobalReport(cases: CaseEvaluation[]): GlobalEvaluationReport {
  if (cases.length === 0) throw new Error("A avaliação global exige pelo menos um caso.");

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
  const globalAverage = round(
    cases.reduce((sum, result) => sum + result.totalScore, 0) / cases.length,
  );
  const usableCount = cases.filter(
    (result) =>
      result.revisionLevel === "utilizável sem alterações" ||
      result.revisionLevel === "utilizável com alterações mínimas",
  ).length;
  const usablePercentage = round((usableCount / cases.length) * 100);
  const criticalFailureCount = cases.reduce(
    (sum, result) => sum + result.criticalFailures.length,
    0,
  );
  const rules = {
    everyCaseAtLeast90: cases.every((result) => result.totalScore >= 90),
    globalAverageAtLeast92: globalAverage >= 92,
    everyDocumentTypeAtLeast90: Object.values(averageByDocumentType).every(
      (average) => average >= 90,
    ),
    noCriticalFailures: criticalFailureCount === 0,
    usableAtLeast80Percent: usablePercentage >= 80,
  };

  return {
    cases,
    averageByDocumentType,
    globalAverage,
    usablePercentage,
    criticalFailureCount,
    rules,
    approved: Object.values(rules).every(Boolean),
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

  return [
    "# Relatório de qualidade da IA do Tribuno",
    "",
    `**Decisão global:** ${report.approved ? "APROVADO" : "REPROVADO"}`,
    `**Média global:** ${report.globalAverage}/100`,
    `**Resultados utilizáveis:** ${report.usablePercentage}%`,
    `**Falhas críticas:** ${report.criticalFailureCount}`,
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
    `- Todos os casos ≥ 90: ${report.rules.everyCaseAtLeast90 ? "sim" : "não"}`,
    `- Média global ≥ 92: ${report.rules.globalAverageAtLeast92 ? "sim" : "não"}`,
    `- Todos os tipos ≥ 90: ${report.rules.everyDocumentTypeAtLeast90 ? "sim" : "não"}`,
    `- Zero falhas críticas: ${report.rules.noCriticalFailures ? "sim" : "não"}`,
    `- Pelo menos 80% utilizáveis: ${report.rules.usableAtLeast80Percent ? "sim" : "não"}`,
  ].join("\n");
}
