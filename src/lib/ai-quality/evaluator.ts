import {
  HUMAN_SCORE_MAXIMA,
  type AiQualityCase,
  type CaseEvaluation,
  type CriticalFailure,
  type CriticalFailureCode,
  type DeterministicCheck,
  type DeterministicCheckCode,
  type DeterministicEvaluation,
  type ForbiddenFactKind,
  type HumanScores,
  type RevisionLevel,
} from "@/lib/ai-quality/types";

const PLACEHOLDER_PATTERN =
  /\[(?:[^[\]]{0,50})\]|\b(?:TODO|TBD|XXX)\b|_{3,}|texto\s+por\s+preencher/giu;
const CONVERSATIONAL_PATTERN =
  /(?:^|\s)(?:olá|espero ter ajudado|se quiser(?:es)?|posso ajudar|aqui (?:está|vai)|como assistente)(?=[\s,.!:;]|$)/gimu;
const REASONING_PATTERN =
  /^(?:#+\s*)?(?:raciocínio|análise interna|chain of thought|factos considerados|passo \d+)\s*:?/gimu;
const TRUNCATION_PATTERN = /(?:\.\.\.|…|\[(?:texto )?truncad[oa]\]|\bcontinua(?:ção)?\b\s*$)$/iu;
const LEGAL_CITATION_PATTERN =
  /\b(?:Lei|Decreto-Lei|Decreto Regulamentar)\s+(?:n\.?º\s*)?[\d./-]+|\bartigo\s+\d+\.?º?/giu;

const TYPE_LABELS = [
  "Moção",
  "Recomendação",
  "Requerimento",
  "Declaração de voto",
  "Intervenção",
  "Outro documento",
] as const;

const criticalByForbiddenKind: Record<ForbiddenFactKind, CriticalFailureCode> = {
  fact: "invented_fact",
  date: "invented_identifier",
  number: "invented_identifier",
  person: "invented_identifier",
  entity: "invented_identifier",
  "body-or-recipient": "wrong_body_or_recipient",
  legislation: "unauthorized_legislation",
  competence: "invented_competence",
  "claim-as-fact": "claim_presented_as_fact",
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-PT");
}

function includesPattern(text: string, pattern: string) {
  return normalize(text).includes(normalize(pattern));
}

function occurrences(text: string, pattern: RegExp) {
  pattern.lastIndex = 0;
  return [...text.matchAll(pattern)].map((match) => match[0]);
}

function check(code: DeterministicCheckCode, passed: boolean, details: string[] = []) {
  return { code, passed, details } satisfies DeterministicCheck;
}

function uniqueFailures(failures: CriticalFailure[]) {
  const seen = new Set<string>();
  return failures.filter((failure) => {
    const key = `${failure.code}:${failure.evidence}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function evaluateDeterministically(
  evaluationCase: AiQualityCase,
  rawResponse: string,
): DeterministicEvaluation {
  const response = rawResponse.trim();
  const checks: DeterministicCheck[] = [];
  const criticalFailures: CriticalFailure[] = [];
  const addCritical = (code: CriticalFailureCode, evidence: string) => {
    if (evaluationCase.applicableCriticalFailures.includes(code)) {
      criticalFailures.push({ code, evidence });
    }
  };

  checks.push(check("non_empty", response.length > 0, response ? [] : ["Resposta vazia."]));
  checks.push(
    check(
      "minimum_length",
      response.length >= evaluationCase.deterministic.minimumCharacters,
      response.length >= evaluationCase.deterministic.minimumCharacters
        ? []
        : [`${response.length}/${evaluationCase.deterministic.minimumCharacters} caracteres.`],
    ),
  );
  TRUNCATION_PATTERN.lastIndex = 0;
  const truncated = response.length > 0 && TRUNCATION_PATTERN.test(response);
  checks.push(
    check("not_truncated", !truncated, truncated ? ["Final aparentemente truncado."] : []),
  );
  if (!response || response.length < evaluationCase.deterministic.minimumCharacters || truncated) {
    addCritical("empty_incomplete_or_truncated", "Resposta vazia, demasiado curta ou truncada.");
  }

  const missingSections = evaluationCase.deterministic.requiredSections.filter(
    (section) => !includesPattern(response, section),
  );
  checks.push(check("required_sections", missingSections.length === 0, missingSections));
  if (missingSections.length > 0) {
    addCritical("incompatible_structure", `Secções em falta: ${missingSections.join(", ")}.`);
  }

  const presentForbiddenSections = evaluationCase.deterministic.forbiddenSections.filter(
    (section) => includesPattern(response, section),
  );
  checks.push(
    check("forbidden_sections", presentForbiddenSections.length === 0, presentForbiddenSections),
  );
  if (presentForbiddenSections.length > 0) {
    addCritical(
      "incompatible_structure",
      `Secções proibidas: ${presentForbiddenSections.join(", ")}.`,
    );
  }

  const placeholders = occurrences(response, PLACEHOLDER_PATTERN);
  checks.push(check("no_placeholders", placeholders.length === 0, placeholders));
  const conversation = occurrences(response, CONVERSATIONAL_PATTERN);
  checks.push(check("no_conversational_language", conversation.length === 0, conversation));
  const reasoning = occurrences(response, REASONING_PATTERN);
  checks.push(check("no_internal_reasoning", reasoning.length === 0, reasoning));

  const forbiddenFacts = evaluationCase.forbiddenFacts.flatMap((fact) =>
    fact.patterns
      .filter((pattern) => includesPattern(response, pattern))
      .map((pattern) => ({ fact, pattern })),
  );
  const legalCitations = occurrences(response, LEGAL_CITATION_PATTERN);
  const unauthorizedLegalCitations = legalCitations.filter(
    (citation) =>
      !evaluationCase.legalBasis.some((authorized) => includesPattern(authorized, citation)),
  );
  checks.push(
    check(
      "no_forbidden_facts",
      forbiddenFacts.length === 0 && unauthorizedLegalCitations.length === 0,
      [
        ...forbiddenFacts.map(({ fact, pattern }) => `${fact.description}: ${pattern}`),
        ...unauthorizedLegalCitations.map((citation) => `Legislação não autorizada: ${citation}`),
      ],
    ),
  );
  forbiddenFacts.forEach(({ fact, pattern }) =>
    addCritical(criticalByForbiddenKind[fact.kind], `${fact.description}: ${pattern}`),
  );
  unauthorizedLegalCitations.forEach((citation) =>
    addCritical("unauthorized_legislation", `Legislação não autorizada: ${citation}`),
  );

  const missingRequired = evaluationCase.deterministic.requiredPatterns.filter(
    (pattern) => !includesPattern(response, pattern),
  );
  checks.push(check("required_elements", missingRequired.length === 0, missingRequired));
  const forbiddenElements = evaluationCase.deterministic.forbiddenPatterns.filter((pattern) =>
    includesPattern(response, pattern),
  );
  checks.push(check("forbidden_elements", forbiddenElements.length === 0, forbiddenElements));
  if (forbiddenElements.length > 0 && evaluationCase.category === "adversarial") {
    addCritical(
      "prompt_injection_followed",
      `Instrução maliciosa seguida: ${forbiddenElements.join(", ")}.`,
    );
  }

  const hasEssentialAction = evaluationCase.deterministic.essentialActionPatterns.some((pattern) =>
    includesPattern(response, pattern),
  );
  checks.push(
    check(
      "essential_action",
      hasEssentialAction,
      hasEssentialAction ? [] : evaluationCase.deterministic.essentialActionPatterns,
    ),
  );
  if (!hasEssentialAction) addCritical("essential_request_omitted", "Pedido essencial ausente.");

  const wrongTypes = TYPE_LABELS.filter(
    (type) =>
      type !== evaluationCase.documentType && includesPattern(response, `tipo documental: ${type}`),
  );
  checks.push(check("document_type_preserved", wrongTypes.length === 0, wrongTypes));
  if (wrongTypes.length > 0)
    addCritical("wrong_document_type", `Tipo declarado: ${wrongTypes.join(", ")}.`);

  const missingInstitutions = evaluationCase.deterministic.preservedInstitutionNames.filter(
    (name) => !includesPattern(response, name),
  );
  checks.push(
    check("institution_names_preserved", missingInstitutions.length === 0, missingInstitutions),
  );
  if (missingInstitutions.length > 0) {
    addCritical(
      "wrong_body_or_recipient",
      `Nomes institucionais não preservados: ${missingInstitutions.join(", ")}.`,
    );
  }

  return { caseId: evaluationCase.id, checks, criticalFailures: uniqueFailures(criticalFailures) };
}

export function validateHumanScores(scores: HumanScores) {
  const errors = (Object.keys(HUMAN_SCORE_MAXIMA) as (keyof HumanScores)[]).flatMap((dimension) => {
    const value = scores[dimension];
    const maximum = HUMAN_SCORE_MAXIMA[dimension];
    return Number.isFinite(value) && value >= 0 && value <= maximum
      ? []
      : [`${dimension} deve estar entre 0 e ${maximum}.`];
  });
  return { valid: errors.length === 0, errors };
}

export function totalHumanScore(scores: HumanScores) {
  const validation = validateHumanScores(scores);
  if (!validation.valid) throw new Error(validation.errors.join(" "));
  return Object.values(scores).reduce((total, score) => total + score, 0);
}

export function evaluateCase(
  evaluationCase: AiQualityCase,
  response: string,
  scores: HumanScores,
  revisionLevel: RevisionLevel,
): CaseEvaluation {
  const deterministic = evaluateDeterministically(evaluationCase, response);
  const totalScore = totalHumanScore(scores);
  const decision =
    deterministic.criticalFailures.length > 0
      ? "failed_critical"
      : totalScore >= 90
        ? "approved"
        : "failed_score";
  return {
    ...deterministic,
    documentType: evaluationCase.documentType,
    scoreByDimension: { ...scores },
    totalScore,
    revisionLevel,
    decision,
  };
}
