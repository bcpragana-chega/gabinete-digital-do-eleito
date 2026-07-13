import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { criarCoordenadorAtualizacoes, resolverDestinoAcesso } from "./auth-store";
import { resolverVersaoOnboarding } from "./onboarding-state";

const base = {
  initialized: true,
  isAuthenticated: true,
  hasCompleteProfile: true,
  onboardingResolved: true,
  onboardingRequired: false,
};

describe("guard de autenticação e onboarding", () => {
  it("autoriza perfil completo com conclusão local e remoto indisponível", () => {
    const version = resolverVersaoOnboarding({ local: { concluido: true, version: 1 } });
    assert.equal(version, 1);
    assert.equal(resolverDestinoAcesso({ ...base, onboardingRequired: version < 1 }), "app");
  });

  it("autoriza perfil completo com onboarding remoto concluído", () => {
    const version = resolverVersaoOnboarding({ versaoRemota: 1 });
    assert.equal(resolverDestinoAcesso({ ...base, onboardingRequired: version < 1 }), "app");
  });

  it("encaminha onboarding não concluído", () => {
    assert.equal(resolverDestinoAcesso({ ...base, onboardingRequired: true }), "onboarding");
  });

  it("encaminha perfil incompleto", () => {
    assert.equal(resolverDestinoAcesso({ ...base, hasCompleteProfile: false }), "onboarding");
  });

  it("encaminha utilizador sem autenticação", () => {
    assert.equal(resolverDestinoAcesso({ ...base, isAuthenticated: false }), "login");
  });

  it("mantém acesso durante sincronização pendente local", () => {
    const version = resolverVersaoOnboarding({
      versaoRemota: 0,
      local: { concluido: true, version: 1 },
    });
    assert.equal(version, 1);
    assert.equal(resolverDestinoAcesso({ ...base, onboardingRequired: false }), "app");
  });

  it("coalesce eventos rápidos e deixa prevalecer a atualização final", async () => {
    let execucoes = 0;
    let estado = 0;
    let libertarPrimeira!: () => void;
    const primeira = new Promise<void>((resolve) => {
      libertarPrimeira = resolve;
    });
    const coordenar = criarCoordenadorAtualizacoes(async () => {
      execucoes += 1;
      if (execucoes === 1) await primeira;
      estado = execucoes;
    });
    const inicial = coordenar();
    await Promise.all([coordenar(), coordenar(), coordenar()]);
    libertarPrimeira();
    await inicial;
    assert.equal(execucoes, 2);
    assert.equal(estado, 2);
  });

  it("refresh após conclusão resolve diretamente para a aplicação", () => {
    assert.equal(resolverDestinoAcesso(base), "app");
  });
});
