import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decideToday, type TodayDecisionInput, type TodaySession } from "./today-decision";

const session: TodaySession = {
  id: "session-1",
  title: "Reunião ordinária",
  date: "2026-08-10",
  time: "18:00",
  location: "Paços do Concelho",
  preparationComplete: false,
  documentsToReview: [],
  pendingPoints: [],
  documentsInProgress: [],
  followUps: [],
};

function input(overrides: Partial<TodayDecisionInput> = {}): TodayDecisionInput {
  return {
    today: "2026-08-01",
    onboardingRequired: false,
    activeSubjectCount: 1,
    registeredSessionCount: 1,
    documentsToOrganize: [],
    nextSession: session,
    ...overrides,
    politicalFollowUps: overrides.politicalFollowUps ?? [],
  };
}

describe("motor de decisão da página Hoje", () => {
  it("sugere sessão a uma conta com assunto, mas sem próxima sessão", () => {
    const decision = decideToday(
      input({
        onboardingRequired: true,
        registeredSessionCount: 0,
        nextSession: undefined,
      }),
    );

    assert.equal(decision.state, "onboarding");
    assert.equal(decision.primaryAction?.id, "onboarding-session");
    assert.deepEqual(decision.alerts, []);
    assert.deepEqual(decision.pendingItems, []);
  });

  it("faz uma conta totalmente vazia começar por um novo assunto", () => {
    const decision = decideToday(
      input({
        onboardingRequired: true,
        activeSubjectCount: 0,
        registeredSessionCount: 0,
        documentsToOrganize: [],
        nextSession: undefined,
      }),
    );

    assert.equal(decision.state, "onboarding");
    assert.equal(decision.primaryAction?.title, "Começar um novo assunto");
    assert.equal(decision.primaryAction?.label, "Novo assunto");
    assert.equal(decision.primaryAction?.href, "/assuntos");
    assert.deepEqual(decision.primaryAction?.secondaryAction, {
      label: "Analisar documentos",
      href: "/biblioteca",
    });
    assert.notEqual(decision.primaryAction?.id, "onboarding-session");
    assert.deepEqual(decision.alerts, []);
    assert.deepEqual(decision.pendingItems, []);
  });

  it("prioriza a organização de um documento quando não existem assunto ou sessão", () => {
    const decision = decideToday(
      input({
        onboardingRequired: true,
        activeSubjectCount: 0,
        registeredSessionCount: 0,
        documentsToOrganize: [{ id: "doc-library", title: "Regulamento municipal" }],
        nextSession: undefined,
      }),
    );

    assert.equal(decision.primaryAction?.id, "organize-document-doc-library");
    assert.equal(decision.primaryAction?.href, "/documentos/doc-library?origem=biblioteca");
    assert.notEqual(decision.primaryAction?.id, "onboarding-session");
  });

  it("dá prioridade a documento por rever sobre preparação genérica", () => {
    const decision = decideToday(
      input({
        nextSession: {
          ...session,
          documentsToReview: [{ id: "doc-1", title: "Convocatória" }],
        },
      }),
    );

    assert.equal(decision.primaryAction?.id, "review-document-doc-1");
    assert.match(decision.primaryAction?.href ?? "", /^\/documentos\/doc-1\?/);
  });

  it("eleva uma sessão próxima com trabalho por concluir a estado crítico", () => {
    const decision = decideToday(input({ nextSession: { ...session, date: "2026-08-03" } }));

    assert.equal(decision.state, "critical");
    assert.equal(decision.primaryAction?.id, "critical-session-session-1");
  });

  it("apresenta documento em curso quando não há uma prioridade superior", () => {
    const decision = decideToday(
      input({
        nextSession: {
          ...session,
          preparationComplete: true,
          documentsInProgress: [{ id: "draft-1", title: "Requerimento sobre transportes" }],
        },
      }),
    );

    assert.equal(decision.primaryAction?.id, "continue-document-draft-1");
  });

  it("produz estado clear quando não existe trabalho relevante", () => {
    const decision = decideToday(input({ nextSession: undefined }));

    assert.deepEqual(decision, {
      state: "clear",
      primaryAction: null,
      alerts: [],
      pendingItems: [],
    });
  });

  it("limita alertas a dois", () => {
    const decision = decideToday(
      input({
        nextSession: {
          ...session,
          date: "2026-08-02",
          documentsToReview: [
            { id: "doc-1", title: "Documento 1" },
            { id: "doc-2", title: "Documento 2" },
            { id: "doc-3", title: "Documento 3" },
          ],
        },
      }),
    );

    assert.ok(decision.alerts.length <= 2);
  });

  it("limita pendências a três", () => {
    const decision = decideToday(
      input({
        nextSession: {
          ...session,
          documentsToReview: [{ id: "doc-1", title: "Documento" }],
          pendingPoints: Array.from({ length: 5 }, (_, index) => ({
            id: `point-${index}`,
            number: index + 1,
            title: `Ponto ${index + 1}`,
          })),
        },
      }),
    );

    assert.equal(decision.pendingItems.length, 3);
  });

  it("não duplica necessidades entre ação, alertas e pendências", () => {
    const decision = decideToday(
      input({
        nextSession: {
          ...session,
          date: "2026-08-02",
          documentsToReview: [{ id: "doc-1", title: "Documento" }],
          pendingPoints: [{ id: "point-1", number: 1, title: "Mobilidade" }],
          documentsInProgress: [{ id: "draft-1", title: "Requerimento" }],
        },
      }),
    );
    const needs = [
      ...(decision.primaryAction ? [decision.primaryAction.needKey] : []),
      ...decision.alerts.map((item) => item.needKey),
      ...decision.pendingItems.map((item) => item.needKey),
    ];

    assert.equal(new Set(needs).size, needs.length);
  });

  it("mantém o estado tranquilo exclusivo", () => {
    const decision = decideToday(input({ nextSession: undefined }));

    assert.equal(decision.state, "clear");
    assert.equal(decision.primaryAction, null);
    assert.equal(decision.alerts.length, 0);
    assert.equal(decision.pendingItems.length, 0);
  });

  it("impede prioridades inferiores de ultrapassarem prioridades superiores", () => {
    const decision = decideToday(
      input({
        nextSession: {
          ...session,
          date: "2026-08-02",
          documentsToReview: [{ id: "doc-1", title: "Convocatória" }],
          pendingPoints: [{ id: "point-1", number: 1, title: "Mobilidade" }],
          documentsInProgress: [{ id: "draft-1", title: "Requerimento" }],
          followUps: [{ id: "follow-up-1", title: "Recomendação apresentada" }],
        },
      }),
    );

    assert.equal(decision.primaryAction?.id, "critical-session-session-1");
  });

  it("inclui prazo ultrapassado sem resposta", () => {
    const decision = decideToday(
      input({
        nextSession: undefined,
        politicalFollowUps: [
          {
            id: "a1",
            subjectId: "s1",
            subjectTitle: "Mobilidade",
            state: "a_aguardar",
            deadline: "2026-07-31",
          },
        ],
      }),
    );
    assert.equal(decision.primaryAction?.id, "overdue-deadline-a1");
  });

  it("não antecipa um prazo futuro", () => {
    const decision = decideToday(
      input({
        nextSession: undefined,
        politicalFollowUps: [
          {
            id: "a1",
            subjectId: "s1",
            subjectTitle: "Mobilidade",
            state: "a_aguardar",
            deadline: "2026-08-02",
          },
        ],
      }),
    );
    assert.equal(decision.state, "clear");
  });

  it("inclui próxima ação marcada para hoje ou vencida", () => {
    for (const nextActionAt of ["2026-08-01", "2026-07-30"]) {
      const decision = decideToday(
        input({
          nextSession: undefined,
          politicalFollowUps: [
            {
              id: nextActionAt,
              subjectId: "s1",
              subjectTitle: "Mobilidade",
              state: "a_aguardar",
              nextActionAt,
            },
          ],
        }),
      );
      assert.match(decision.primaryAction?.id ?? "", /^due-next-action-/);
    }
  });

  it("inclui resposta recebida ainda sem decisão", () => {
    const decision = decideToday(
      input({
        nextSession: undefined,
        politicalFollowUps: [
          { id: "a1", subjectId: "s1", subjectTitle: "Mobilidade", state: "resposta_recebida" },
        ],
      }),
    );
    assert.equal(decision.primaryAction?.id, "decide-response-a1");
  });

  it("não cria urgência por um acompanhamento aberto sem condição concreta", () => {
    const decision = decideToday(
      input({
        nextSession: undefined,
        politicalFollowUps: [
          { id: "a1", subjectId: "s1", subjectTitle: "Mobilidade", state: "a_aguardar" },
        ],
      }),
    );
    assert.equal(decision.state, "clear");
  });

  it("exclui acompanhamentos resolvidos e encerrados sem resolução", () => {
    for (const state of ["resolvido", "encerrado_sem_resolucao"] as const) {
      const decision = decideToday(
        input({
          nextSession: undefined,
          politicalFollowUps: [
            {
              id: state,
              subjectId: "s1",
              subjectTitle: "Mobilidade",
              state,
              deadline: "2026-01-01",
              nextActionAt: "2026-01-01",
            },
          ],
        }),
      );
      assert.equal(decision.state, "clear");
    }
  });

  it("volta a sinalizar em Hoje quando um novo acontecimento reabre o acompanhamento", () => {
    const fechado = decideToday(
      input({
        nextSession: undefined,
        politicalFollowUps: [
          {
            id: "resolucao",
            subjectId: "s1",
            subjectTitle: "Mobilidade",
            state: "resolvido",
            nextActionAt: "2026-08-01",
          },
        ],
      }),
    );
    const reaberto = decideToday(
      input({
        nextSession: undefined,
        politicalFollowUps: [
          {
            id: "nova-insistencia",
            subjectId: "s1",
            subjectTitle: "Mobilidade",
            state: "a_aguardar",
            nextActionAt: "2026-08-01",
          },
        ],
      }),
    );

    assert.equal(fechado.state, "clear");
    assert.equal(reaberto.primaryAction?.id, "due-next-action-nova-insistencia");
  });

  it("reflete em Hoje a correção de prazo ou próxima ação do acontecimento atual", () => {
    for (const detalhes of [{ deadline: "2026-07-31" }, { nextActionAt: "2026-08-01" }]) {
      const decision = decideToday(
        input({
          nextSession: undefined,
          politicalFollowUps: [
            {
              id: "a-editado",
              subjectId: "s1",
              subjectTitle: "Mobilidade",
              state: "a_aguardar",
              ...detalhes,
            },
          ],
        }),
      );
      assert.notEqual(decision.state, "clear");
    }
  });

  it("não duplica um acompanhamento com prazo e próxima ação vencidos", () => {
    const decision = decideToday(
      input({
        politicalFollowUps: [
          {
            id: "a1",
            subjectId: "s1",
            subjectTitle: "Mobilidade",
            state: "a_aguardar",
            deadline: "2026-07-01",
            nextActionAt: "2026-07-02",
          },
        ],
      }),
    );
    const needs = [
      ...(decision.primaryAction ? [decision.primaryAction.needKey] : []),
      ...decision.alerts.map((item) => item.needKey),
      ...decision.pendingItems.map((item) => item.needKey),
    ];
    assert.equal(needs.filter((key) => key === "political-follow-up-a1").length, 1);
  });
});
