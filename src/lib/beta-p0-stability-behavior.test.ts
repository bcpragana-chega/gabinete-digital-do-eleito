import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ContextoUtilizadorAlteradoErro,
  executarHidratacaoIsolada,
  executarMutacaoIsolada,
} from "./confirmed-mutation";
import { resolverEstadoComSessaoValidada } from "./auth-store";
import { obterSupabaseUserIdAssuntosComDependencias } from "./assuntos-repository";
import { persistirRelacaoPontoDocumentoComDependencias } from "./relacoes-store";
import {
  executarTentativaCriacaoSessao,
  type TentativaCriacaoSessao,
} from "./session-creation-attempt";
import { terminarSessaoSupabaseComDependencias, withSupabaseTimeout } from "./supabase";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("idempotência depois de timeout", () => {
  for (const entidade of ["sessão", "assunto", "ponto"]) {
    it(`${entidade}: sucesso tardio e retry conservam uma única entidade`, async () => {
      const id = `${entidade}-id-estavel`;
      const remoto = new Map<string, string>();
      const cache = new Map<string, string>();
      const primeira = deferred<void>();
      const operacaoTardia = primeira.promise.then(() => remoto.set(id, entidade));

      await assert.rejects(
        executarMutacaoIsolada({
          userId: "conta-a",
          persistirRemoto: () => withSupabaseTimeout(operacaoTardia, "TESTE", 1),
          obterUserIdAtivo: async () => "conta-a",
          confirmarLocal: () => cache.set(id, entidade),
        }),
        /TIMEOUT_SUPABASE_TESTE/,
      );
      assert.equal(cache.size, 0);
      primeira.resolve();
      await operacaoTardia;

      await executarMutacaoIsolada({
        userId: "conta-a",
        persistirRemoto: async () => {
          remoto.set(id, entidade);
        },
        obterUserIdAtivo: async () => "conta-a",
        confirmarLocal: () => cache.set(id, entidade),
      });
      assert.equal(remoto.size, 1);
      assert.equal(cache.size, 1);
      assert.equal([...remoto.keys()][0], id);
    });

    it(`${entidade}: falha tardia permite retry posterior com o mesmo ID`, async () => {
      const id = `${entidade}-retry-id`;
      const primeira = deferred<void>();
      const falhaTardia = primeira.promise.then(() => {
        throw new Error("REMOTE_FAILED");
      });
      await assert.rejects(withSupabaseTimeout(falhaTardia, "TESTE_FALHA", 1));
      primeira.resolve();
      await assert.rejects(falhaTardia, /REMOTE_FAILED/);
      const ids: string[] = [];
      await executarMutacaoIsolada({
        userId: "conta-a",
        persistirRemoto: async () => {
          ids.push(id);
        },
        obterUserIdAtivo: async () => "conta-a",
        confirmarLocal: () => undefined,
      });
      assert.deepEqual(ids, [id]);
    });
  }

  it("uma criação nova usa uma identidade diferente da tentativa concluída", () => {
    assert.notEqual(crypto.randomUUID(), crypto.randomUUID());
  });
});

describe("isolamento assíncrono de cache", () => {
  it("ignora hidratação de A quando B fica ativa", async () => {
    const respostaA = deferred<string[]>();
    let userAtivo = "conta-a";
    const caches = new Map<string, string[]>();
    const operacao = executarHidratacaoIsolada({
      userId: "conta-a",
      carregarRemoto: () => respostaA.promise,
      obterUserIdAtivo: async () => userAtivo,
      confirmarLocal: (userId, value) => caches.set(userId, value),
    });
    userAtivo = "conta-b";
    respostaA.resolve(["dado-a"]);
    assert.equal(await operacao, undefined);
    assert.equal(caches.has("conta-b"), false);
    assert.equal(caches.has("conta-a"), false);
  });

  for (const entidade of ["sessão", "assunto", "ponto"]) {
    it(`${entidade}: confirmação de A não altera cache depois da troca para B`, async () => {
      const remoto = deferred<void>();
      let userAtivo = "conta-a";
      const caches = new Map<string, string[]>();
      const operacao = executarMutacaoIsolada({
        userId: "conta-a",
        persistirRemoto: () => remoto.promise,
        obterUserIdAtivo: async () => userAtivo,
        confirmarLocal: (userId) => caches.set(userId, [entidade]),
      });
      userAtivo = "conta-b";
      remoto.resolve();
      await assert.rejects(operacao, ContextoUtilizadorAlteradoErro);
      assert.equal(caches.size, 0);
    });
  }

  it("logout sem conta seguinte ignora a resposta antiga", async () => {
    let escrito = false;
    await executarHidratacaoIsolada({
      userId: "conta-a",
      carregarRemoto: async () => ["a"],
      obterUserIdAtivo: async () => undefined,
      confirmarLocal: () => {
        escrito = true;
      },
    });
    assert.equal(escrito, false);
  });

  it("A → B → A ignora a resposta mais antiga fora de ordem", async () => {
    const antiga = deferred<string>();
    const recente = deferred<string>();
    let versaoAtual = 1;
    let cache = "";
    const primeira = executarHidratacaoIsolada({
      userId: "conta-a",
      carregarRemoto: () => antiga.promise,
      obterUserIdAtivo: async () => "conta-a",
      confirmarLocal: (_userId, value) => {
        cache = value;
      },
      isAtual: () => versaoAtual === 1,
    });
    versaoAtual = 2;
    const segunda = executarHidratacaoIsolada({
      userId: "conta-a",
      carregarRemoto: () => recente.promise,
      obterUserIdAtivo: async () => "conta-a",
      confirmarLocal: (_userId, value) => {
        cache = value;
      },
      isAtual: () => versaoAtual === 2,
    });
    recente.resolve("recente");
    await segunda;
    antiga.resolve("antiga");
    await primeira;
    assert.equal(cache, "recente");
  });
});

describe("recuperação dos P1", () => {
  it("getUser pendente de assuntos termina por timeout recuperável", async () => {
    await assert.rejects(
      obterSupabaseUserIdAssuntosComDependencias(undefined, () => new Promise(() => undefined), 1),
      /TIMEOUT_SUPABASE_ASSUNTOS_GET_USER/,
    );
  });

  it("logout bloqueia o restauro da sessão anterior e permite outra conta", () => {
    const userA = { id: "conta-a", email: "a@teste.pt", user_metadata: {} };
    const userB = { id: "conta-b", email: "b@teste.pt", user_metadata: {} };
    assert.equal(resolverEstadoComSessaoValidada({}, userA, "conta-a").user, undefined);
    assert.equal(resolverEstadoComSessaoValidada({}, userB, "conta-a").user?.id, "conta-b");
  });

  it("falha de revogação global termina a sessão pela API local", async () => {
    const ordem: string[] = [];
    await terminarSessaoSupabaseComDependencias({
      terminarGlobal: async () => {
        ordem.push("global");
        return { error: new Error("GLOBAL_FAILED") };
      },
      terminarLocal: async () => {
        ordem.push("local");
        return { error: null };
      },
    });
    assert.deepEqual(ordem, ["global", "local"]);
  });

  it("uma relação só altera cache depois da confirmação remota", async () => {
    const remoto = deferred<void>();
    let local = false;
    const operacao = persistirRelacaoPontoDocumentoComDependencias({
      persistirRemoto: () => remoto.promise,
      confirmarLocal: () => {
        local = true;
      },
    });
    assert.equal(local, false);
    remoto.resolve();
    await operacao;
    assert.equal(local, true);
  });

  it("falha remota da relação preserva a cache", async () => {
    let local = false;
    await assert.rejects(
      persistirRelacaoPontoDocumentoComDependencias({
        persistirRemoto: async () => {
          throw new Error("REMOTE_FAILED");
        },
        confirmarLocal: () => {
          local = true;
        },
      }),
    );
    assert.equal(local, false);
  });

  it("resposta remota vazia limpa pontos e erro preserva a cache", async () => {
    let cache = ["ponto-antigo"];
    await executarHidratacaoIsolada({
      userId: "conta-a",
      carregarRemoto: async () => [] as string[],
      obterUserIdAtivo: async () => "conta-a",
      confirmarLocal: (_userId, value) => {
        cache = value;
      },
    });
    assert.deepEqual(cache, []);
    await assert.rejects(
      executarHidratacaoIsolada({
        userId: "conta-a",
        carregarRemoto: async () => {
          throw new Error("REMOTE_FAILED");
        },
        obterUserIdAtivo: async () => "conta-a",
        confirmarLocal: (_userId, value: string[]) => {
          cache = value;
        },
      }),
    );
    assert.deepEqual(cache, []);
  });

  it("sucesso parcial preserva e repete apenas os pontos pendentes", async () => {
    const tentativa: TentativaCriacaoSessao = {
      tentativaId: "tentativa-estavel",
      sessaoId: "sessao-estavel",
      sessaoConfirmada: false,
      pontosConfirmados: new Set(),
      documentosConfirmados: new Set(),
    };
    let criacoesSessao = 0;
    const chamadas: string[] = [];
    let falharPonto2 = true;
    const executar = () =>
      executarTentativaCriacaoSessao({
        tentativa,
        pontos: ["ponto-1", "ponto-2", "ponto-3"].map((id) => ({ id, value: id })),
        documentos: [],
        criarSessao: async (id) => {
          criacoesSessao += 1;
          return { id };
        },
        criarPonto: async (_sessao, ponto) => {
          chamadas.push(ponto);
          if (ponto === "ponto-2" && falharPonto2) throw new Error("PONTO_2_FALHOU");
        },
        criarDocumento: async () => undefined,
      });

    const parcial = await executar();
    assert.equal(parcial.concluida, false);
    assert.deepEqual([...tentativa.pontosConfirmados], ["ponto-1"]);
    assert.equal(tentativa.sessaoConfirmada, true);

    falharPonto2 = false;
    const final = await executar();
    assert.equal(final.concluida, true);
    assert.equal(criacoesSessao, 1);
    assert.deepEqual(chamadas, ["ponto-1", "ponto-2", "ponto-2", "ponto-3"]);
    assert.deepEqual([...tentativa.pontosConfirmados], ["ponto-1", "ponto-2", "ponto-3"]);
  });
});
