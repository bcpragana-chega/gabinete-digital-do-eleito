import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  criarEstadoDoFluxoPreparacao,
  criarEstadoPreparacao,
} from "@/components/preparacao/PreparationGuidancePanel";
import { calcularFluxoSessao } from "@/lib/session-flow";
import type { Assembleia } from "@/lib/types";

const panelSource = readFileSync(
  new URL("./PreparationGuidancePanel.tsx", import.meta.url),
  "utf8",
);
const sessionSource = readFileSync(
  new URL("../../routes/_app.sessoes.$id.tsx", import.meta.url),
  "utf8",
);

const estrategiaVazia = {
  objetivoPolitico: "",
  mensagemPrincipal: "",
  naoFazer: "",
  adversariosPrevisiveis: "",
  notasLivres: "",
};

const sessao: Assembleia = {
  id: "sessao-1",
  nome: "Sessão",
  data: "2026-07-19",
  hora: "18:00",
  local: "Sala",
  estado: "preparacao",
};

const pontoPreparado = {
  estado: "Preparado" as const,
  posicaoPolitica: "Apoiar",
  linhaIntervencao: "Intervir",
  sentidoVoto: "A favor" as const,
};

function criarEstado(
  sessaoAtual: Assembleia,
  options: { documentosRevistos?: boolean; comPontos?: boolean } = {},
) {
  const flow = calcularFluxoSessao({
    sessao: sessaoAtual,
    documentos: [{ estado: options.documentosRevistos === false ? "Por rever" : "Revisto" }],
    pontos: options.comPontos === false ? [] : [pontoPreparado],
    assuntosCount: 0,
    documentosPoliticosCount: 0,
  });
  return criarEstadoDoFluxoPreparacao({
    assembleiaId: sessaoAtual.id,
    preparacaoEstado: sessaoAtual.preparacaoEstado,
    flow,
  });
}

describe("estado de preparação da sessão", () => {
  it("remove score, percentagem e barra de progresso da interface", () => {
    assert.doesNotMatch(
      panelSource,
      /state\.score|state\.progressColor|width: `\$\{state\.score\}%`/,
    );
    assert.doesNotMatch(panelSource, /passos concluídos/);
  });

  it("usa estados institucionais e reserva a prontidão para a confirmação manual", () => {
    const incompleta = criarEstado(sessao, { documentosRevistos: false });
    const paraRevisao = criarEstado({ ...sessao, dadosConfirmadosEm: "agora" });
    const pronta = criarEstado({
      ...sessao,
      dadosConfirmadosEm: "agora",
      preparacaoEstado: "pronta",
    });

    assert.equal(incompleta.readinessLabel, "Preparação incompleta");
    assert.equal(paraRevisao.readinessLabel, "Pronta para confirmação");
    assert.equal(paraRevisao.canConfirm, true);
    assert.equal(paraRevisao.isComplete, false);
    assert.equal(pronta.readinessLabel, "Preparação confirmada");
    assert.equal(pronta.isComplete, true);
    assert.doesNotMatch(panelSource, /Pronta para a sessão|A sessão está preparada/);
    assert.match(sessionSource, />\s*Confirmar preparação\s*</);
    assert.match(sessionSource, /Ao confirmar, declaras que revistes os factos/);
  });

  it("não deixa pendências recomendadas bloquear a revisão", () => {
    const estado = criarEstado({ ...sessao, dadosConfirmadosEm: "agora" });
    assert.equal(estado.missingEssential.length, 0);
    assert.ok(estado.missingItems.some((item) => item.classification === "recommended"));
    assert.equal(estado.readinessLabel, "Pronta para confirmação");
  });

  it("classifica a checklist e ordena pendências essenciais primeiro", () => {
    const estado = criarEstado(sessao, { documentosRevistos: false, comPontos: false });
    assert.ok(estado.steps.some((step) => step.classification === "essential"));
    assert.ok(estado.steps.some((step) => step.classification === "recommended"));
    assert.equal(estado.nextAction.title, "Confirmar dados");
    assert.equal(estado.missingItems[0]?.classification, "essential");
  });

  it("limita as pendências principais visíveis a três", () => {
    assert.match(panelSource, /state\.missingItems\.slice\(0, 3\)\.map/);
  });

  it("não inventa preparação quando não existem dados", () => {
    const estado = criarEstadoPreparacao({
      assembleiaId: "sessao-1",
      documentos: [],
      pontos: [],
      rascunhos: [],
      estrategia: estrategiaVazia,
      preparacao: { prioridades: [], perguntas: [] },
    });
    assert.equal(estado.nextAction.button, "Carregar documentos");
    assert.equal(estado.isComplete, false);
    assert.ok(estado.missingItems.length > 3);
  });

  it("usa estratégia real e perguntas dos pontos", () => {
    const estado = criarEstadoPreparacao({
      assembleiaId: "sessao-1",
      documentos: [{ estado: "Revisto" }],
      pontos: [
        {
          id: "ponto-1",
          assembleiaId: "sessao-1",
          numero: 1,
          titulo: "Ponto",
          descricao: "",
          estado: "Preparado",
          prioridade: "Média",
          objetivoPolitico: "",
          mensagemPrincipal: "",
          notas: "",
          riscos: "",
          linhaIntervencao: "",
          notasInternas: "",
          sentidoVoto: "Por decidir",
          documentos: [],
          perguntas: ["Que medidas serão tomadas?"],
          acoes: [],
          documentosACriar: [],
        },
      ],
      rascunhos: [{}],
      estrategia: { ...estrategiaVazia, objetivoPolitico: "Aprovar uma solução" },
      preparacao: { prioridades: [], perguntas: [] },
    });
    assert.equal(estado.steps.find((passo) => passo.id === "strategy-completed")?.done, true);
    assert.equal(estado.steps.find((passo) => passo.id === "questions-prepared")?.done, true);
  });
});
