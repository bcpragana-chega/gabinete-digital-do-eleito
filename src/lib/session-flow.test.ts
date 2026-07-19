import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calcularFluxoSessao, documentoRevisto } from "./session-flow";
import type { Assembleia } from "./types";

const sessao: Assembleia = {
  id: "s1",
  nome: "Sessão",
  data: "2026-07-13",
  hora: "18:00",
  local: "Sala",
  estado: "preparacao",
};
const ponto = {
  estado: "Preparado" as const,
  posicaoPolitica: "Apoiar",
  linhaIntervencao: "Intervir",
  sentidoVoto: "A favor" as const,
};

describe("fluxo central da sessão", () => {
  it("distingue requisitos obrigatórios de opcionais e escolhe a próxima ação", () => {
    const state = calcularFluxoSessao({
      sessao,
      documentos: [],
      pontos: [],
      assuntosCount: 0,
      documentosPoliticosCount: 0,
    });
    assert.equal(state.nextAction.id, "dados");
    assert.equal(state.canMarkReady, false);
    assert.ok(state.missingOptional.every((step) => step.requirement === "optional"));
  });

  it("não deixa recomendações bloquear a confirmação humana", () => {
    const state = calcularFluxoSessao({
      sessao: { ...sessao, dadosConfirmadosEm: "agora" },
      documentos: [{ estado: "Revisto" }],
      pontos: [ponto],
      assuntosCount: 0,
      documentosPoliticosCount: 0,
    });
    assert.equal(state.canMarkReady, true);
    assert.equal(state.progress, 100);
    assert.equal(state.nextAction.id, "revisao");
    assert.ok(state.missingOptional.some((step) => step.id === "revisao"));
  });

  it("prioriza uma pendência essencial antes da revisão e das recomendações", () => {
    const state = calcularFluxoSessao({
      sessao,
      documentos: [{ estado: "Por rever" }],
      pontos: [],
      assuntosCount: 0,
      documentosPoliticosCount: 0,
    });
    assert.equal(state.nextAction.id, "dados");
    assert.equal(state.nextAction.requirement, "required");
  });

  it("usa Documento.estado como critério único de revisão", () => {
    assert.equal(documentoRevisto({ estado: "Por rever" }), false);
    assert.equal(documentoRevisto({ estado: "Revisto" }), true);
  });
});
