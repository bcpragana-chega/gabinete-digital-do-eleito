import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  criarExecutorLogout,
  resolverDestinoAcesso,
  resolverEstadoLocalAposLogout,
} from "./auth-store";
import { resolverInterrupcaoOnboarding } from "./onboarding-state";
import { chaveTransitoriaPorUtilizador } from "./session-transient-state";

describe("saída, logout e troca de conta", () => {
  it("aguarda o logout remoto antes de finalizar localmente", async () => {
    const ordem: string[] = [];
    const executar = criarExecutorLogout({
      terminarRemoto: async () => {
        ordem.push("remoto");
      },
      finalizarLocal: () => ordem.push("local"),
    });
    await executar();
    assert.deepEqual(ordem, ["remoto", "local"]);
  });

  it("finaliza localmente quando o logout remoto falha ou excede o timeout", async () => {
    for (const erro of [new Error("remoto"), new Error("TIMEOUT_SUPABASE_SIGN_OUT")]) {
      let finalizado = false;
      const executar = criarExecutorLogout({
        terminarRemoto: async () => Promise.reject(erro),
        finalizarLocal: () => {
          finalizado = true;
        },
      });
      await executar();
      assert.equal(finalizado, true);
    }
  });

  it("coalesce chamadas repetidas numa única operação", async () => {
    let chamadas = 0;
    let libertar!: () => void;
    const pendente = new Promise<void>((resolve) => {
      libertar = resolve;
    });
    const executar = criarExecutorLogout({
      terminarRemoto: async () => {
        chamadas += 1;
        await pendente;
      },
      finalizarLocal: () => undefined,
    });
    const primeira = executar();
    const segunda = executar();
    assert.equal(primeira, segunda);
    libertar();
    await Promise.all([primeira, segunda]);
    assert.equal(chamadas, 1);
  });

  it("preserva passos seguros e recua estados transitórios para a convocatória", () => {
    assert.deepEqual(resolverInterrupcaoOnboarding({ passo: "identidade" }), {
      passo: "identidade",
      processoInterrompido: false,
    });
    assert.deepEqual(resolverInterrupcaoOnboarding({ passo: "confirmacao" }), {
      passo: "confirmacao",
      processoInterrompido: false,
    });
    assert.deepEqual(resolverInterrupcaoOnboarding({ passo: "analise" }), {
      passo: "convocatoria",
      processoInterrompido: true,
    });
    assert.deepEqual(resolverInterrupcaoOnboarding({ passo: "convocatoria", temFicheiro: true }), {
      passo: "convocatoria",
      processoInterrompido: true,
    });
  });

  it("isola caches transitórias entre duas contas", () => {
    assert.notEqual(
      chaveTransitoriaPorUtilizador("tribuno:onboarding-wow", "sessao-1", "conta-a"),
      chaveTransitoriaPorUtilizador("tribuno:onboarding-wow", "sessao-1", "conta-b"),
    );
  });

  it("remove só o utilizador ativo e preserva perfis isolados por conta", () => {
    const perfis = {
      "conta-a": { nomeInstitucional: "Conta A" },
      "conta-b": { nomeInstitucional: "Conta B" },
    } as never;
    const result = resolverEstadoLocalAposLogout({ perfisPorUserId: perfis });
    assert.deepEqual(result.perfisPorUserId, perfis);
    assert.equal(result.user, undefined);
    assert.equal(result.perfil, undefined);
  });

  it("resolve o guard para login após limpar o utilizador ativo", () => {
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

  it("mantém confirmações explícitas na aplicação e no onboarding", () => {
    const appDialog = readFileSync(
      new URL("../components/auth/LogoutConfirmDialog.tsx", import.meta.url),
      "utf8",
    );
    const onboarding = readFileSync(
      new URL("../components/auth/OnboardingInicialWizard.tsx", import.meta.url),
      "utf8",
    );
    assert.match(appDialog, /Terminar sessão\?/);
    assert.match(appDialog, /A terminar sessão…/);
    assert.match(onboarding, /Sair e continuar mais tarde/);
    assert.match(onboarding, /Sair da configuração inicial\?/);
  });
});
