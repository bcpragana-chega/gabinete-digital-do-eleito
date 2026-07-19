import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  alteracoesArquivoDocumento,
  alteracoesImportanciaDocumento,
  alteracoesTratamentoDocumento,
  documentoGeraPendenciaHoje,
  normalizarDocumento,
} from "./documentos-state";
import type { Documento } from "./types";

function documento(overrides: Partial<Documento> = {}): Documento {
  return {
    id: "doc-1",
    assembleiaId: "biblioteca",
    titulo: "Documento",
    tipo: "Outro",
    data: "2026-07-19",
    estado: "Por rever",
    importante: false,
    createdAt: "2026-07-19T10:00:00.000Z",
    ...overrides,
  };
}

describe("estado documental separado", () => {
  it("cria e normaliza um documento por rever, normal e ativo", () => {
    const novo = normalizarDocumento(documento());
    assert.equal(novo.estado, "Por rever");
    assert.equal(novo.importante, false);
    assert.equal(novo.archivedAt, undefined);
  });

  it("altera importância sem perder tratamento e tratamento sem perder importância", () => {
    const importante = { ...documento(), ...alteracoesImportanciaDocumento(true) };
    assert.equal(importante.estado, "Por rever");
    assert.equal(importante.importante, true);

    const revisto = { ...importante, ...alteracoesTratamentoDocumento("Revisto") };
    assert.equal(revisto.estado, "Revisto");
    assert.equal(revisto.importante, true);

    const normal = { ...revisto, ...alteracoesImportanciaDocumento(false) };
    assert.equal(normal.estado, "Revisto");
    assert.equal(normal.importante, false);
  });

  it("arquiva e restaura sem perder revisão ou importância", () => {
    const revistoImportante = documento({ estado: "Revisto", importante: true });
    const arquivado = {
      ...revistoImportante,
      ...alteracoesArquivoDocumento("2026-07-19T11:00:00.000Z"),
    };
    assert.equal(arquivado.estado, "Revisto");
    assert.equal(arquivado.importante, true);
    assert.equal(documentoGeraPendenciaHoje(arquivado), false);

    const restaurado = { ...arquivado, ...alteracoesArquivoDocumento(undefined) };
    assert.equal(restaurado.estado, "Revisto");
    assert.equal(restaurado.importante, true);
    assert.equal(documentoGeraPendenciaHoje(restaurado), true);
  });

  it("distingue documento por rever, importante revisto e arquivado na página Hoje", () => {
    assert.equal(documentoGeraPendenciaHoje(documento()), true);
    assert.equal(
      documentoGeraPendenciaHoje(documento({ estado: "Revisto", importante: true })),
      true,
    );
    assert.equal(
      documentoGeraPendenciaHoje(
        documento({ estado: "Por rever", archivedAt: "2026-07-19T11:00:00.000Z" }),
      ),
      false,
    );
  });

  it("faz ida e volta JSON local sem perder as quatro dimensões", () => {
    const original = documento({
      estado: "Revisto",
      importante: true,
      archivedAt: "2026-07-19T11:00:00.000Z",
      estadoAnalise: "confirmado",
    });
    const recuperado = normalizarDocumento(JSON.parse(JSON.stringify(original)) as Documento);
    assert.deepEqual(recuperado, original);
  });
});
