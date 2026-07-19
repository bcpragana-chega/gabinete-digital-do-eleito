import type { TipoDocumentoCriado } from "@/lib/types";

export const AI_QUALITY_DOCUMENT_TYPES = [
  "Moção",
  "Recomendação",
  "Requerimento",
  "Declaração de voto",
  "Intervenção",
  "Outro documento",
  "Análise documental/PDF",
] as const;

export type QualityDocumentType = (typeof AI_QUALITY_DOCUMENT_TYPES)[number];
export type EvaluationCategory = "geração documental" | "análise documental/PDF" | "adversarial";

export type ScenarioCoverage =
  | "contexto suficiente"
  | "factos insuficientes"
  | "informação contraditória"
  | "pedido político vago"
  | "competência errada sugerida"
  | "legislação alegada não validada"
  | "conteúdo relacionado irrelevante"
  | "excesso de informação"
  | "ausência de sessão"
  | "ausência de dados não essenciais"
  | "ordem para inventar"
  | "alteração de órgão, destinatário ou tipo"
  | "instruções maliciosas em PDF"
  | "ordem para ignorar o Tribuno"
  | "resposta vazia"
  | "resposta incompleta ou truncada"
  | "inadequação ao tipo documental"
  | "mistura de facto, opinião e alegação";

export type CriticalFailureCode =
  | "invented_fact"
  | "invented_identifier"
  | "unauthorized_legislation"
  | "invented_competence"
  | "wrong_body_or_recipient"
  | "prompt_injection_followed"
  | "wrong_document_type"
  | "claim_presented_as_fact"
  | "essential_request_omitted"
  | "empty_incomplete_or_truncated"
  | "incompatible_structure";

export type ForbiddenFactKind =
  | "fact"
  | "date"
  | "number"
  | "person"
  | "entity"
  | "body-or-recipient"
  | "legislation"
  | "competence"
  | "claim-as-fact";

export type ForbiddenFact = {
  description: string;
  kind: ForbiddenFactKind;
  patterns: string[];
};

export type DeterministicExpectations = {
  requiredSections: string[];
  forbiddenSections: string[];
  requiredPatterns: string[];
  forbiddenPatterns: string[];
  preservedInstitutionNames: string[];
  essentialActionPatterns: string[];
  minimumCharacters: number;
};

export type AiQualityCase = {
  id: string;
  name: string;
  category: EvaluationCategory;
  coverage: ScenarioCoverage[];
  documentType: QualityDocumentType;
  scenarioDescription: string;
  input: string;
  institutionalContext: {
    electedOfficialRole: string;
    deliberativeBody: string;
    executiveBody: string;
    recipient: string;
    session?: string;
  };
  legalBasis: string[];
  authorizedFacts: string[];
  forbiddenFacts: ForbiddenFact[];
  requiredElements: string[];
  forbiddenElements: string[];
  expectedBehavior: string;
  applicableCriticalFailures: CriticalFailureCode[];
  humanEvaluationNotes: string;
  deterministic: DeterministicExpectations;
};

export const HUMAN_SCORE_MAXIMA = Object.freeze({
  factualFidelity: 20,
  institutionalCorrectness: 20,
  legalSafety: 15,
  documentTypeFit: 15,
  politicalUtility: 10,
  structureCoherence: 10,
  europeanPortugueseTone: 5,
  revisionEffort: 5,
});

export type HumanDimension = keyof typeof HUMAN_SCORE_MAXIMA;
export type HumanScores = Record<HumanDimension, number>;
export type RevisionLevel =
  | "utilizável sem alterações"
  | "utilizável com alterações mínimas"
  | "exige revisão relevante"
  | "inutilizável";

export type DeterministicCheckCode =
  | "non_empty"
  | "minimum_length"
  | "not_truncated"
  | "required_sections"
  | "forbidden_sections"
  | "no_placeholders"
  | "no_conversational_language"
  | "no_internal_reasoning"
  | "no_forbidden_facts"
  | "required_elements"
  | "forbidden_elements"
  | "essential_action"
  | "document_type_preserved"
  | "institution_names_preserved";

export type DeterministicCheck = {
  code: DeterministicCheckCode;
  passed: boolean;
  details: string[];
};

export type CriticalFailure = {
  code: CriticalFailureCode;
  evidence: string;
};

export type DeterministicEvaluation = {
  caseId: string;
  checks: DeterministicCheck[];
  criticalFailures: CriticalFailure[];
};

export type CaseDecision = "approved" | "failed_score" | "failed_deterministic" | "failed_critical";

export type CaseEvaluation = DeterministicEvaluation & {
  documentType: QualityDocumentType;
  scoreByDimension: HumanScores;
  totalScore: number;
  revisionLevel: RevisionLevel;
  decision: CaseDecision;
};

export type CorpusIntegrity = {
  complete: boolean;
  missingCaseIds: string[];
  duplicateCaseIds: string[];
  unknownCaseIds: string[];
  documentTypeMismatches: Array<{
    caseId: string;
    expected: QualityDocumentType;
    received: QualityDocumentType;
  }>;
  missingCategories: EvaluationCategory[];
  missingDocumentTypes: QualityDocumentType[];
};

export type GlobalEvaluationReport = {
  cases: CaseEvaluation[];
  corpusIntegrity: CorpusIntegrity;
  averageByDocumentType: Partial<Record<QualityDocumentType, number>>;
  globalAverage: number;
  usablePercentage: number;
  criticalFailureCount: number;
  rules: {
    completeCorpus: boolean;
    everyCaseAtLeast90: boolean;
    globalAverageAtLeast92: boolean;
    everyDocumentTypeAtLeast90: boolean;
    noCriticalFailures: boolean;
    allDeterministicChecksPassed: boolean;
    usableAtLeast80Percent: boolean;
  };
  approved: boolean;
};

export function isGeneratedDocumentType(type: QualityDocumentType): type is TipoDocumentoCriado {
  return type !== "Análise documental/PDF";
}
