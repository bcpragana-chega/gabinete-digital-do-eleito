import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  criarCoordenadorAtualizacoes,
  executarOperacaoRemotaHidratacao,
  resolverDestinoAcesso,
} from "./auth-store";

const authSource = readFileSync(new URL("./auth-store.ts", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../routes/_app.tsx", import.meta.url), "utf8");

function nuncaResolve<T>() {
  return new Promise<T>(() => undefined);
}

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

  it("coalesce um evento auth durante uma hidratação pendente e volta a executar", async () => {
    let execucoes = 0;
    const atualizar = criarCoordenadorAtualizacoes(async () => {
      execucoes += 1;
      if (execucoes === 1) {
        await executarOperacaoRemotaHidratacao(() => nuncaResolve(), "SESSION", 5).catch(
          () => undefined,
        );
      }
    });
    const inicial = atualizar();
    await atualizar();
    await inicial;
    assert.equal(execucoes, 2);
  });

  it("finaliza sempre initialized e onboardingResolved", () => {
    assert.match(
      authSource,
      /finally \{[\s\S]*setOnboardingResolved\(true\);[\s\S]*setInitialized\(true\);/,
    );
    assert.match(authSource, /executarOperacaoRemotaHidratacao\([\s\S]*"SESSION"/);
    assert.match(authSource, /carregarPerfilHibrido\(userId\)[\s\S]*"PROFILE"/);
    assert.match(authSource, /carregarOnboardingVersionRemoto\(userId\)[\s\S]*"ONBOARDING"/);
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
});
