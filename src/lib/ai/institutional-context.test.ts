import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { construirBaseJuridicaInstitucional, LEGAL_BASIS_VERSION } from "@/lib/ai/legal-basis";
import {
  INSTITUTIONAL_CONTEXT_VERSION,
  resolveInstitutionalContext,
  resolveStoredInstitutionalContext,
} from "@/lib/ai/institutional-context";
import type { PerfilInstitucionalContexto } from "@/lib/ai/types";

function basePerfil(overrides: Partial<PerfilInstitucionalContexto>): PerfilInstitucionalContexto {
  return {
    nome: "Benjamin Pragana",
    cargo: "Membro da Assembleia de Freguesia",
    orgao: "Assembleia de Freguesia",
    organizacao: "Organização",
    municipio: "Lagoa",
    freguesia: "Porches",
    territorio: "Porches",
    ...overrides,
  };
}

function resolver(perfil: PerfilInstitucionalContexto, tipo = "Recomendação" as const) {
  const baseJuridica = construirBaseJuridicaInstitucional({ perfil, tipoDocumental: tipo });
  return resolveInstitutionalContext({ perfil, tipoDocumental: tipo, baseJuridica });
}

describe("Resolved Institutional Context V1", () => {
  it("resolve Assembleia de Freguesia de Porches", () => {
    const result = resolver(basePerfil({}));
    assert.equal(result.validation.valid, true);
    assert.equal(result.territory.level, "PARISH");
    assert.equal(result.territory.parishName, "Porches");
    assert.equal(result.territory.municipalityName, "Lagoa");
    assert.equal(
      result.institution.deliberativeBody.officialName,
      "Assembleia de Freguesia de Porches",
    );
    assert.equal(result.institution.executiveBody.officialName, "Junta de Freguesia de Porches");
  });

  it("resolve Assembleia Municipal de Lagoa", () => {
    const result = resolver(
      basePerfil({
        cargo: "Membro da Assembleia Municipal",
        orgao: "Assembleia Municipal",
        municipio: "Lagoa",
        freguesia: undefined,
        territorio: "Lagoa",
      }),
    );
    assert.equal(result.validation.valid, true);
    assert.equal(result.territory.level, "MUNICIPALITY");
    assert.equal(result.institution.deliberativeBody.officialName, "Assembleia Municipal de Lagoa");
    assert.equal(result.institution.executiveBody.officialName, "Câmara Municipal de Lagoa");
  });

  it("preserva compatibilidade com perfil antigo municipal seguro", () => {
    const result = resolver(
      basePerfil({
        cargo: "Membro da Assembleia Municipal",
        orgao: "Assembleia Municipal",
        territorio: "Lagoa",
        municipio: undefined,
        freguesia: undefined,
      }),
    );

    assert.equal(result.validation.valid, true);
    assert.equal(result.territory.municipalityName, "Lagoa");
    assert.equal(result.institution.executiveBody.officialName, "Câmara Municipal de Lagoa");
  });

  it("bloqueia perfil antigo de freguesia incompleto sem inventar município", () => {
    const result = resolver(
      basePerfil({
        territorio: "Porches",
        municipio: undefined,
        freguesia: undefined,
      }),
    );

    assert.equal(result.validation.valid, false);
    assert.equal(result.territory.municipalityName, "");
    assert.ok(result.validation.errors.some((erro) => erro.code === "MISSING_MUNICIPALITY"));
    assert.ok(
      result.validation.errors.some((erro) => erro.code === "INSTITUTIONAL_PROFILE_INCOMPLETE"),
    );
  });

  it("bloqueia Câmara Municipal de Porches em contexto de freguesia", () => {
    const perfil = basePerfil({});
    const baseJuridica = construirBaseJuridicaInstitucional({
      perfil,
      sessao: { id: "s1", orgao: "Câmara Municipal de Porches" },
      tipoDocumental: "Recomendação",
    });
    const result = resolveInstitutionalContext({
      perfil,
      sessao: { id: "s1", orgao: "Câmara Municipal de Porches" },
      tipoDocumental: "Recomendação",
      baseJuridica,
    });
    assert.equal(result.validation.valid, false);
    assert.ok(result.validation.errors.some((erro) => erro.code === "SESSION_BODY_MISMATCH"));
  });

  it("bloqueia município em falta", () => {
    const result = resolver(basePerfil({ municipio: undefined }));
    assert.equal(result.validation.valid, false);
    assert.ok(result.validation.errors.some((erro) => erro.code === "MISSING_MUNICIPALITY"));
  });

  it("bloqueia cargo desconhecido", () => {
    const result = resolver(basePerfil({ cargo: "representante político" }));
    assert.equal(result.validation.valid, false);
    assert.ok(result.validation.errors.some((erro) => erro.code === "UNKNOWN_INSTITUTIONAL_ROLE"));
  });

  it("propaga Base Jurídica inválida", () => {
    const perfil = basePerfil({});
    const baseJuridica = {
      ...construirBaseJuridicaInstitucional({ perfil, tipoDocumental: "Recomendação" }),
      valido: false,
      motivoInvalido: "Teste",
    };
    const result = resolveInstitutionalContext({
      perfil,
      tipoDocumental: "Recomendação",
      baseJuridica,
    });
    assert.equal(result.validation.valid, false);
    assert.equal(result.legal.status, "INVALID");
    assert.ok(result.validation.errors.some((erro) => erro.code === "LEGAL_BASIS_INVALID"));
  });

  it("bloqueia destinatário incompatível", () => {
    const perfil = basePerfil({});
    const baseJuridica = {
      ...construirBaseJuridicaInstitucional({ perfil, tipoDocumental: "Recomendação" }),
      destinatario: "Câmara Municipal de Porches",
      destinatarioTipo: "Câmara Municipal" as const,
    };
    const result = resolveInstitutionalContext({
      perfil,
      tipoDocumental: "Recomendação",
      baseJuridica,
    });
    assert.equal(result.validation.valid, false);
    assert.ok(result.validation.errors.some((erro) => erro.code === "RECIPIENT_LEVEL_MISMATCH"));
  });

  it("bloqueia sessão incompatível", () => {
    const perfil = basePerfil({});
    const baseJuridica = construirBaseJuridicaInstitucional({
      perfil,
      sessao: { id: "s1", orgao: "Assembleia Municipal de Lagoa" },
      tipoDocumental: "Moção",
    });
    const result = resolveInstitutionalContext({
      perfil,
      sessao: { id: "s1", orgao: "Assembleia Municipal de Lagoa" },
      tipoDocumental: "Moção",
      baseJuridica,
    });
    assert.equal(result.validation.valid, false);
    assert.ok(result.validation.errors.some((erro) => erro.code === "SESSION_BODY_MISMATCH"));
  });

  it("é determinístico", () => {
    const perfil = basePerfil({});
    assert.deepEqual(resolver(perfil), resolver(perfil));
  });

  it("é imutável", () => {
    const result = resolver(basePerfil({}));
    assert.equal(Object.isFrozen(result), true);
    assert.equal(Object.isFrozen(result.institution.deliberativeBody), true);
  });

  it("reconhece documento novo com contexto e versões", () => {
    const context = resolver(basePerfil({}));
    const documento = {
      tipo: "Recomendação" as const,
      iaMetadata: {
        institutionalContext: context,
        institutionalContextVersion: INSTITUTIONAL_CONTEXT_VERSION,
        legalBasisVersion: LEGAL_BASIS_VERSION,
      },
    };
    const result = resolveStoredInstitutionalContext({ documento });

    assert.equal(result.status, "RESOLVED");
    assert.equal(documento.iaMetadata.institutionalContextVersion, "1");
    assert.equal(documento.iaMetadata.legalBasisVersion, "1");
  });

  it("resolve documento antigo com dados legados suficientes", () => {
    const perfil = basePerfil({
      cargo: "Membro da Assembleia Municipal",
      orgao: "Assembleia Municipal",
      municipio: undefined,
      freguesia: undefined,
      territorio: "Lagoa",
    });
    const baseJuridica = construirBaseJuridicaInstitucional({
      perfil,
      tipoDocumental: "Recomendação",
    });
    const result = resolveStoredInstitutionalContext({
      documento: { tipo: "Recomendação", iaMetadata: {} },
      perfil,
      baseJuridica,
    });

    assert.equal(result.status, "LEGACY_RESOLVED");
    assert.equal(result.context.territory.municipalityName, "Lagoa");
  });

  it("bloqueia documento antigo com dados insuficientes", () => {
    const perfil = basePerfil({
      municipio: undefined,
      freguesia: undefined,
      territorio: "Porches",
    });
    const baseJuridica = construirBaseJuridicaInstitucional({
      perfil,
      tipoDocumental: "Recomendação",
    });
    const result = resolveStoredInstitutionalContext({
      documento: { tipo: "Recomendação", iaMetadata: {} },
      perfil,
      baseJuridica,
    });

    assert.equal(result.status, "UNRESOLVED");
  });

  it("bloqueia combinação impossível em documento legado", () => {
    const perfil = basePerfil({
      orgao: "Assembleia de Freguesia",
      municipio: "Lagoa",
      freguesia: "Porches",
      territorio: "Porches",
    });
    const baseJuridica = {
      ...construirBaseJuridicaInstitucional({ perfil, tipoDocumental: "Recomendação" }),
      destinatario: "Câmara Municipal de Porches",
      destinatarioTipo: "Câmara Municipal" as const,
    };
    const result = resolveStoredInstitutionalContext({
      documento: { tipo: "Recomendação", iaMetadata: {} },
      perfil,
      baseJuridica,
    });

    assert.equal(result.status, "UNRESOLVED");
    assert.ok(
      result.errors.some(
        (erro) => erro.code === "INVALID_RECIPIENT" || erro.code === "RECIPIENT_LEVEL_MISMATCH",
      ),
    );
  });

  it("classifica documento legado sem versões sem impedir abertura", () => {
    const result = resolveStoredInstitutionalContext({
      documento: { tipo: "Moção", iaMetadata: {} },
    });

    assert.equal(result.status, "UNRESOLVED");
    assert.ok(result.errors.some((erro) => erro.code === "INSTITUTIONAL_CONTEXT_VERSION_MISSING"));
  });
});
