import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aplicarDetalhesAcompanhamento,
  estadoAposAcontecimento,
  obterEstadoAtualAcompanhamento,
  ordenarAcompanhamentos,
} from "./acompanhamento-politico";
import {
  mapearAcompanhamento,
  paraDetalhesAcompanhamentoRow,
  type AcompanhamentoRow,
} from "./acompanhamentos-repository";
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

  it("reabre um acompanhamento resolvido com uma nova insistência sem planeamento", () => {
    const historico = [evento({ tipo: "resolucao", estado: "resolvido" })];
    const novo = evento({
      id: "a2",
      tipo: "insistencia",
      data: "2026-07-02",
      createdAt: "2026-07-02T10:00:00Z",
      estado: estadoAposAcontecimento(
        { tipo: "insistencia", data: "2026-07-02", descricao: "Nova insistência" },
        obterEstadoAtualAcompanhamento(historico),
      ),
    });
    const reaberto = [...historico, novo];

    assert.equal(obterEstadoAtualAcompanhamento(reaberto), "exige_acao");
    assert.equal(reaberto.length, 2);
    assert.equal(reaberto[0].estado, "resolvido");
  });

  it("reabre um acompanhamento resolvido com insistência planeada", () => {
    assert.equal(
      estadoAposAcontecimento(
        {
          tipo: "insistencia",
          data: "2026-07-02",
          descricao: "Insistir novamente",
          proximaAcaoEm: "2026-07-10",
        },
        "resolvido",
      ),
      "a_aguardar",
    );
  });

  it("reabre um encerramento sem resolução quando chega nova resposta", () => {
    assert.equal(
      estadoAposAcontecimento(
        { tipo: "resposta", data: "2026-07-02", descricao: "Resposta recebida" },
        "encerrado_sem_resolucao",
      ),
      "resposta_recebida",
    );
  });

  it("preserva resolução e encerramento quando o novo acontecimento é apenas uma nota", () => {
    for (const terminal of ["resolvido", "encerrado_sem_resolucao"] as const) {
      assert.equal(
        estadoAposAcontecimento(
          { tipo: "nota", data: "2026-07-02", descricao: "Contexto adicional" },
          terminal,
        ),
        terminal,
      );
    }
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

  it("edita apenas detalhes e preserva tipo, data, estado, criação e identidade", () => {
    const original = evento({
      documentoCriadoId: "d1",
      destinatario: "Executivo",
      prazo: "2026-07-08",
      proximaAcaoEm: "2026-07-09",
    });
    const atualizado = aplicarDetalhesAcompanhamento(
      original,
      {
        descricao: "  Descrição corrigida  ",
        destinatario: "  Assembleia  ",
        prazo: "2026-07-12",
        proximaAcaoEm: "2026-07-13",
        documentoCriadoId: "d2",
      },
      "2026-07-03T10:00:00Z",
    );

    assert.deepEqual(
      {
        descricao: atualizado.descricao,
        destinatario: atualizado.destinatario,
        prazo: atualizado.prazo,
        proximaAcaoEm: atualizado.proximaAcaoEm,
        documentoCriadoId: atualizado.documentoCriadoId,
        updatedAt: atualizado.updatedAt,
      },
      {
        descricao: "Descrição corrigida",
        destinatario: "Assembleia",
        prazo: "2026-07-12",
        proximaAcaoEm: "2026-07-13",
        documentoCriadoId: "d2",
        updatedAt: "2026-07-03T10:00:00Z",
      },
    );
    assert.deepEqual(
      {
        id: atualizado.id,
        assuntoId: atualizado.assuntoId,
        tipo: atualizado.tipo,
        data: atualizado.data,
        estado: atualizado.estado,
        createdAt: atualizado.createdAt,
      },
      {
        id: original.id,
        assuntoId: original.assuntoId,
        tipo: original.tipo,
        data: original.data,
        estado: original.estado,
        createdAt: original.createdAt,
      },
    );
  });

  it("envia para persistência apenas os cinco campos editáveis", () => {
    const row = paraDetalhesAcompanhamentoRow({
      descricao: "Correção",
      destinatario: "Executivo",
      prazo: "2026-07-12",
      proximaAcaoEm: "2026-07-13",
      documentoCriadoId: "d2",
    });
    assert.deepEqual(Object.keys(row).sort(), [
      "descricao",
      "destinatario",
      "documento_criado_id",
      "prazo",
      "proxima_acao_em",
    ]);
    assert.ok(!("tipo" in row));
    assert.ok(!("data" in row));
    assert.ok(!("estado" in row));
    assert.ok(!("created_at" in row));
  });

  it("rejeita uma correção com descrição vazia", () => {
    assert.throws(
      () => aplicarDetalhesAcompanhamento(evento(), { descricao: "   " }, "2026-07-03T10:00:00Z"),
      /ACOMPANHAMENTO_DESCRICAO_REQUIRED/,
    );
  });
});
