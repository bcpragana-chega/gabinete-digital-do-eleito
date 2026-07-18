import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "node:test";
import {
  nomeLocalDisponivel,
  resolverDestinoAcesso,
  resolverEstadoComPerfilRemoto,
  resolverEstadoComSessaoValidada,
  useAuth,
  type AuthUser,
  type PerfilEleito,
} from "./auth-store";

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

const user = {
  id: "user-local",
  nome: "Nome da Conta",
  email: "conta@example.test",
  provider: "google",
} satisfies AuthUser;

function perfil(nomeInstitucional: string): PerfilEleito {
  return {
    nomeInstitucional,
    cargo: "Vereador",
    orgao: "Câmara Municipal",
    organizacao: "Grupo municipal",
    territorio: "Lisboa",
    updatedAt: "2026-07-19T10:00:00.000Z",
  };
}

function AuthProbe() {
  const auth = useAuth();
  return createElement("output", {
    "data-initialized": String(auth.initialized),
    "data-local-name": auth.localDisplayName,
    "data-authenticated": String(auth.isAuthenticated),
  });
}

describe("hidratação visual otimista da autenticação", () => {
  it("lê o estado local no primeiro render e mantém initialized falso", () => {
    const windowAnterior = globalThis.window;
    const localStorage = new MemoriaStorage();
    localStorage.setItem(
      "tribuno.auth.v1",
      JSON.stringify({ user, perfil: perfil("Benjamin Pragana") }),
    );
    localStorage.setItem("tribuno:perfil:user-local", JSON.stringify(perfil("Benjamin Pragana")));
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      writable: true,
      value: { localStorage },
    });

    try {
      const markup = renderToStaticMarkup(createElement(AuthProbe));
      assert.match(markup, /data-initialized="false"/);
      assert.match(markup, /data-local-name="Benjamin Pragana"/);
      assert.match(markup, /data-authenticated="true"/);
    } finally {
      if (windowAnterior === undefined) delete (globalThis as { window?: Window }).window;
      else
        Object.defineProperty(globalThis, "window", {
          configurable: true,
          writable: true,
          value: windowAnterior,
        });
    }
  });

  it("não autoriza a aplicação apenas com o estado local hidratado", () => {
    assert.equal(
      resolverDestinoAcesso({
        initialized: false,
        isAuthenticated: true,
        hasCompleteProfile: true,
        onboardingResolved: false,
        onboardingRequired: false,
      }),
      "loading",
    );
  });

  it("prefere o perfil institucional da conta atual e não inventa fallback", () => {
    assert.equal(nomeLocalDisponivel(user, perfil("Benjamin Pragana")), "Benjamin Pragana");
    assert.equal(nomeLocalDisponivel(user), "Nome da Conta");
    assert.equal(nomeLocalDisponivel(), undefined);
  });

  it("remove o nome local quando a sessão é inválida ou rejeitada após logout", () => {
    const semSessao = resolverEstadoComSessaoValidada({ user, perfil: perfil("Nome Antigo") });
    assert.equal(nomeLocalDisponivel(semSessao.user, semSessao.perfil), undefined);

    const bloqueada = resolverEstadoComSessaoValidada(
      { user, perfil: perfil("Nome Antigo") },
      { id: user.id, email: user.email, user_metadata: {} },
      user.id,
    );
    assert.equal(nomeLocalDisponivel(bloqueada.user, bloqueada.perfil), undefined);
  });

  it("deixa a confirmação remota substituir o perfil local", () => {
    const remoto = perfil("Nome Confirmado");
    const confirmado = resolverEstadoComPerfilRemoto(
      { user, perfil: perfil("Nome Local"), perfisPorUserId: { [user.id]: perfil("Nome Local") } },
      remoto,
    );
    assert.equal(confirmado.perfil, remoto);
    assert.equal(confirmado.perfisPorUserId?.[user.id], remoto);
    assert.equal(confirmado.perfilRemotoConfirmado, true);
  });
});
