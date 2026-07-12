import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adicionarDocumentoComUploadComDependencias,
  apagarDocumentoComDependencias,
  DocumentoOperacaoErro,
  type NovoDocumentoInput,
} from "@/lib/documentos-store";
import { apagarDocumentoRemotoComDependencias } from "@/lib/documentos-repository";
import { DocumentoStorageErro, validarStoragePathDocumento } from "@/lib/documentos-storage";
import type { Documento } from "@/lib/types";

const input: NovoDocumentoInput & { ficheiro: File } = {
  assembleiaId: "sessao-1",
  titulo: "Documento",
  tipo: "Outro",
  data: "2026-07-12",
  estado: "Por rever",
  ficheiro: new File(["%PDF-"], "documento.pdf", { type: "application/pdf" }),
};

function documentoLocal(): Documento {
  return {
    id: "documento-id",
    assembleiaId: "sessao-1",
    titulo: "Documento",
    tipo: "Outro",
    data: "2026-07-12",
    estado: "Por rever",
    createdAt: "2026-07-12T00:00:00.000Z",
    updatedAt: "2026-07-12T00:00:00.000Z",
  };
}

function dependenciasUpload(options?: { falharMetadados?: boolean; falharRollback?: boolean }) {
  const locais: Documento[] = [];
  const removidos: string[] = [];
  const timeline: string[] = [];

  return {
    locais,
    removidos,
    timeline,
    dependencias: {
      gerarId: () => "documento-id",
      upload: async () => ({
        storageBucket: "documentos",
        storagePath: "documentos/user-id/documento-id/ficheiro.pdf",
        ficheiroNome: "documento.pdf",
        ficheiroTipo: "application/pdf",
        ficheiroTamanho: 5,
      }),
      guardarObrigatorio: async () => {
        if (options?.falharMetadados) throw new Error("METADADOS_FALHARAM");
      },
      guardarOpcional: async () => undefined,
      remover: async (path: string) => {
        removidos.push(path);
        if (options?.falharRollback) throw new Error("ROLLBACK_FALHOU");
      },
      ler: () => locais,
      escrever: (documentos: Documento[]) => {
        locais.splice(0, locais.length, ...documentos);
      },
      registarTimeline: (documento: Documento) => {
        timeline.push(documento.id);
      },
    },
  };
}

describe("ciclo de vida de documentos", () => {
  it("só persiste localmente e cria timeline depois dos metadados remotos", async () => {
    const contexto = dependenciasUpload();
    await adicionarDocumentoComUploadComDependencias(input, contexto.dependencias);
    assert.equal(contexto.locais.length, 1);
    assert.deepEqual(contexto.timeline, ["documento-id"]);
    assert.deepEqual(contexto.removidos, []);
  });

  it("remove o PDF e não persiste localmente quando os metadados falham", async () => {
    const contexto = dependenciasUpload({ falharMetadados: true });
    await assert.rejects(
      adicionarDocumentoComUploadComDependencias(input, contexto.dependencias),
      DocumentoOperacaoErro,
    );
    assert.deepEqual(contexto.removidos, ["documentos/user-id/documento-id/ficheiro.pdf"]);
    assert.deepEqual(contexto.locais, []);
    assert.deepEqual(contexto.timeline, []);
  });

  it("preserva as duas causas quando metadados e rollback falham", async () => {
    const contexto = dependenciasUpload({ falharMetadados: true, falharRollback: true });
    await assert.rejects(
      adicionarDocumentoComUploadComDependencias(input, contexto.dependencias),
      (error: unknown) =>
        error instanceof DocumentoOperacaoErro &&
        error.causaOriginal instanceof Error &&
        error.causaLimpeza instanceof Error,
    );
    assert.deepEqual(contexto.locais, []);
    assert.deepEqual(contexto.timeline, []);
  });

  it("elimina objeto, linha e só depois a cópia local", async () => {
    const ordem: string[] = [];
    const locais = [documentoLocal()];
    await apagarDocumentoRemotoComDependencias("documento-id", {
      carregar: async () => {
        ordem.push("carregar");
        return {
          id: "documento-id",
          storage_bucket: "documentos",
          storage_path: "documentos/user-id/documento-id/ficheiro.pdf",
        };
      },
      removerStorage: async () => {
        ordem.push("storage");
      },
      eliminarLinha: async () => {
        ordem.push("linha");
      },
    });
    await apagarDocumentoComDependencias("documento-id", {
      apagarRemoto: async () => {
        ordem.push("remoto-concluido");
      },
      ler: () => locais,
      escrever: () => {
        ordem.push("local");
      },
    });
    assert.deepEqual(ordem, ["carregar", "storage", "linha", "remoto-concluido", "local"]);
  });

  it("documento sem PDF elimina a linha sem chamar Storage", async () => {
    let removeuStorage = false;
    let eliminouLinha = false;
    await apagarDocumentoRemotoComDependencias("documento-id", {
      carregar: async () => ({ id: "documento-id", storage_bucket: null, storage_path: null }),
      removerStorage: async () => {
        removeuStorage = true;
      },
      eliminarLinha: async () => {
        eliminouLinha = true;
      },
    });
    assert.equal(removeuStorage, false);
    assert.equal(eliminouLinha, true);
  });

  it("falha de Storage não elimina linha nem estado local", async () => {
    let eliminouLinha = false;
    const locais = [documentoLocal()];
    await assert.rejects(
      apagarDocumentoRemotoComDependencias("documento-id", {
        carregar: async () => ({
          id: "documento-id",
          storage_bucket: "documentos",
          storage_path: "documentos/user-id/documento-id/ficheiro.pdf",
        }),
        removerStorage: async () => {
          throw new Error("STORAGE_FALHOU");
        },
        eliminarLinha: async () => {
          eliminouLinha = true;
        },
      }),
    );
    assert.equal(eliminouLinha, false);
    assert.equal(locais.length, 1);
  });

  it("falha da linha depois do Storage não remove estado local", async () => {
    const locais = [documentoLocal()];
    let storageRemovido = false;
    await assert.rejects(
      apagarDocumentoRemotoComDependencias("documento-id", {
        carregar: async () => ({
          id: "documento-id",
          storage_bucket: "documentos",
          storage_path: "documentos/user-id/documento-id/ficheiro.pdf",
        }),
        removerStorage: async () => {
          storageRemovido = true;
        },
        eliminarLinha: async () => {
          throw new Error("DELETE_FALHOU");
        },
      }),
    );
    assert.equal(storageRemovido, true);
    assert.equal(locais.length, 1);
  });

  it("documento inexistente não chama Storage nem elimina linha", async () => {
    let efeitos = 0;
    await assert.rejects(
      apagarDocumentoRemotoComDependencias("inexistente", {
        carregar: async () => null,
        removerStorage: async () => {
          efeitos += 1;
        },
        eliminarLinha: async () => {
          efeitos += 1;
        },
      }),
    );
    assert.equal(efeitos, 0);
  });

  it("rejeita path fora do namespace autenticado", () => {
    assert.throws(
      () => validarStoragePathDocumento("documentos/outro-user/doc/file.pdf", "user-id"),
      (error: unknown) =>
        error instanceof DocumentoStorageErro && error.codigo === "STORAGE_PATH_INVALIDO",
    );
  });
});
