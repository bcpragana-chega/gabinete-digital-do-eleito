import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  concluirOnboardingRemotoComDependencias,
  criarCoordenadorAtualizacoes,
  deveAvancarAposGuardarPerfil,
  resolverDestinoAcesso,
  resolverPerfilAutorizado,
  versaoOnboardingAposGuardarPerfil,
  type PerfilEleito,
} from "./auth-store";
import { resolverVersaoOnboarding } from "./onboarding-state";

const base = {
  initialized: true,
  isAuthenticated: true,
  hasCompleteProfile: true,
  onboardingResolved: true,
  onboardingRequired: false,
};

describe("guard de autenticação e onboarding", () => {
  it("onboarding avança depois de guardar o perfil", () => {
    assert.equal(deveAvancarAposGuardarPerfil("onboarding"), true);
    assert.equal(versaoOnboardingAposGuardarPerfil("onboarding"), 0);
  });

  it("Definições permanece na página depois de guardar o perfil", () => {
    assert.equal(deveAvancarAposGuardarPerfil("definicoes"), false);
    assert.equal(versaoOnboardingAposGuardarPerfil("definicoes"), undefined);
  });

  it("autoriza conclusão local apenas quando não existe autoridade remota configurada", () => {
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

  it("não autoriza sincronização pendente quando a versão remota é obrigatória", () => {
    const version = resolverVersaoOnboarding({
      versaoRemota: 0,
      local: { concluido: true, version: 1 },
      remotoObrigatorio: true,
    });
    assert.equal(version, 0);
    assert.equal(resolverDestinoAcesso({ ...base, onboardingRequired: true }), "onboarding");
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

  it("perfil local não prova conclusão quando a linha remota não foi confirmada", () => {
    const local = {
      nomeInstitucional: "Maria Silva",
      cargo: "Vereador",
      orgao: "Câmara Municipal",
      organizacao: "Grupo municipal",
      territorio: "Lagoa",
      updatedAt: "2026-07-13T10:00:00.000Z",
    } satisfies PerfilEleito;
    assert.equal(
      resolverPerfilAutorizado({
        perfil: local,
        supabaseConfigurado: true,
        perfilRemotoConfirmado: false,
      }),
      undefined,
    );
  });

  it("persiste o perfil antes de marcar a versão do onboarding", async () => {
    const ordem: string[] = [];
    const perfil = {
      nomeInstitucional: "Maria Silva",
      cargo: "Vereador",
      orgao: "Câmara Municipal",
      organizacao: "Grupo municipal",
      territorio: "Lagoa",
      updatedAt: "2026-07-13T10:00:00.000Z",
    } satisfies PerfilEleito;

    await concluirOnboardingRemotoComDependencias({
      userId: "user-1",
      perfil,
      version: 1,
      guardarPerfil: async () => ordem.push("perfil"),
      guardarVersion: async () => ordem.push("onboarding"),
    });
    assert.deepEqual(ordem, ["perfil", "onboarding"]);
  });

  it("não marca onboarding quando a persistência do perfil falha", async () => {
    let versaoGuardada = false;
    await assert.rejects(
      concluirOnboardingRemotoComDependencias({
        userId: "user-1",
        perfil: {
          nomeInstitucional: "Maria Silva",
          cargo: "Vereador",
          orgao: "Câmara Municipal",
          organizacao: "Grupo municipal",
          territorio: "Lagoa",
          updatedAt: "2026-07-13T10:00:00.000Z",
        },
        version: 1,
        guardarPerfil: async () => {
          throw new Error("PROFILE_UPSERT_FAILED");
        },
        guardarVersion: async () => {
          versaoGuardada = true;
        },
      }),
      /PROFILE_UPSERT_FAILED/,
    );
    assert.equal(versaoGuardada, false);
  });
});
