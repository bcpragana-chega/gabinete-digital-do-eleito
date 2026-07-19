import type { AiQualityCase, HumanScores } from "@/lib/ai-quality/types";

export const HIGH_QUALITY_HUMAN_SCORES: HumanScores = {
  factualFidelity: 19,
  institutionalCorrectness: 19,
  legalSafety: 15,
  documentTypeFit: 14,
  politicalUtility: 9,
  structureCoherence: 9,
  europeanPortugueseTone: 5,
  revisionEffort: 5,
};

export function buildCompliantFixture(evaluationCase: AiQualityCase) {
  const required = [
    ...evaluationCase.deterministic.requiredPatterns,
    ...evaluationCase.deterministic.preservedInstitutionNames,
    evaluationCase.deterministic.essentialActionPatterns[0],
  ].join(". ");
  const body = [
    "A informação disponível é tratada de forma prudente e limitada aos elementos confirmados.",
    required,
    "A formulação institucional mantém o objetivo político claro, sem completar lacunas nem acrescentar dados externos.",
  ].join(" ");
  return evaluationCase.deterministic.requiredSections
    .map(
      (section, index) => `## ${section}\n\n${body} Parte ${index + 1} devidamente desenvolvida.`,
    )
    .join("\n\n");
}
