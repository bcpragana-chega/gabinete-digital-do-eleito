import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  criarCoordenadorHidratacaoAuth,
  criarFiltroEventosSupabase,
  executarOperacaoRemotaHidratacao,
  resolverDestinoAcesso,
  resolverEstadoComPerfilRemoto,
  resolverEstadoComSessaoValidada,
  type AuthUser,
} from "./auth-store";

const authSource = readFileSync(new URL("./auth-store.ts", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../routes/_app.tsx", import.meta.url), "utf8");

function nuncaResolve<T>() {
  return new Promise<T>(() => undefined);
}

function promessaControlada() {
  let resolver!: () => void;
  const promise = new Promise<void>((resolve) => {
    resolver = resolve;
  });
  return { promise, resolver };
}

const user = {
  id: "user-1",
  nome: "Utilizador",
  email: "user@example.test",
  provider: "google",
} satisfies AuthUser;

describe("terminação determinística da hidratação autenticada", () => {
  it("termina uma sessão Supabase que nunca resolve", async () => {
    await assert.rejects(
      executarOperacaoRemotaHidratacao(() => nuncaResolve(), "SESSION", 5),
      /TIMEOUT_SUPABASE_AUTH_HYDRATION_SESSION/,
    );
  });

  it("termina um perfil remoto que nunca resolve", async () => {
    await assert.rejects(
      executarOperacaoRemotaHidratacao(() => nuncaResolve(), "PROFILE", 5),
      /TIMEOUT_SUPABASE_AUTH_HYDRATION_PROFILE/,
    );
  });

  it("termina um onboarding remoto que nunca resolve", async () => {
    await assert.rejects(
      executarOperacaoRemotaHidratacao(() => nuncaResolve(), "ONBOARDING", 5),
      /TIMEOUT_SUPABASE_AUTH_HYDRATION_ONBOARDING/,
    );
  });

  it("propaga erro Supabase para o tratamento seguro da hidratação", async () => {
    await assert.rejects(
      executarOperacaoRemotaHidratacao(
        async () => {
          throw new Error("SUPABASE_INDISPONIVEL");
        },
        "SESSION",
        50,
      ),
      /SUPABASE_INDISPONIVEL/,
    );
    assert.match(authSource, /catch \{[\s\S]*AUTH_INIT_FALHOU/);
  });

  it("termina a hidratação inicial em single-flight", async () => {
    let execucoes = 0;
    const bloqueio = promessaControlada();
    const coordenador = criarCoordenadorHidratacaoAuth(async () => {
      execucoes += 1;
      await bloqueio.promise;
    });

    const inicial = coordenador.iniciar();
    const mesmaInicial = coordenador.iniciar();
    await Promise.resolve();
    assert.equal(execucoes, 1);
    bloqueio.resolver();
    await inicial;
    await mesmaInicial;
    assert.equal(execucoes, 1);
  });

  it("eventos durante a hidratação inicial causam no máximo uma releitura", async () => {
    let execucoes = 0;
    const bloqueio = promessaControlada();
    const coordenador = criarCoordenadorHidratacaoAuth(async () => {
      execucoes += 1;
      if (execucoes === 1) await bloqueio.promise;
    });

    const inicial = coordenador.iniciar();
    await Promise.resolve();
    const eventos = Array.from({ length: 50 }, () => coordenador.solicitarAtualizacao());
    bloqueio.resolver();
    await Promise.all([inicial, ...eventos]);
    assert.equal(execucoes, 2);
  });

  it("vários pedidos iguais durante uma atualização são coalescidos", async () => {
    let execucoes = 0;
    const coordenador = criarCoordenadorHidratacaoAuth(async () => {
      execucoes += 1;
    });
    await coordenador.iniciar();

    await Promise.all(Array.from({ length: 20 }, () => coordenador.solicitarAtualizacao()));
    assert.equal(execucoes, 2);
  });

  it("ignora eventos Supabase redundantes e preserva login, logout e troca de conta", () => {
    const deveAtualizar = criarFiltroEventosSupabase("user-1");
    assert.equal(deveAtualizar("INITIAL_SESSION", "user-1"), false);
    assert.equal(deveAtualizar("TOKEN_REFRESHED", "user-1"), false);
    assert.equal(deveAtualizar("SIGNED_IN", "user-1"), false);
    assert.equal(deveAtualizar("SIGNED_IN", "user-2"), true);
    assert.equal(deveAtualizar("SIGNED_IN", "user-2"), false);
    assert.equal(deveAtualizar("SIGNED_OUT"), true);
    assert.equal(deveAtualizar("SIGNED_OUT"), false);
    assert.equal(deveAtualizar("SIGNED_IN", "user-1"), true);
  });

  it("continua a aplicar login e logout ao estado local", () => {
    const autenticado = resolverEstadoComSessaoValidada(
      {},
      { id: user.id, email: user.email, user_metadata: {} },
    );
    assert.equal(autenticado.user?.id, user.id);
    assert.equal(resolverEstadoComSessaoValidada(autenticado).user, undefined);
  });

  it("perfil guardado e onboarding concluído continuam a pedir atualização", () => {
    assert.match(
      authSource,
      /export async function guardarPerfilEleito[\s\S]*guardarAuthState\(\{/,
    );
    assert.match(
      authSource,
      /export async function concluirOnboarding[\s\S]*window\.dispatchEvent\(new Event\(EVENT_NAME\)\)/,
    );
    assert.match(authSource, /window\.addEventListener\(EVENT_NAME, atualizar\)/);
  });

  it("timeout da sessão termina no destino login", () => {
    assert.equal(
      resolverDestinoAcesso({
        initialized: true,
        isAuthenticated: false,
        hasCompleteProfile: false,
        onboardingResolved: true,
        onboardingRequired: false,
      }),
      "login",
    );
  });

  it("falha do perfil termina no onboarding seguro", () => {
    const semPerfil = resolverEstadoComPerfilRemoto({ user }, undefined);
    assert.equal(
      resolverDestinoAcesso({
        initialized: true,
        isAuthenticated: Boolean(semPerfil.user),
        hasCompleteProfile: false,
        onboardingResolved: true,
        onboardingRequired: false,
      }),
      "onboarding",
    );
  });

  it("falha do onboarding termina no onboarding seguro", () => {
    assert.equal(
      resolverDestinoAcesso({
        initialized: true,
        isAuthenticated: true,
        hasCompleteProfile: true,
        onboardingResolved: true,
        onboardingRequired: true,
      }),
      "onboarding",
    );
  });

  it("finaliza sempre initialized e onboardingResolved", () => {
    assert.match(
      authSource,
      /finally \{[\s\S]*setOnboardingResolved\(true\);[\s\S]*setInitialized\(true\);/,
    );
    assert.match(authSource, /executarOperacaoRemotaHidratacao\([\s\S]*"SESSION"/);
    assert.match(authSource, /carregarPerfilHibrido\(userId\)[\s\S]*"PROFILE"/);
    assert.match(authSource, /carregarOnboardingVersionRemoto\(userId\)[\s\S]*"ONBOARDING"/);
    assert.doesNotMatch(authSource, /setInitialized\(false\)/);
    assert.doesNotMatch(authSource, /setOnboardingResolved\(false\)/);
  });

  it("mantém determinística a navegação normal", () => {
    const base = {
      initialized: true,
      isAuthenticated: true,
      hasCompleteProfile: true,
      onboardingResolved: true,
      onboardingRequired: false,
    };
    assert.equal(resolverDestinoAcesso({ ...base, initialized: false }), "loading");
    assert.equal(resolverDestinoAcesso({ ...base, isAuthenticated: false }), "login");
    assert.equal(resolverDestinoAcesso({ ...base, hasCompleteProfile: false }), "onboarding");
    assert.equal(resolverDestinoAcesso(base), "app");
  });

  it("apresenta recuperação visual sem logout automático", () => {
    assert.match(appSource, /AUTH_LOADING_FAILSAFE_MS = 15_000/);
    assert.match(appSource, /A preparação está a demorar mais do que o esperado/);
    assert.match(appSource, />\s*Tentar novamente\s*</);
    assert.match(appSource, />\s*Terminar sessão\s*</);
    const blocoLoading = appSource.slice(
      appSource.indexOf('if (destino === "loading")'),
      appSource.indexOf('if (destino !== "app")'),
    );
    assert.ok(blocoLoading.length > 0);
    assert.doesNotMatch(blocoLoading, /useEffect[\s\S]*logout\(/);
  });

  it("eventos redundantes não reiniciam o failsafe da rota protegida", () => {
    assert.match(
      authSource,
      /coordenador\.iniciar\(\)\.then\([\s\S]*onAuthStateChange\([\s\S]*deveAtualizarPorEvento/,
    );
    assert.match(appSource, /\}, \[destino, storageStatus\.isConfigured\]\);/);
    const deveAtualizar = criarFiltroEventosSupabase("user-1");
    assert.equal(deveAtualizar("INITIAL_SESSION", "user-1"), false);
    assert.equal(deveAtualizar("SIGNED_IN", "user-1"), false);
  });

  it("Tentar novamente reutiliza o listener existente", () => {
    assert.match(appSource, /setLoadingDemorado\(false\);[\s\S]*new Event\("tribuno:auth"\)/);
    assert.match(
      authSource,
      /useEffect\(\(\) => \{[\s\S]*window\.addEventListener\(EVENT_NAME, atualizar\)/,
    );
    assert.match(authSource, /window\.removeEventListener\(EVENT_NAME, atualizar\)/);
  });
});
