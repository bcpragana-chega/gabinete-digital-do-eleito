import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  guardarDocumentoCriadoConfirmadoComDependencias,
  mesclarDocumentoCriadoNaCache,
} from "@/lib/documentos-a-criar-store";
import {
  guardarDocumentoCriadoSemRemoverRelacoes,
  mapearDocumentoCriadoRemoto,
  type DocumentoCriadoRow,
} from "@/lib/documentos-criados-repository";
import { executarGravacaoConfirmadaDocumento } from "@/lib/document-save-flow";
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

  it("não apresenta cache como confirmada quando o remoto está indisponível", async () => {
    const cache = documento();
    const contexto = dependenciasService({ cache: [cache], sessao: "indisponivel" });
    await assert.rejects(
      obterDocumentoCriadoPorIdComDependencias(cache.id, contexto.dependencias),
      (error: unknown) =>
        error instanceof DocumentoCriadoServiceErro && error.codigo === "INDISPONIVEL",
    );
  });

  it("devolve inexistente quando remoto e cache não contêm o ID", async () => {
    const contexto = dependenciasService();
    assert.equal(
      await obterDocumentoCriadoPorIdComDependencias("inexistente", contexto.dependencias),
      undefined,
    );
  });

  it("não revela documento de outra conta mesmo que exista numa cache alheia", async () => {
    const documentoContaA = documento({ id: "documento-conta-a", titulo: "Título privado" });
    const contextoContaB = dependenciasService({ cache: [documentoContaA] });
    const resultado = await obterDocumentoCriadoPorIdComDependencias(
      documentoContaA.id,
      contextoContaB.dependencias,
    );
    assert.equal(resultado, undefined);
  });

  it("recupera apenas texto explicitamente marcado como geração pendente", async () => {
    const pendente = documento({
      conteudo: "Texto gerado que o Supabase não conseguiu guardar",
      iaMetadata: { persistenciaPendente: true },
    });
    const contexto = dependenciasService({ cache: [pendente] });
    const resultado = await obterDocumentoCriadoPorIdComDependencias(
      pendente.id,
      contexto.dependencias,
    );
    assert.equal(resultado?.conteudo, pendente.conteudo);
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
      "/documentos/documento-1",
    );
    assert.equal(
      hrefDocumentoCriadoNoAssunto(documento({ assuntoId: undefined })),
      "/documentos/documento-1",
    );
  });
});

describe("hidratação da cache", () => {
  it("mantém o ID canónico devolvido pelo servidor", () => {
    const gerado = documento({ id: "id-do-servidor", origem: "ia" });
    const sincronizados = mesclarDocumentoCriadoNaCache([], gerado);
    assert.equal(sincronizados[0]?.id, "id-do-servidor");
    assert.equal(sincronizados.length, 1);
  });

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
  } as Parameters<typeof guardarDocumentoCriadoSemRemoverRelacoes>[0];

  it("mantém assunto_id numa gravação bem-sucedida", async () => {
    const guardados: (typeof rowBase)[] = [];
    await guardarDocumentoCriadoSemRemoverRelacoes(rowBase, async (row) => {
      guardados.push(row);
      return { data: row, error: null };
    });
    assert.equal(guardados[0]?.assunto_id, "assunto-1");
  });

  it("erro de FK opcional não remove silenciosamente a relação", async () => {
    const guardados: (typeof rowBase)[] = [];
    await assert.rejects(
      guardarDocumentoCriadoSemRemoverRelacoes(rowBase, async (row) => {
        guardados.push(row);
        return { data: null, error: { code: "23503", message: "assembleia_id foreign key" } };
      }),
    );
    assert.equal(guardados.length, 1);
    assert.equal(guardados[0]?.assembleia_id, "sessao-1");
    assert.equal(guardados[0]?.ponto_id, "ponto-1");
  });

  it("erro de assunto_id falha sem fallback destrutivo", async () => {
    let tentativas = 0;
    await assert.rejects(
      guardarDocumentoCriadoSemRemoverRelacoes(rowBase, async () => {
        tentativas += 1;
        return {
          data: null,
          error: { code: "23503", message: "assunto_id foreign key" },
        };
      }),
    );
    assert.equal(tentativas, 1);
  });

  it("não assume sucesso quando o Supabase não devolve uma linha", async () => {
    await assert.rejects(
      guardarDocumentoCriadoSemRemoverRelacoes(rowBase, async () => ({
        data: null,
        error: null,
      })),
      /DOCUMENTO_CRIADO_UPSERT_SEM_DADOS/,
    );
  });
});

describe("gravação confirmada", () => {
  it("só atualiza cache e devolve sucesso depois da confirmação remota", async () => {
    const inicial = documento({ conteudo: "Antes" });
    const ordem: string[] = [];
    const cache: DocumentoCriado[][] = [];

    const resultado = await guardarDocumentoCriadoConfirmadoComDependencias(
      inicial.id,
      { conteudo: "Depois" },
      {
        carregarCache: () => [inicial],
        persistirRemoto: async (candidato) => {
          ordem.push("remoto");
          return { ...candidato, updatedAt: "2026-07-12T11:00:00.000Z" };
        },
        guardarCache: (documentos) => {
          ordem.push("cache");
          cache.push(documentos);
        },
        depoisDeConfirmar: () => ordem.push("evento"),
        agora: () => "2026-07-12T10:30:00.000Z",
      },
    );

    assert.deepEqual(ordem, ["remoto", "cache", "evento"]);
    assert.equal(resultado.conteudo, "Depois");
    assert.equal(cache[0]?.[0]?.conteudo, "Depois");
  });

  it("falha remota não altera cache nem emite evento", async () => {
    const inicial = documento({ conteudo: "Persistido" });
    let cacheAlterada = false;
    let eventoEmitido = false;

    await assert.rejects(
      guardarDocumentoCriadoConfirmadoComDependencias(
        inicial.id,
        { conteudo: "Texto pendente" },
        {
          carregarCache: () => [inicial],
          persistirRemoto: async () => {
            throw new Error("rede");
          },
          guardarCache: () => {
            cacheAlterada = true;
          },
          depoisDeConfirmar: () => {
            eventoEmitido = true;
          },
          agora: () => "2026-07-12T10:30:00.000Z",
        },
      ),
    );

    assert.equal(cacheAlterada, false);
    assert.equal(eventoEmitido, false);
  });

  it("editor não marca saved nem apaga conteúdo quando a persistência falha", async () => {
    let estado = "unsaved";
    let conteudoEditor = "Texto que o eleito acabou de editar";

    await assert.rejects(
      executarGravacaoConfirmadaDocumento({
        aoIniciar: () => {
          estado = "saving";
        },
        persistir: async () => {
          throw new Error("Supabase indisponível");
        },
        aoConfirmar: (persistido) => {
          estado = "saved";
          conteudoEditor = persistido.conteudo;
        },
        aoFalhar: () => {
          estado = "error";
        },
      }),
    );

    assert.equal(estado, "error");
    assert.equal(conteudoEditor, "Texto que o eleito acabou de editar");
  });

  it("reabertura devolve exatamente o conteúdo remoto confirmado", async () => {
    const remoto = documento({ conteudo: "Versão persistida exata" });
    const contexto = dependenciasService({
      cache: [documento({ conteudo: "Versão antiga" })],
      remoto,
    });
    const reaberto = await obterDocumentoCriadoPorIdComDependencias(
      remoto.id,
      contexto.dependencias,
    );
    assert.equal(reaberto?.conteudo, "Versão persistida exata");
  });

  it("repete dez gravações confirmadas sem perder conteúdo", async () => {
    let cache = [documento({ conteudo: "Versão 0" })];
    for (let indice = 1; indice <= 10; indice += 1) {
      const esperado = `Versão ${indice}`;
      const persistido = await guardarDocumentoCriadoConfirmadoComDependencias(
        "documento-1",
        { conteudo: esperado },
        {
          carregarCache: () => cache,
          persistirRemoto: async (candidato) => ({ ...candidato, conteudo: esperado }),
          guardarCache: (documentos) => {
            cache = documentos;
          },
          agora: () => `2026-07-12T11:${String(indice).padStart(2, "0")}:00.000Z`,
        },
      );
      assert.equal(persistido.conteudo, esperado);
      assert.equal(cache[0]?.conteudo, esperado);
    }
  });
});

describe("mapeamento remoto", () => {
  it("mapeia a linha confirmada sem alterar ID nem conteúdo", () => {
    const row: DocumentoCriadoRow = {
      id: "id-remoto",
      user_id: "user-1",
      titulo: "Título persistido",
      tipo: "recomendacao",
      estado: "em_revisao",
      conteudo: "Conteúdo persistido",
      conteudo_json: null,
      formato_conteudo: "markdown",
      resumo: null,
      notas: null,
      tags: [],
      origem: "ia",
      origem_prompt: null,
      ia_modelo: null,
      ia_metadata: null,
      assunto_id: "assunto-1",
      assembleia_id: null,
      ponto_id: null,
      documento_final_id: null,
      created_at: "2026-07-12T10:00:00.000Z",
      updated_at: "2026-07-12T11:00:00.000Z",
      archived_at: null,
      finalizado_em: null,
      apresentado_em: null,
    };

    const resultado = mapearDocumentoCriadoRemoto(row);
    assert.equal(resultado.id, row.id);
    assert.equal(resultado.conteudo, row.conteudo);
    assert.equal(resultado.estado, "em revisão");
  });
});
