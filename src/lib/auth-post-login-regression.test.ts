import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  carregarPerfilDepoisDeAuthConfirmada,
  deveLimparEstadoLocalAposFalhaLogin,
  executarLoginSupabaseConfirmado,
  perfilCompleto,
  type PerfilEleito,
} from "./auth-store";
import {
  codigoLoginDoErro,
  executarNavegacaoAposAuthConfirmada,
  NavigationAfterAuthError,
  ProfileAfterAuthError,
  SupabaseAuthTimeoutError,
} from "./auth-errors";

const supabaseUser = {
  id: "user-confirmado",
  email: "eleito@example.test",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: "2026-07-20T00:00:00.000Z",
};

const perfilCompletoValido: PerfilEleito = {
  nomeInstitucional: "Eleito",
  cargo: "Membro da Assembleia Municipal",
  orgao: "Assembleia Municipal",
  organizacao: "Município",
  territorio: "Município",
  municipio: "Município",
  updatedAt: "2026-07-20T00:00:00.000Z",
};

describe("regressão após GET /user 200", () => {
  it("profile ausente mantém a autenticação e segue para onboarding", async () => {
    const resultado = await executarLoginSupabaseConfirmado({
      iniciar: async () => supabaseUser,
      registar: () => undefined,
      confirmar: () => carregarPerfilDepoisDeAuthConfirmada({ carregar: async () => undefined }),
    });

    assert.equal(resultado, undefined);
    assert.equal(perfilCompleto(resultado), false);
  });

  it("profile inválido é erro de profile e não de autenticação", async () => {
    const error = await executarLoginSupabaseConfirmado({
      iniciar: async () => supabaseUser,
      registar: () => undefined,
      confirmar: () => carregarPerfilDepoisDeAuthConfirmada({ carregar: async () => "inválido" }),
    }).catch((caught: unknown) => caught);

    assert.ok(error instanceof ProfileAfterAuthError);
    assert.equal(codigoLoginDoErro(error), "ERRO_LOGIN_PERFIL");
    assert.equal(deveLimparEstadoLocalAposFalhaLogin({ authConfirmada: true, error }), false);
  });

  it("profile existente mas incompleto ou com campos nulos segue para onboarding", async () => {
    const resultado = await executarLoginSupabaseConfirmado({
      iniciar: async () => supabaseUser,
      registar: () => undefined,
      confirmar: () =>
        carregarPerfilDepoisDeAuthConfirmada({
          carregar: async () => ({
            nomeInstitucional: null,
            cargo: null,
            orgao: null,
            organizacao: null,
            territorio: null,
            updatedAt: null,
          }),
        }),
    });

    assert.equal(perfilCompleto(resultado), false);
  });

  it("timeout local do profile não invalida a sessão já criada", async () => {
    const localTimeout = new SupabaseAuthTimeoutError("PROFILE_SELECT");
    const error = await executarLoginSupabaseConfirmado({
      iniciar: async () => supabaseUser,
      registar: () => undefined,
      confirmar: () =>
        carregarPerfilDepoisDeAuthConfirmada({
          carregar: async () => {
            throw localTimeout;
          },
        }),
    }).catch((caught: unknown) => caught);

    assert.ok(error instanceof ProfileAfterAuthError);
    assert.equal(codigoLoginDoErro(error), "ERRO_LOGIN_PERFIL");
    assert.equal(deveLimparEstadoLocalAposFalhaLogin({ authConfirmada: true, error }), false);
  });

  it("timeout local do sign-in não apaga uma sessão que pode ter sido criada remotamente", () => {
    const error = new SupabaseAuthTimeoutError("SIGN_IN_WITH_ID_TOKEN");
    assert.equal(deveLimparEstadoLocalAposFalhaLogin({ authConfirmada: false, error }), false);
    assert.equal(codigoLoginDoErro(error), "ERRO_LOGIN_SUPABASE_TIMEOUT");
  });

  it("erro de navegação posterior é classificado sem invalidar Auth", async () => {
    const error = await executarLoginSupabaseConfirmado({
      iniciar: async () => supabaseUser,
      registar: () => undefined,
      confirmar: () =>
        executarNavegacaoAposAuthConfirmada(async () => {
          throw new Error("ROUTER_FAILED");
        }),
    }).catch((caught: unknown) => caught);

    assert.ok(error instanceof NavigationAfterAuthError);
    assert.equal(codigoLoginDoErro(error), "ERRO_LOGIN_NAVEGACAO");
    assert.equal(deveLimparEstadoLocalAposFalhaLogin({ authConfirmada: true, error }), false);
  });

  it("login normal continua a carregar um profile completo", async () => {
    const resultado = await executarLoginSupabaseConfirmado({
      iniciar: async () => supabaseUser,
      registar: () => undefined,
      confirmar: () =>
        carregarPerfilDepoisDeAuthConfirmada({ carregar: async () => perfilCompletoValido }),
    });

    assert.equal(resultado?.nomeInstitucional, perfilCompletoValido.nomeInstitucional);
    assert.equal(resultado?.orgao, perfilCompletoValido.orgao);
    assert.equal(perfilCompleto(resultado), true);
  });

  it("mensagens genéricas com auth ou Supabase já não são reclassificadas", () => {
    assert.equal(codigoLoginDoErro(new Error("AUTH_POST_LOGIN_FAILED")), "ERRO_LOGIN_DESCONHECIDO");
    assert.equal(
      codigoLoginDoErro(new Error("SUPABASE_PROFILE_FAILED")),
      "ERRO_LOGIN_DESCONHECIDO",
    );
  });
});
