import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  estadoAposAcontecimento,
  obterEstadoAtualAcompanhamento,
  ordenarAcompanhamentos,
} from "./acompanhamento-politico";
import { mapearAcompanhamento, type AcompanhamentoRow } from "./acompanhamentos-repository";
import { executarMutacaoConfirmada } from "./confirmed-mutation";
import type { AcompanhamentoPolitico } from "./types";

function evento(overrides: Partial<AcompanhamentoPolitico> = {}): AcompanhamentoPolitico {
  return {
    id: "a1",
    assuntoId: "assunto-1",
    tipo: "entrega",
    data: "2026-07-01",
    descricao: "Entregue ao executivo",
    estado: "a_aguardar",
    createdAt: "2026-07-01T10:00:00Z",
    updatedAt: "2026-07-01T10:00:00Z",
    ...overrides,
  };
}

describe("acompanhamento político", () => {
  it("mapeia criação associada obrigatoriamente a Assunto", () => {
    const row: AcompanhamentoRow = {
      id: "a1",
      user_id: "u1",
      assunto_id: "s1",
      documento_criado_id: null,
      tipo: "entrega",
      data: "2026-07-01",
      descricao: "Entrega",
      destinatario: null,
      prazo: null,
      proxima_acao_em: null,
      estado: "a_aguardar",
      created_at: "2026-07-01T00:00:00Z",
      updated_at: "2026-07-01T00:00:00Z",
    };
    assert.equal(mapearAcompanhamento(row).assuntoId, "s1");
  });

  it("preserva a associação opcional ao Documento Criado", () => {
    const row: AcompanhamentoRow = {
      id: "a1",
      user_id: "u1",
      assunto_id: "s1",
      documento_criado_id: "d1",
      tipo: "entrega",
      data: "2026-07-01",
      descricao: "Entrega",
      destinatario: null,
      prazo: null,
      proxima_acao_em: null,
      estado: "a_aguardar",
      created_at: "2026-07-01T00:00:00Z",
      updated_at: "2026-07-01T00:00:00Z",
    };
    assert.equal(mapearAcompanhamento(row).documentoCriadoId, "d1");
  });

  it("aplica as transições mínimas de entrega, resposta e insistência", () => {
    assert.equal(
      estadoAposAcontecimento({ tipo: "entrega", data: "2026-01-01", descricao: "x" }),
      "a_aguardar",
    );
    assert.equal(
      estadoAposAcontecimento({ tipo: "resposta", data: "2026-01-01", descricao: "x" }),
      "resposta_recebida",
    );
    assert.equal(
      estadoAposAcontecimento({ tipo: "insistencia", data: "2026-01-01", descricao: "x" }),
      "exige_acao",
    );
    assert.equal(
      estadoAposAcontecimento({
        tipo: "insistencia",
        data: "2026-01-01",
        descricao: "x",
        proximaAcaoEm: "2026-02-01",
      }),
      "a_aguardar",
    );
  });

  it("não considera uma resposta resolução automática", () => {
    assert.notEqual(
      estadoAposAcontecimento({ tipo: "resposta", data: "2026-01-01", descricao: "x" }),
      "resolvido",
    );
  });

  it("uma nota preserva o estado político atual", () => {
    assert.equal(
      estadoAposAcontecimento(
        { tipo: "nota", data: "2026-01-01", descricao: "Contexto adicional" },
        "a_aguardar",
      ),
      "a_aguardar",
    );
  });

  it("marca resolução e encerramento sem apagar a cronologia", () => {
    const historico = [
      evento(),
      evento({ id: "a2", tipo: "resolucao", estado: "resolvido", data: "2026-07-02" }),
    ];
    assert.equal(obterEstadoAtualAcompanhamento(historico), "resolvido");
    assert.equal(historico.length, 2);
    assert.equal(
      estadoAposAcontecimento({
        tipo: "nota",
        data: "2026-01-01",
        descricao: "x",
        estado: "encerrado_sem_resolucao",
      }),
      "encerrado_sem_resolucao",
    );
  });

  it("ordena deterministicamente por data, criação e id", () => {
    const ordenados = ordenarAcompanhamentos([
      evento({ id: "a1" }),
      evento({ id: "a3", createdAt: "2026-07-01T11:00:00Z" }),
      evento({ id: "a2", createdAt: "2026-07-01T11:00:00Z" }),
      evento({ id: "a0", data: "2026-07-02" }),
    ]);
    assert.deepEqual(
      ordenados.map((item) => item.id),
      ["a0", "a3", "a2", "a1"],
    );
  });

  it("não confirma sucesso local quando a persistência falha", async () => {
    let confirmou = false;
    await assert.rejects(() =>
      executarMutacaoConfirmada({
        persistirRemoto: async () => {
          throw new Error("falhou");
        },
        confirmarLocal: () => {
          confirmou = true;
        },
      }),
    );
    assert.equal(confirmou, false);
  });
});
