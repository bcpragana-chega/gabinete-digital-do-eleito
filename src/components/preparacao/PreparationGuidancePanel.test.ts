import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { criarEstadoPreparacao } from "@/components/preparacao/PreparationGuidancePanel";

const estrategiaVazia = {
  objetivoPolitico: "",
  mensagemPrincipal: "",
  naoFazer: "",
  adversariosPrevisiveis: "",
  notasLivres: "",
};

describe("estado de preparação da sessão", () => {
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
