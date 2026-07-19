import {
  AI_QUALITY_DOCUMENT_TYPES,
  type AiQualityCase,
  type ScenarioCoverage,
} from "@/lib/ai-quality/types";

export const REQUIRED_SCENARIO_COVERAGE: readonly ScenarioCoverage[] = [
  "contexto suficiente",
  "factos insuficientes",
  "informação contraditória",
  "pedido político vago",
  "competência errada sugerida",
  "legislação alegada não validada",
  "conteúdo relacionado irrelevante",
  "excesso de informação",
  "ausência de sessão",
  "ausência de dados não essenciais",
  "ordem para inventar",
  "alteração de órgão, destinatário ou tipo",
  "instruções maliciosas em PDF",
  "ordem para ignorar o Tribuno",
  "resposta vazia",
  "resposta incompleta ou truncada",
  "inadequação ao tipo documental",
  "mistura de facto, opinião e alegação",
];

export function validateQualityCases(cases: readonly AiQualityCase[]) {
  const errors: string[] = [];
  const ids = new Set<string>();

  cases.forEach((item, index) => {
    const prefix = `Caso ${index + 1}`;
    if (!item.id.trim()) errors.push(`${prefix}: id vazio.`);
    if (ids.has(item.id)) errors.push(`${prefix}: id duplicado ${item.id}.`);
    ids.add(item.id);
    if (!item.name.trim()) errors.push(`${prefix}: nome vazio.`);
    if (!item.scenarioDescription.trim()) errors.push(`${prefix}: cenário vazio.`);
    if (!item.input.trim()) errors.push(`${prefix}: entrada vazia.`);
    if (!AI_QUALITY_DOCUMENT_TYPES.includes(item.documentType)) {
      errors.push(`${prefix}: tipo documental inválido.`);
    }
    if (!item.institutionalContext.deliberativeBody.trim()) {
      errors.push(`${prefix}: contexto institucional incompleto.`);
    }
    if (item.authorizedFacts.length === 0) errors.push(`${prefix}: sem factos autorizados.`);
    if (item.requiredElements.length === 0) errors.push(`${prefix}: sem elementos obrigatórios.`);
    if (!item.expectedBehavior.trim()) errors.push(`${prefix}: comportamento esperado vazio.`);
    if (item.applicableCriticalFailures.length === 0) {
      errors.push(`${prefix}: sem critérios eliminatórios.`);
    }
    if (!item.humanEvaluationNotes.trim()) errors.push(`${prefix}: sem notas humanas.`);
    if (item.deterministic.requiredSections.length === 0) {
      errors.push(`${prefix}: sem estrutura documental esperada.`);
    }
    if (item.deterministic.minimumCharacters < 1) {
      errors.push(`${prefix}: comprimento mínimo inválido.`);
    }
  });

  return { valid: errors.length === 0, errors };
}
