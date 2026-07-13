import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  guardarOnboardingVersionConfirmadaComDependencias,
  guardarPerfilConfirmadoComDependencias,
  guardarPerfilHibridoComDependencias,
} from "@/lib/profile-repository";
import type { PerfilEleito } from "@/lib/auth-store";

function perfil(overrides: Partial<PerfilEleito> = {}): PerfilEleito {
  return {
    nomeInstitucional: "Maria Silva",
    cargo: "Membro da Assembleia Municipal",
    orgao: "Assembleia Municipal",
    organizacao: "Grupo municipal",
    territorio: "Lagoa",
    municipio: "Lagoa",
    logoUrl: "https://storage.test/logo.png",
    updatedAt: "2026-07-13T10:00:00.000Z",
    ...overrides,
  };
}

describe("persistência confirmada de profiles", () => {
  it("nova conta sem profile cria uma linha", async () => {
    const rows = new Map<string, unknown>();
    const persistido = await guardarPerfilConfirmadoComDependencias("user-1", perfil(), {
      upsert: async (row) => {
        rows.set(row.user_id, row);
        return row;
      },
    });

    assert.equal(rows.size, 1);
    assert.equal(persistido.nomeInstitucional, "Maria Silva");
  });

  it("profile existente é atualizado sem duplicar", async () => {
    const rows = new Map<string, unknown>([["user-1", { antigo: true }]]);
    const atualizado = await guardarPerfilConfirmadoComDependencias(
      "user-1",
      perfil({ nomeInstitucional: "Maria Atualizada" }),
      {
        upsert: async (row) => {
          rows.set(row.user_id, row);
          return row;
        },
      },
    );

    assert.equal(rows.size, 1);
    assert.equal(atualizado.nomeInstitucional, "Maria Atualizada");
  });

  it("não envia logo_url para um schema que não possui essa coluna", async () => {
    let payload: Record<string, unknown> | undefined;
    await guardarPerfilConfirmadoComDependencias("user-1", perfil(), {
      upsert: async (row) => {
        payload = row;
        return row;
      },
    });

    assert.ok(payload);
    assert.equal(Object.hasOwn(payload, "logo_url"), false);
  });

  it("update de onboarding com zero linhas não reporta sucesso", async () => {
    await assert.rejects(
      guardarOnboardingVersionConfirmadaComDependencias(
        "user-sem-profile",
        1,
        async () => undefined,
      ),
      /ONBOARDING_PROFILE_NOT_FOUND/,
    );
  });

  it("falha remota mantém o rascunho local e não devolve sucesso", async () => {
    let local: PerfilEleito | undefined;
    await assert.rejects(
      guardarPerfilHibridoComDependencias("user-1", perfil(), {
        guardarLocal: (_userId, valor) => {
          local = valor;
        },
        remotoConfigurado: () => true,
        guardarRemoto: async () => {
          throw new Error("profiles indisponível");
        },
      }),
      /profiles indisponível/,
    );
    assert.equal(local?.nomeInstitucional, "Maria Silva");
  });

  it("configuração remota ausente mantém o rascunho local mas não reporta sucesso", async () => {
    let local: PerfilEleito | undefined;
    let chamadasRemotas = 0;

    await assert.rejects(
      guardarPerfilHibridoComDependencias("user-1", perfil(), {
        guardarLocal: (_userId, valor) => {
          local = valor;
        },
        remotoConfigurado: () => false,
        guardarRemoto: async () => {
          chamadasRemotas += 1;
        },
      }),
      /PROFILE_REMOTE_NOT_CONFIGURED/,
    );

    assert.equal(local?.nomeInstitucional, "Maria Silva");
    assert.equal(chamadasRemotas, 0);
  });
});
