import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  construirBaseJuridicaInstitucional,
  type BaseJuridicaInstitucional,
} from "@/lib/ai/legal-basis";

const perfilBase = {
  nome: "Eleito",
  cargo: "Membro",
  organizacao: "Organização",
  territorio: "Porches",
};

function temArtigo(base: BaseJuridicaInstitucional, diploma: string, artigo: string) {
  return base.artigosAplicaveis.some((item) => item.diploma === diploma && item.artigo === artigo);
}

describe("Base Jurídica Institucional V1", () => {
  it("resolve Moção em Assembleia de Freguesia com CRP 245.º e Lei 75/2013 artigo 9.º", () => {
    const base = construirBaseJuridicaInstitucional({
      perfil: { ...perfilBase, orgao: "Assembleia de Freguesia" },
      tipoDocumental: "Moção",
    });

    assert.equal(base.valido, true);
    assert.equal(base.tipoOrgao, "Assembleia de Freguesia");
    assert.equal(base.destinatarioTipo, "Assembleia de Freguesia");
    assert.equal(temArtigo(base, "Constituição da República Portuguesa", "245.º"), true);
    assert.equal(temArtigo(base, "Lei n.º 75/2013", "9.º"), true);
  });

  it("resolve Recomendação da Assembleia de Freguesia à Junta de Freguesia", () => {
    const base = construirBaseJuridicaInstitucional({
      perfil: { ...perfilBase, orgao: "Assembleia de Freguesia" },
      tipoDocumental: "Recomendação",
    });

    assert.equal(base.valido, true);
    assert.equal(base.destinatarioTipo, "Junta de Freguesia");
    assert.match(base.destinatario, /Junta de Freguesia/);
    assert.equal(temArtigo(base, "Lei n.º 75/2013", "9.º"), true);
  });

  it("resolve Requerimento da Assembleia Municipal à Câmara Municipal", () => {
    const base = construirBaseJuridicaInstitucional({
      perfil: { ...perfilBase, orgao: "Assembleia Municipal", territorio: "Lagoa" },
      tipoDocumental: "Requerimento",
    });

    assert.equal(base.valido, true);
    assert.equal(base.destinatarioTipo, "Câmara Municipal");
    assert.match(base.destinatario, /Câmara Municipal de Lagoa/);
    assert.equal(temArtigo(base, "Lei n.º 75/2013", "25.º"), true);
  });

  it("resolve Declaração de voto ligada a sessão e ponto sem competência executiva", () => {
    const base = construirBaseJuridicaInstitucional({
      perfil: { ...perfilBase, orgao: "Assembleia Municipal", territorio: "Lagoa" },
      sessao: { id: "sessao-1", orgao: "Assembleia Municipal", ordemTrabalhos: "Ponto 1" },
      tipoDocumental: "Declaração de voto",
    });

    assert.equal(base.valido, true);
    assert.equal(base.destinatarioTipo, "Assembleia Municipal");
    assert.equal(base.competenciasPorPapel.executivas.length, 0);
  });

  it("mantém inválido conflito Assembleia de Freguesia + Câmara Municipal", () => {
    const base = construirBaseJuridicaInstitucional({
      perfil: { ...perfilBase, orgao: "Assembleia de Freguesia" },
      sessao: { id: "sessao-1", orgao: "Câmara Municipal de Porches" },
      tipoDocumental: "Recomendação",
    });

    assert.equal(base.valido, false);
  });

  it("mantém inválido conflito Assembleia Municipal + Junta de Freguesia como executivo", () => {
    const base = construirBaseJuridicaInstitucional({
      perfil: { ...perfilBase, orgao: "Assembleia Municipal", territorio: "Lagoa" },
      sessao: { id: "sessao-1", orgao: "Junta de Freguesia de Porches" },
      tipoDocumental: "Recomendação",
    });

    assert.equal(base.valido, false);
  });
});
