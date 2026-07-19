import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { documentoFromRow, documentoToRow, type DocumentoRow } from "./documentos-repository";
import type { Documento } from "./types";

function row(estado: DocumentoRow["estado"]): DocumentoRow {
  return {
    id: `doc-${estado}`,
    user_id: "user-1",
    titulo: "Documento legado",
    descricao: null,
    tipo: "Outro",
    estado,
    origem: "manual",
    origem_tipo: null,
    origem_ref: null,
    storage_bucket: null,
    storage_path: null,
    ficheiro_nome: null,
    ficheiro_tipo: null,
    ficheiro_tamanho: null,
    paginas: null,
    checksum: null,
    texto_extraido: null,
    resumo: null,
    notas: null,
    tags: [],
    assunto_origem_id: null,
    assembleia_origem_id: null,
    ponto_origem_id: null,
    data_documento: "2026-07-19",
    recebido_em: null,
    analisado_em: null,
    estado_analise: "nao_analisado",
    analise_institucional: null,
    analise_institucional_em: null,
    analise_institucional_versao: null,
    archived_at: null,
    created_at: "2026-07-19T10:00:00.000Z",
    updated_at: "2026-07-19T11:00:00.000Z",
  };
}

describe("contrato remoto dos estados documentais", () => {
  it("normaliza conservadoramente todos os valores remotos antigos", () => {
    const casos = {
      por_tratar: ["Por rever", false, false],
      em_analise: ["Por rever", false, false],
      analisado: ["Revisto", false, false],
      importante: ["Por rever", true, false],
      arquivado: ["Por rever", false, true],
    } as const;

    for (const [estadoRemoto, esperado] of Object.entries(casos)) {
      const documento = documentoFromRow(row(estadoRemoto as DocumentoRow["estado"]));
      assert.equal(documento.estado, esperado[0]);
      assert.equal(documento.importante, esperado[1]);
      assert.equal(Boolean(documento.archivedAt), esperado[2]);
    }
  });

  it("faz ida e volta remota sem perder revisão, importância, arquivo ou análise", () => {
    const original: Documento = {
      id: "doc-roundtrip",
      assembleiaId: "sessao-1",
      titulo: "Documento",
      tipo: "Ata",
      data: "2026-07-19",
      estado: "Revisto",
      importante: true,
      archivedAt: "2026-07-19T12:00:00.000Z",
      estadoAnalise: "confirmado",
      tags: ["orçamento"],
      createdAt: "2026-07-19T10:00:00.000Z",
      updatedAt: "2026-07-19T11:00:00.000Z",
    };
    const remoto = documentoToRow("user-1", original);
    const recuperado = documentoFromRow(remoto);
    assert.equal(remoto.estado, "analisado");
    assert.equal(recuperado.estado, "Revisto");
    assert.equal(recuperado.importante, true);
    assert.equal(recuperado.archivedAt, original.archivedAt);
    assert.equal(recuperado.estadoAnalise, "confirmado");
    assert.deepEqual(recuperado.tags, ["orçamento"]);
  });
});
