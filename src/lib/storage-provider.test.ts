import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolverStorageStatus,
  userScopedKey,
  writeInstitutionalJSON,
  type StorageResolutionInput,
} from "@/lib/storage-provider";

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

function resolver(patch: Partial<StorageResolutionInput> = {}) {
  return resolverStorageStatus({
    mode: "production",
    hasSupabaseConfig: false,
    hasFirestoreConfig: false,
    ...patch,
  });
}

function comWindow<T>(executar: (storage: MemoriaStorage) => T) {
  const windowAnterior = globalThis.window;
  const localStorage = new MemoriaStorage();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    writable: true,
    value: { localStorage },
  });

  try {
    return executar(localStorage);
  } finally {
    if (windowAnterior === undefined) delete (globalThis as { window?: Window }).window;
    else
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        writable: true,
        value: windowAnterior,
      });
  }
}

describe("seleção explícita da persistência", () => {
  it("não escolhe local em produção sem provider nem Supabase", () => {
    const status = resolver();
    assert.equal(status.provider, "unconfigured");
    assert.equal(status.isConfigured, false);
    assert.equal(status.localAllowed, false);
  });

  it("mantém Supabase incompleto como não configurado sem fallback", () => {
    const status = resolver({ configuredProvider: "supabase" });
    assert.equal(status.provider, "supabase");
    assert.equal(status.isConfigured, false);
    assert.equal(status.localAllowed, false);
  });

  it("mantém Firestore incompleto como não configurado sem fallback", () => {
    const status = resolver({ configuredProvider: "firestore" });
    assert.equal(status.provider, "firestore");
    assert.equal(status.isConfigured, false);
    assert.equal(status.localAllowed, false);
  });

  it("não apresenta Firestore como operacional sem implementação Beta", () => {
    const status = resolver({ configuredProvider: "firestore", hasFirestoreConfig: true });
    assert.equal(status.provider, "firestore");
    assert.equal(status.isRemote, false);
    assert.equal(status.isConfigured, false);
    assert.match(status.technicalDetail ?? "", /não está disponível nesta versão Beta/);
  });

  it("rejeita provider inválido sem o ignorar", () => {
    const status = resolver({ configuredProvider: "ficheiro" });
    assert.equal(status.provider, "unconfigured");
    assert.equal(status.isConfigured, false);
    assert.match(status.technicalDetail ?? "", /valor inválido/);
  });

  it("rejeita provider local explícito em produção", () => {
    const status = resolver({ configuredProvider: "local" });
    assert.equal(status.provider, "local");
    assert.equal(status.isConfigured, false);
    assert.equal(status.localAllowed, false);
  });

  for (const mode of ["development", "test"]) {
    it(`permite provider local em ${mode}`, () => {
      const status = resolver({ mode, configuredProvider: "local" });
      assert.equal(status.provider, "local");
      assert.equal(status.isConfigured, true);
      assert.equal(status.localAllowed, true);
    });
  }

  it("apresenta uma mensagem institucional coerente quando falta armazenamento remoto", () => {
    const status = resolver();
    assert.match(status.message, /não conseguiu ligar ao serviço de armazenamento/i);
    assert.match(status.message, /não serão guardados apenas neste dispositivo/i);
  });

  it("não escreve dados institucionais quando o fallback seria inseguro", () => {
    comWindow((localStorage) => {
      const status = resolver();
      assert.throws(
        () => writeInstitutionalJSON("tribuno:assuntos:user-a", [{ id: "assunto-1" }], status),
        (error: unknown) =>
          error instanceof Error &&
          error.name === "StorageConfigurationError" &&
          error.message === status.message,
      );
      assert.equal(localStorage.length, 0);
    });
  });

  it("mantém utilizadores isolados no modo local permitido", () => {
    comWindow((localStorage) => {
      const status = resolver({ mode: "test", configuredProvider: "local" });
      const keyA = userScopedKey("tribuno:assuntos", "Eleito A")!;
      const keyB = userScopedKey("tribuno:assuntos", "Eleito B")!;
      writeInstitutionalJSON(keyA, [{ id: "a" }], status);
      writeInstitutionalJSON(keyB, [{ id: "b" }], status);
      assert.notEqual(keyA, keyB);
      assert.deepEqual(JSON.parse(localStorage.getItem(keyA) ?? "[]"), [{ id: "a" }]);
      assert.deepEqual(JSON.parse(localStorage.getItem(keyB) ?? "[]"), [{ id: "b" }]);
    });
  });
});
