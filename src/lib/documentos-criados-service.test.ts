import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mesclarDocumentoCriadoNaCache } from "@/lib/documentos-a-criar-store";
import { guardarDocumentoCriadoComFallbackDeRelacao } from "@/lib/documentos-criados-repository";
import {
  documentoCriadoPertenceAoAssunto,
  DocumentoCriadoServiceErro,
  hrefDocumentoCriadoNoAssunto,
  obterDocumentoCriadoPorIdComDependencias,
} from "@/lib/documentos-criados-service";
import type { DocumentoCriado } from "@/lib/types";

function documento(overrides: Partial<DocumentoCriado> = {}): DocumentoCriado {
  return {
    id: "documento-1",
    tipo: "Moção",
    titulo: "Documento",
    conteudo: "Conteúdo",
    origem: "manual",
    assuntoId: "assunto-1",
    estado: "rascunho",
    createdAt: "2026-07-12T10:00:00.000Z",
    updatedAt: "2026-07-12T10:00:00.000Z",
    ...overrides,
  };
}

function dependenciasService(options?: {
  cache?: DocumentoCriado[];
  remoto?: DocumentoCriado;
  remotoConfigurado?: boolean;
  sessao?: "valida" | "expirada" | "indisponivel";
  erroRemoto?: unknown;
}) {
  const hidratados: DocumentoCriado[] = [];
  let consultasPorId = 0;

  return {
    hidratados,
    get consultasPorId() {
      return consultasPorId;
    },
    dependencias: {
      remotoConfigurado: () => options?.remotoConfigurado ?? true,
      obterEstadoSessao: async () => options?.sessao ?? "valida",
      carregarRemotoPorId: async () => {
        consultasPorId += 1;
        if (options?.erroRemoto) throw options.erroRemoto;
        return options?.remoto;
      },
      carregarCache: () => options?.cache ?? [],
      hidratarCache: (item: DocumentoCriado) => {
        hidratados.push(item);
      },
    },
  };
}

describe("serviço canónico de documentos criados", () => {
  it("carrega o remoto diretamente por ID e hidrata a cache", async () => {
    const remoto = documento();
    const contexto = dependenciasService({ remoto });
    assert.equal(
      await obterDocumentoCriadoPorIdComDependencias(remoto.id, contexto.dependencias),
      remoto,
    );
    assert.equal(contexto.consultasPorId, 1);
    assert.deepEqual(contexto.hidratados, [remoto]);
  });

  it("faz o remoto prevalecer sobre cache antiga", async () => {
    const antigo = documento({ titulo: "Antigo", updatedAt: "2026-07-11T10:00:00.000Z" });
    const remoto = documento({ titulo: "Remoto" });
    const contexto = dependenciasService({ cache: [antigo], remoto });
    const resultado = await obterDocumentoCriadoPorIdComDependencias(
      remoto.id,
      contexto.dependencias,
    );
    assert.equal(resultado?.titulo, "Remoto");
  });

  it("usa cache quando o remoto está tecnicamente indisponível", async () => {
    const cache = documento();
    const contexto = dependenciasService({ cache: [cache], sessao: "indisponivel" });
    assert.equal(
      await obterDocumentoCriadoPorIdComDependencias(cache.id, contexto.dependencias),
      cache,
    );
  });

  it("devolve inexistente quando remoto e cache não contêm o ID", async () => {
    const contexto = dependenciasService();
    assert.equal(
      await obterDocumentoCriadoPorIdComDependencias("inexistente", contexto.dependencias),
      undefined,
    );
  });

  it("distingue sessão expirada", async () => {
    const contexto = dependenciasService({ sessao: "expirada" });
    await assert.rejects(
      obterDocumentoCriadoPorIdComDependencias("documento-1", contexto.dependencias),
      (error: unknown) =>
        error instanceof DocumentoCriadoServiceErro && error.codigo === "SESSAO_EXPIRADA",
    );
  });

  it("não confunde erro remoto com documento inexistente", async () => {
    const contexto = dependenciasService({ erroRemoto: new Error("rede") });
    await assert.rejects(
      obterDocumentoCriadoPorIdComDependencias("documento-1", contexto.dependencias),
      (error: unknown) =>
        error instanceof DocumentoCriadoServiceErro && error.codigo === "INDISPONIVEL",
    );
  });

  it("não possui nem executa dependência de carregamento de lista", async () => {
    const contexto = dependenciasService({ remoto: documento() });
    await obterDocumentoCriadoPorIdComDependencias("documento-1", contexto.dependencias);
    assert.deepEqual(Object.keys(contexto.dependencias).sort(), [
      "carregarCache",
      "carregarRemotoPorId",
      "hidratarCache",
      "obterEstadoSessao",
      "remotoConfigurado",
    ]);
  });
});

describe("relação e navegação por assunto", () => {
  it("aceita apenas assuntoId igual", () => {
    assert.equal(documentoCriadoPertenceAoAssunto(documento(), "assunto-1"), true);
    assert.equal(documentoCriadoPertenceAoAssunto(documento(), "assunto-2"), false);
    assert.equal(
      documentoCriadoPertenceAoAssunto(documento({ assuntoId: undefined }), "assunto-1"),
      false,
    );
  });

  it("origem IA não autoriza assunto errado ou ausente", () => {
    assert.equal(
      documentoCriadoPertenceAoAssunto(
        documento({ origem: "ia", assuntoId: "outro" }),
        "assunto-1",
      ),
      false,
    );
    assert.equal(
      documentoCriadoPertenceAoAssunto(
        documento({ origem: "ia", assuntoId: undefined }),
        "assunto-1",
      ),
      false,
    );
  });

  it("documento manual com assunto correto abre", () => {
    assert.equal(
      documentoCriadoPertenceAoAssunto(documento({ origem: "manual" }), "assunto-1"),
      true,
    );
  });

  it("gera link somente com o assunto real do documento", () => {
    assert.equal(
      hrefDocumentoCriadoNoAssunto(documento({ assuntoId: "assunto-real" })),
      "/assuntos/assunto-real/documentos/documento-1",
    );
    assert.equal(hrefDocumentoCriadoNoAssunto(documento({ assuntoId: undefined })), undefined);
  });
});

describe("hidratação da cache", () => {
  it("não duplica e substitui versão local antiga", () => {
    const antigo = documento({ titulo: "Antigo", updatedAt: "2026-07-11T10:00:00.000Z" });
    const remoto = documento({ titulo: "Remoto" });
    const resultado = mesclarDocumentoCriadoNaCache([antigo], remoto);
    assert.equal(resultado.length, 1);
    assert.equal(resultado[0]?.titulo, "Remoto");
  });

  it("preserva edição local mais recente não sincronizada", () => {
    const local = documento({ titulo: "Local", updatedAt: "2026-07-13T10:00:00.000Z" });
    const remoto = documento({ titulo: "Remoto" });
    assert.deepEqual(mesclarDocumentoCriadoNaCache([local], remoto), [local]);
  });
});

describe("persistência das relações", () => {
  const rowBase = {
    id: "documento-1",
    assunto_id: "assunto-1",
    assembleia_id: "sessao-1",
    ponto_id: "ponto-1",
    documento_final_id: "final-1",
  } as Parameters<typeof guardarDocumentoCriadoComFallbackDeRelacao>[0];

  it("mantém assunto_id numa gravação bem-sucedida", async () => {
    const guardados: (typeof rowBase)[] = [];
    await guardarDocumentoCriadoComFallbackDeRelacao(rowBase, async (row) => {
      guardados.push(row);
      return { error: null };
    });
    assert.equal(guardados[0]?.assunto_id, "assunto-1");
  });

  it("erro de FK opcional remove apenas essa relação", async () => {
    const guardados: (typeof rowBase)[] = [];
    await guardarDocumentoCriadoComFallbackDeRelacao(rowBase, async (row) => {
      guardados.push(row);
      return guardados.length === 1
        ? { error: { code: "23503", message: "assembleia_id foreign key" } }
        : { error: null };
    });
    assert.equal(guardados[1]?.assunto_id, "assunto-1");
    assert.equal(guardados[1]?.assembleia_id, null);
    assert.equal(guardados[1]?.ponto_id, "ponto-1");
    assert.equal(guardados[1]?.documento_final_id, "final-1");
  });

  it("erro de assunto_id falha sem fallback destrutivo", async () => {
    let tentativas = 0;
    await assert.rejects(
      guardarDocumentoCriadoComFallbackDeRelacao(rowBase, async () => {
        tentativas += 1;
        return { error: { code: "23503", message: "assunto_id foreign key" } };
      }),
    );
    assert.equal(tentativas, 1);
  });
});
