import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  carregarPerfilHibridoComDependencias,
  guardarOnboardingVersionConfirmadaComDependencias,
  guardarPerfilConfirmadoComDependencias,
  guardarPerfilHibridoComDependencias,
  profileFromRow,
  profileToRow,
  resolverUrlPublicaLogo,
  type ProfileRow,
} from "@/lib/profile-repository";
import { exportarDocumentoCriadoPDF } from "@/lib/documentos-criados-export";
import type { PerfilEleito } from "@/lib/auth-store";
import type { DocumentoCriado } from "@/lib/types";

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

function row(overrides: Partial<ProfileRow> = {}): ProfileRow {
  return {
    user_id: "user-1",
    nome_institucional: "Maria Silva",
    cargo: "Membro da Assembleia Municipal",
    orgao: "Assembleia Municipal",
    organizacao: "Grupo municipal",
    territorio: "Lagoa",
    municipio: "Lagoa",
    freguesia: null,
    assinatura_institucional: null,
    logo_url: "https://storage.test/logo.png",
    updated_at: "2026-07-13T10:00:00.000Z",
    ...overrides,
  };
}

function documento(): DocumentoCriado {
  return {
    id: "documento-1",
    tipo: "Recomendação",
    titulo: "Mobilidade municipal",
    conteudo: `## ENQUADRAMENTO

O município precisa de uma resposta adequada.

## FUNDAMENTAÇÃO

A intervenção protege o interesse público.

## RECOMENDAÇÃO

1. Reforçar a resposta municipal.`,
    origem: "ia",
    assuntoId: "assunto-1",
    estado: "pronto",
    createdAt: "2026-07-13T10:00:00.000Z",
    updatedAt: "2026-07-13T10:00:00.000Z",
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

  it("toRow inclui logo_url", () => {
    const payload = profileToRow("user-1", perfil());
    assert.equal(payload.logo_url, "https://storage.test/logo.png");
  });

  it("fromRow recupera logoUrl", () => {
    const carregado = profileFromRow(row());
    assert.equal(carregado.logoUrl, "https://storage.test/logo.png");
  });

  it("round-trip remoto preserva logoUrl depois do upsert", async () => {
    let linhaRemota: ProfileRow | undefined;
    const persistido = await guardarPerfilConfirmadoComDependencias("user-1", perfil(), {
      upsert: async (payload) => {
        linhaRemota = { ...payload };
        return linhaRemota;
      },
    });

    assert.equal(linhaRemota?.logo_url, "https://storage.test/logo.png");
    assert.equal(persistido.logoUrl, "https://storage.test/logo.png");
  });

  it("carregarPerfilHibrido não remove um logótipo local válido", async () => {
    const local = perfil({ logoUrl: "data:image/png;base64,LOCAL" });
    const remoto = perfil({ logoUrl: undefined, nomeInstitucional: "Maria Remota" });
    let guardadoLocal: PerfilEleito | undefined;

    const hidratado = await carregarPerfilHibridoComDependencias("user-1", {
      remotoConfigurado: () => true,
      carregarRemoto: async () => remoto,
      carregarLocal: () => local,
      guardarLocal: (_userId, valor) => {
        guardadoLocal = valor;
      },
    });

    assert.equal(hidratado?.nomeInstitucional, "Maria Remota");
    assert.equal(hidratado?.logoUrl, "data:image/png;base64,LOCAL");
    assert.equal(guardadoLocal?.logoUrl, "data:image/png;base64,LOCAL");
  });

  it("perfil sem logótipo continua válido", async () => {
    const semLogo = perfil({ logoUrl: undefined });
    const payload = profileToRow("user-1", semLogo);
    const persistido = await guardarPerfilConfirmadoComDependencias("user-1", semLogo, {
      upsert: async (row) => row,
    });

    assert.equal(payload.logo_url, null);
    assert.equal(persistido.logoUrl, undefined);
  });

  it("upload remoto confirmado conserva apenas a URL pública", () => {
    assert.equal(
      resolverUrlPublicaLogo(
        "https://project.supabase.co/storage/v1/object/public/logos/u/logo.png",
      ),
      "https://project.supabase.co/storage/v1/object/public/logos/u/logo.png",
    );
    assert.throws(
      () => resolverUrlPublicaLogo("data:image/png;base64,GRANDE"),
      /LOGO_PUBLIC_URL_UNAVAILABLE/,
    );
  });

  it("exportação reconhece o logótipo depois de hidratar o perfil remoto", async () => {
    const perfilHidratado = profileFromRow(row());
    let iniciouDownload = false;
    const resultado = await exportarDocumentoCriadoPDF(
      documento(),
      {
        assembleia: {
          nome: "Sessão ordinária",
          tipo: "ordinaria",
          orgao: "Assembleia Municipal",
          data: "2026-07-30",
          local: "Lagoa",
        },
        perfil: perfilHidratado,
      },
      {
        desenharPaginasPdf: async () => [],
        criarPdf: async () => new Blob(["pdf"], { type: "application/pdf" }),
        iniciarDownload: () => {
          iniciouDownload = true;
        },
      },
    );

    assert.deepEqual(resultado, { status: "sucesso" });
    assert.equal(iniciouDownload, true);
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
