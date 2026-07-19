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
    nextSession: session,
    ...overrides,
  };
}

describe("motor de decisão da página Hoje", () => {
  it("transforma o onboarding sem próxima sessão na única ação principal", () => {
    const decision = decideToday(input({ onboardingRequired: true, nextSession: undefined }));

    assert.equal(decision.state, "onboarding");
    assert.equal(decision.primaryAction?.id, "onboarding-session");
    assert.deepEqual(decision.alerts, []);
    assert.deepEqual(decision.pendingItems, []);
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
});
