export type TodayDecisionState = "onboarding" | "active" | "critical" | "clear";

export type TodayDestination = {
  href: string;
  label: string;
};

export type TodayAction = TodayDestination & {
  id: string;
  needKey: string;
  title: string;
  explanation: string;
  context?: string;
  secondaryAction?: TodayDestination;
};

export type TodayAlert = TodayDestination & {
  id: string;
  needKey: string;
  title: string;
  explanation: string;
};

export type TodayPendingItem = TodayDestination & {
  id: string;
  needKey: string;
  title: string;
  explanation: string;
};

export type TodaySession = {
  id: string;
  title: string;
  date: string;
  time?: string;
  location?: string;
  preparationComplete: boolean;
  documentsToReview: Array<{ id: string; title: string }>;
  pendingPoints: Array<{ id: string; number: number; title: string }>;
  documentsInProgress: Array<{ id: string; title: string }>;
  followUps: Array<{ id: string; title: string }>;
};

export type TodayDecisionInput = {
  today: string;
  onboardingRequired: boolean;
  activeSubjectCount: number;
  registeredSessionCount: number;
  documentsToOrganize: Array<{ id: string; title: string }>;
  nextSession?: TodaySession;
};

export type TodayDecision = {
  state: TodayDecisionState;
  primaryAction: TodayAction | null;
  alerts: TodayAlert[];
  pendingItems: TodayPendingItem[];
};

type Candidate = TodayAction & { priority: number };

const MAX_ALERTS = 2;
const MAX_PENDING_ITEMS = 3;

function sessionHref(sessionId: string, suffix = "") {
  return `/sessoes/${encodeURIComponent(sessionId)}/preparacao${suffix}`;
}

function documentHref(documentId: string, sessionId: string) {
  return `/documentos/${encodeURIComponent(documentId)}?origem=sessao&sessaoId=${encodeURIComponent(sessionId)}`;
}

function daysBetween(today: string, target: string) {
  const start = new Date(`${today}T00:00:00Z`).getTime();
  const end = new Date(`${target}T00:00:00Z`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return Number.POSITIVE_INFINITY;
  return Math.ceil((end - start) / 86_400_000);
}

function sessionContext(session: TodaySession) {
  return [session.date, session.time, session.location].filter(Boolean).join(" · ");
}

function buildCandidates(input: TodayDecisionInput): Candidate[] {
  const session = input.nextSession;

  if (!session) {
    const document = input.documentsToOrganize[0];
    if (document) {
      return [
        {
          id: `organize-document-${document.id}`,
          needKey: `document-organization-${document.id}`,
          priority: 7,
          title: "Analisar e organizar documentos",
          explanation: "Revê o documento para o integrar no acompanhamento do mandato.",
          context: document.title,
          label: "Analisar documentos",
          href: `/documentos/${encodeURIComponent(document.id)}?origem=biblioteca`,
        },
      ];
    }

    const emptyAccount =
      input.activeSubjectCount === 0 &&
      input.documentsToOrganize.length === 0 &&
      input.registeredSessionCount === 0;
    if (emptyAccount) {
      return [
        {
          id: "onboarding-subject",
          needKey: "onboarding-subject",
          priority: 7,
          title: "Começar um novo assunto",
          explanation:
            "Cria um assunto ou analisa documentos para o Tribuno começar a acompanhar o teu mandato.",
          label: "Novo assunto",
          href: "/assuntos",
          secondaryAction: {
            label: "Analisar documentos",
            href: "/biblioteca",
          },
        },
      ];
    }

    if (input.activeSubjectCount > 0 && input.onboardingRequired) {
      return [
        {
          id: "onboarding-session",
          needKey: "onboarding-session",
          priority: 8,
          title: "Preparar a próxima sessão",
          explanation:
            "Carrega a convocatória para organizar os dados ou cria a sessão manualmente.",
          label: "Preparar sessão",
          href: "/sessoes",
        },
      ];
    }

    return [];
  }

  const candidates: Candidate[] = [];
  const daysUntilSession = daysBetween(input.today, session.date);
  const unfinishedPreparation = !session.preparationComplete;
  const criticalSession = unfinishedPreparation && daysUntilSession >= 0 && daysUntilSession <= 3;

  if (criticalSession) {
    candidates.push({
      id: `critical-session-${session.id}`,
      needKey: `session-preparation-${session.id}`,
      priority: 1,
      title: "Concluir a preparação da próxima sessão",
      explanation:
        daysUntilSession === 0
          ? "A sessão é hoje e ainda tem preparação por concluir."
          : `A sessão é dentro de ${daysUntilSession} ${daysUntilSession === 1 ? "dia" : "dias"} e ainda tem preparação por concluir.`,
      context: sessionContext(session),
      label: "Continuar preparação",
      href: sessionHref(session.id),
    });
  }

  const document = session.documentsToReview[0];
  if (document) {
    candidates.push({
      id: `review-document-${document.id}`,
      needKey: `document-review-${document.id}`,
      priority: 2,
      title: "Rever documento da próxima sessão",
      explanation:
        session.documentsToReview.length === 1
          ? "Este documento precisa da tua revisão antes de continuares a preparação."
          : `Este documento deve ser revisto primeiro. Existem mais ${session.documentsToReview.length - 1} por rever.`,
      context: document.title,
      label: "Rever documento",
      href: documentHref(document.id, session.id),
    });
  }

  if (unfinishedPreparation && !criticalSession) {
    candidates.push({
      id: `prepare-session-${session.id}`,
      needKey: `session-preparation-${session.id}`,
      priority: 3,
      title: "Preparar a próxima sessão",
      explanation: "Revê o que falta e deixa a sessão pronta.",
      context: sessionContext(session),
      label: "Preparar sessão",
      href: sessionHref(session.id),
    });
  }

  for (const point of session.pendingPoints) {
    candidates.push({
      id: `prepare-point-${point.id}`,
      needKey: `point-preparation-${point.id}`,
      priority: 4,
      title: `Preparar ponto ${point.number}`,
      explanation: point.title,
      label: "Preparar ponto",
      href: sessionHref(session.id, `/pontos/${encodeURIComponent(point.id)}`),
    });
  }

  for (const documentInProgress of session.documentsInProgress) {
    candidates.push({
      id: `continue-document-${documentInProgress.id}`,
      needKey: `document-progress-${documentInProgress.id}`,
      priority: 5,
      title: "Continuar documento",
      explanation: documentInProgress.title,
      label: "Continuar documento",
      href: sessionHref(session.id, "/documentos-a-criar"),
    });
  }

  for (const followUp of session.followUps) {
    candidates.push({
      id: `follow-up-${followUp.id}`,
      needKey: `follow-up-${followUp.id}`,
      priority: 6,
      title: "Acompanhar documento apresentado",
      explanation: followUp.title,
      label: "Ver acompanhamento",
      href: sessionHref(session.id, "/documentos-a-criar"),
    });
  }

  return candidates.sort((a, b) => a.priority - b.priority);
}

function buildAlerts(input: TodayDecisionInput, primaryAction: TodayAction | null): TodayAlert[] {
  const session = input.nextSession;
  if (!session) return [];

  const alerts: TodayAlert[] = [];
  const primaryNeed = primaryAction?.needKey;
  const document = session.documentsToReview[0];

  if (document && primaryNeed !== `document-review-${document.id}`) {
    alerts.push({
      id: `alert-document-${document.id}`,
      needKey: `document-review-${document.id}`,
      title: "Documento relevante por rever",
      explanation: document.title,
      label: "Rever documento",
      href: documentHref(document.id, session.id),
    });
  }

  return alerts.slice(0, MAX_ALERTS);
}

export function decideToday(input: TodayDecisionInput): TodayDecision {
  const candidates = buildCandidates(input);
  const primaryCandidate = candidates[0] ?? null;
  const primaryAction: TodayAction | null = primaryCandidate
    ? {
        id: primaryCandidate.id,
        needKey: primaryCandidate.needKey,
        title: primaryCandidate.title,
        explanation: primaryCandidate.explanation,
        context: primaryCandidate.context,
        secondaryAction: primaryCandidate.secondaryAction,
        label: primaryCandidate.label,
        href: primaryCandidate.href,
      }
    : null;
  const alerts = buildAlerts(input, primaryAction);
  const usedNeeds = new Set([
    ...(primaryAction ? [primaryAction.needKey] : []),
    ...alerts.map((alert) => alert.needKey),
  ]);
  const pendingItems: TodayPendingItem[] = [];

  for (const candidate of candidates.slice(1)) {
    if (usedNeeds.has(candidate.needKey)) continue;
    usedNeeds.add(candidate.needKey);
    pendingItems.push({
      id: candidate.id,
      needKey: candidate.needKey,
      title: candidate.title,
      explanation: candidate.explanation,
      label: candidate.label,
      href: candidate.href,
    });
    if (pendingItems.length === MAX_PENDING_ITEMS) break;
  }

  if (!primaryAction && alerts.length === 0 && pendingItems.length === 0) {
    return { state: "clear", primaryAction: null, alerts: [], pendingItems: [] };
  }

  return {
    state: primaryAction?.id.startsWith("onboarding-")
      ? "onboarding"
      : primaryAction?.id.startsWith("critical-")
        ? "critical"
        : "active",
    primaryAction,
    alerts,
    pendingItems,
  };
}
