import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { criarCoordenadorHidratacaoPorOwner } from "./confirmed-mutation";
import { hidratarDocumentosCriadosComDependencias } from "./documentos-a-criar-store";
import { hidratarDocumentosComDependencias } from "./documentos-store";
import { hidratarPontosComDependencias, type PontoOrdemTrabalhos } from "./pontos-store";
import {
  hidratarRelacoesPontoDocumentoComDependencias,
  type RelacaoTribunoInput,
} from "./relacoes-store";
import {
  carregarTentativaCriacaoSessao,
  executarTentativaCriacaoSessao,
  guardarTentativaCriacaoSessao,
  removerTentativaCriacaoSessao,
  type TentativaCriacaoSessao,
} from "./session-creation-attempt";
import type { PontoDocumentoRow } from "./ponto-documentos-repository";
import type { Documento, DocumentoCriado, RelacaoTribuno } from "./types";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

class MemoriaStorage implements Storage {
  private values = new Map<string, string>();
  get length() {
    return this.values.size;
  }
  clear() {
    this.values.clear();
  }
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

async function comLocalStorage<T>(executar: () => Promise<T>) {
  const anterior = globalThis.window;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    writable: true,
    value: {
      localStorage: new MemoriaStorage(),
      dispatchEvent: () => true,
    },
  });
  try {
    return await executar();
  } finally {
    if (anterior === undefined) delete (globalThis as { window?: Window }).window;
    else
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        writable: true,
        value: anterior,
      });
  }
}

function novaTentativa(): TentativaCriacaoSessao {
  return {
    tentativaId: "tentativa-1",
    sessaoId: "sessao-1",
    sessaoConfirmada: false,
    pontosConfirmados: new Set(),
    documentosConfirmados: new Set(),
  };
}

function documento(id: string): Documento {
  return {
    id,
    assembleiaId: "sessao-1",
    titulo: id,
    tipo: "Outro",
    data: "2026-07-13",
    estado: "Por rever",
    createdAt: "2026-07-13T00:00:00.000Z",
  };
}

function ponto(id: string): PontoOrdemTrabalhos {
  return {
    id,
    assembleiaId: "sessao-1",
    numero: 1,
    titulo: id,
    descricao: "",
    estado: "Por preparar",
    prioridade: "Média",
    objetivoPolitico: "",
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

function documentoCriado(id: string): DocumentoCriado {
  return {
    id,
    tipo: "Outro documento",
    titulo: id,
    conteudo: "Conteúdo",
    estado: "rascunho",
    createdAt: "2026-07-13T00:00:00.000Z",
  };
}

describe("Estabilidade Beta P0 — integrações reais", () => {
  it("A: retoma sessão e pontos depois de remount sem criar segunda sessão", () =>
    comLocalStorage(async () => {
      const ownerId = "conta-a";
      const draft = { titulo: "Sessão", pontos: ["ponto-1", "ponto-2"] };
      const tentativa = novaTentativa();
      guardarTentativaCriacaoSessao(ownerId, tentativa, draft);
      let criacoesSessao = 0;
      let falharPonto2 = true;
      const chamadasPontos: string[] = [];
      const executar = (atual: TentativaCriacaoSessao) =>
        executarTentativaCriacaoSessao({
          tentativa: atual,
          pontos: draft.pontos.map((id) => ({ id, value: id })),
          documentos: [],
          criarSessao: async () => {
            criacoesSessao += 1;
          },
          criarPonto: async (_sessaoId, value) => {
            chamadasPontos.push(value);
            if (value === "ponto-2" && falharPonto2) throw new Error("PONTO_2_FALHOU");
          },
          criarDocumento: async () => undefined,
          onProgress: (progresso) => guardarTentativaCriacaoSessao(ownerId, progresso, draft),
        });

      const parcial = await executar(tentativa);
      assert.equal(parcial.concluida, false);
      const depoisDoRemount = carregarTentativaCriacaoSessao<typeof draft>(ownerId);
      assert.ok(depoisDoRemount);
      assert.deepEqual(depoisDoRemount.draft, draft);
      falharPonto2 = false;
      const final = await executar(depoisDoRemount.tentativa);
      assert.equal(final.concluida, true);
      assert.equal(criacoesSessao, 1);
      assert.deepEqual(chamadasPontos, ["ponto-1", "ponto-2", "ponto-2"]);
      removerTentativaCriacaoSessao(ownerId);
      assert.equal(carregarTentativaCriacaoSessao(ownerId), undefined);
    }));

  it("B: confirma documentos com IDs estáveis e repete apenas o segundo", () =>
    comLocalStorage(async () => {
      const ownerId = "conta-a";
      const draft = { documentos: ["documento-1", "documento-2"] };
      const tentativa = { ...novaTentativa(), sessaoConfirmada: true };
      guardarTentativaCriacaoSessao(ownerId, tentativa, draft);
      let falharDocumento2 = true;
      const chamadas: string[] = [];
      const executar = (atual: TentativaCriacaoSessao) =>
        executarTentativaCriacaoSessao({
          tentativa: atual,
          pontos: [],
          documentos: draft.documentos.map((id) => ({ id, value: id })),
          criarSessao: async () => undefined,
          criarPonto: async () => undefined,
          criarDocumento: async (_sessaoId, value) => {
            chamadas.push(value);
            if (value === "documento-2" && falharDocumento2) {
              throw new Error("DOCUMENTO_2_FALHOU");
            }
          },
          onProgress: (progresso) => guardarTentativaCriacaoSessao(ownerId, progresso, draft),
        });

      const parcial = await executar(tentativa);
      assert.equal(parcial.concluida, false);
      assert.deepEqual([...tentativa.documentosConfirmados], ["documento-1"]);
      const remount = carregarTentativaCriacaoSessao<typeof draft>(ownerId);
      assert.ok(remount);
      falharDocumento2 = false;
      assert.equal((await executar(remount.tentativa)).concluida, true);
      assert.deepEqual(chamadas, ["documento-1", "documento-2", "documento-2"]);
    }));

  it("C/D: preserva relação histórica até migração e retry não duplica", async () => {
    const ownerId = "conta-a";
    const pontoId = "ponto-1";
    const documentoId = "documento-1";
    const input: RelacaoTribunoInput = {
      origemTipo: "ponto",
      origemId: pontoId,
      destinoTipo: "documento",
      destinoId: documentoId,
      tipoRelacao: "usado_em",
    };
    const historica: RelacaoTribuno = {
      id: "local-1",
      ...input,
      createdAt: "2026-07-13T00:00:00.000Z",
      updatedAt: "2026-07-13T00:00:00.000Z",
    };
    let cache = [historica];
    const remoto = new Map<string, PontoDocumentoRow>();
    let migracoes = 0;
    const hidratar = (falhar = false) =>
      hidratarRelacoesPontoDocumentoComDependencias({
        ownerId,
        pontoId,
        lerLocais: () => cache,
        guardarLocais: (relacoes) => {
          cache = relacoes;
        },
        carregarRemotas: async () => [...remoto.values()],
        migrarRemota: async (id) => {
          migracoes += 1;
          if (falhar) throw new Error("MIGRACAO_FALHOU");
          const row = {
            id: "remota-1",
            user_id: ownerId,
            ponto_id: pontoId,
            documento_id: id,
            created_at: "2026-07-13T00:00:00.000Z",
          };
          remoto.set(id, row);
          return row;
        },
        obterUserIdAtivo: async () => ownerId,
      });

    await assert.rejects(hidratar(true), /MIGRACAO_FALHOU/);
    assert.deepEqual(cache, [historica]);
    await hidratar();
    assert.equal(cache.length, 1);
    assert.equal(remoto.size, 1);
    await hidratar();
    assert.equal(remoto.size, 1);
    assert.equal(migracoes, 2);
  });

  it("E: resposta documental de A não altera a cache de B", async () => {
    const coordenar = criarCoordenadorHidratacaoPorOwner();
    const respostaA = deferred<Documento[] | undefined>();
    let ativo = "conta-a";
    const caches = new Map<string, Documento[]>();
    const carregar = (ownerId: string, remoto: Promise<Documento[] | undefined>) =>
      coordenar({
        userId: ownerId,
        hidratar: (_geracao, isAtual) =>
          hidratarDocumentosComDependencias({
            userId: ownerId,
            carregarRemoto: () => remoto,
            obterUserIdAtivo: async () => ativo,
            carregarLocal: (id) => caches.get(id) ?? [],
            guardarLocal: (docs, id) => caches.set(id, docs),
            isAtual,
          }).then(() => undefined),
      });
    const operacaoA = carregar("conta-a", respostaA.promise);
    ativo = "conta-b";
    await carregar("conta-b", Promise.resolve([documento("doc-b")]));
    respostaA.resolve([documento("doc-a")]);
    await operacaoA;
    assert.deepEqual(
      caches.get("conta-b")?.map((item) => item.id),
      ["doc-b"],
    );
  });

  it("E: documentos criados também isolam uma resposta tardia de A", async () => {
    const respostaA = deferred<DocumentoCriado[] | undefined>();
    let ativo = "conta-a";
    const caches = new Map<string, DocumentoCriado[]>();
    const operacaoA = hidratarDocumentosCriadosComDependencias({
      userId: "conta-a",
      carregarRemoto: () => respostaA.promise,
      obterUserIdAtivo: async () => ativo,
      carregarLocal: (id) => caches.get(id) ?? [],
      guardarLocal: (docs, id) => caches.set(id, docs),
    });
    ativo = "conta-b";
    await hidratarDocumentosCriadosComDependencias({
      userId: "conta-b",
      carregarRemoto: async () => [documentoCriado("criado-b")],
      obterUserIdAtivo: async () => ativo,
      carregarLocal: (id) => caches.get(id) ?? [],
      guardarLocal: (docs, id) => caches.set(id, docs),
    });
    respostaA.resolve([documentoCriado("criado-a")]);
    await operacaoA;
    assert.deepEqual(
      caches.get("conta-b")?.map((item) => item.id),
      ["criado-b"],
    );
  });

  it("F: A → B → A ignora respostas documentais fora de ordem", async () => {
    const coordenar = criarCoordenadorHidratacaoPorOwner();
    const antigaA = deferred<Documento[] | undefined>();
    const respostaB = deferred<Documento[] | undefined>();
    const recenteA = deferred<Documento[] | undefined>();
    let ativo = "conta-a";
    const caches = new Map<string, Documento[]>();
    const carregar = (ownerId: string, remoto: Promise<Documento[] | undefined>) =>
      coordenar({
        userId: ownerId,
        hidratar: (_geracao, isAtual) =>
          hidratarDocumentosComDependencias({
            userId: ownerId,
            carregarRemoto: () => remoto,
            obterUserIdAtivo: async () => ativo,
            carregarLocal: (id) => caches.get(id) ?? [],
            guardarLocal: (docs, id) => caches.set(id, docs),
            isAtual,
          }).then(() => undefined),
      });
    const primeiraA = carregar("conta-a", antigaA.promise);
    ativo = "conta-b";
    const operacaoB = carregar("conta-b", respostaB.promise);
    ativo = "conta-a";
    const segundaA = carregar("conta-a", recenteA.promise);
    recenteA.resolve([documento("doc-a-recente")]);
    await segundaA;
    respostaB.resolve([documento("doc-b-antigo")]);
    antigaA.resolve([documento("doc-a-antigo")]);
    await Promise.all([primeiraA, operacaoB]);
    assert.deepEqual(
      caches.get("conta-a")?.map((item) => item.id),
      ["doc-a-recente"],
    );
    assert.equal(caches.has("conta-b"), false);
  });

  it("G/H: indisponível preserva pontos e sucesso [] limpa", async () => {
    const ownerId = "conta-a";
    let cache = [ponto("ponto-antigo")];
    const base = {
      userId: ownerId,
      obterUserIdAtivo: async () => ownerId,
      lerLocal: () => cache,
      guardarLocal: (pontos: PontoOrdemTrabalhos[]) => {
        cache = pontos;
      },
    };
    await hidratarPontosComDependencias({
      ...base,
      carregarRemoto: async () => undefined,
    });
    assert.deepEqual(
      cache.map((item) => item.id),
      ["ponto-antigo"],
    );
    await assert.rejects(
      hidratarPontosComDependencias({
        ...base,
        carregarRemoto: async () => {
          throw new Error("REMOTO_FALHOU");
        },
      }),
    );
    assert.deepEqual(
      cache.map((item) => item.id),
      ["ponto-antigo"],
    );
    await hidratarPontosComDependencias({
      ...base,
      carregarRemoto: async () => [],
    });
    assert.deepEqual(cache, []);
  });
});
