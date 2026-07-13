import assert from "node:assert/strict";
import { it } from "node:test";
import { criarPontosReordenados, type PontoOrdemTrabalhos } from "./pontos-store";

function ponto(id: string, numero: number): PontoOrdemTrabalhos {
  return {
    id,
    assembleiaId: "s1",
    numero,
    titulo: id,
    descricao: "",
    estado: "Por preparar",
    prioridade: "Média",
    objetivoPolitico: "",
    posicaoPolitica: "",
    mensagemPrincipal: "",
    notas: "",
    riscos: "",
    linhaIntervencao: "",
    notasInternas: "",
    sentidoVoto: "Por decidir",
    documentos: [],
    perguntas: [],
    acoes: [],
    documentosACriar: [],
  };
}

it("reordenação produz numeração sequencial sem perder pontos", () => {
  const result = criarPontosReordenados([ponto("a", 1), ponto("b", 2), ponto("c", 3)], "s1", [
    "c",
    "a",
    "b",
  ]);
  assert.deepEqual(
    result.map((item) => [item.id, item.numero]),
    [
      ["c", 1],
      ["a", 2],
      ["b", 3],
    ],
  );
});

it("reordenação rejeita IDs alheios à sessão", () => {
  assert.throws(() => criarPontosReordenados([ponto("a", 1)], "s1", ["x"]));
});
