import assert from "node:assert/strict";
import test from "node:test";
import {
  perfilCompleto,
  validarCoerenciaPerfilEleito,
  type PerfilEleito,
} from "@/lib/auth-store";

function perfil(overrides: Partial<PerfilEleito> = {}): PerfilEleito {
  return {
    nomeInstitucional: "Benjamin Pragana",
    cargo: "Membro da Assembleia de Freguesia",
    orgao: "Assembleia de Freguesia",
    organizacao: "Grupo político",
    territorio: "Porches",
    municipio: "Lagoa",
    freguesia: "Porches",
    updatedAt: "2026-07-12T00:00:00.000Z",
    ...overrides,
  };
}

test("valida perfil coerente de assembleia de freguesia", () => {
  const result = validarCoerenciaPerfilEleito(perfil());
  assert.equal(result.valido, true);
  assert.equal(perfilCompleto(perfil()), true);
});

test("bloqueia cargo municipal em órgão de freguesia", () => {
  const result = validarCoerenciaPerfilEleito(
    perfil({ cargo: "Membro da Assembleia Municipal", orgao: "Assembleia de Freguesia" }),
  );
  assert.equal(result.valido, false);
  assert.match(result.valido ? "" : result.erros.join(" "), /Cargo incompatível/);
});

test("bloqueia assembleia de freguesia sem município e freguesia", () => {
  const result = validarCoerenciaPerfilEleito(perfil({ municipio: undefined, freguesia: undefined }));
  assert.equal(result.valido, false);
  assert.match(result.valido ? "" : result.erros.join(" "), /Município obrigatório/);
  assert.match(result.valido ? "" : result.erros.join(" "), /Freguesia obrigatória/);
});

test("bloqueia órgão municipal com freguesia institucional definida", () => {
  const result = validarCoerenciaPerfilEleito(
    perfil({
      cargo: "Membro da Assembleia Municipal",
      orgao: "Assembleia Municipal",
      municipio: "Lagoa",
      freguesia: "Porches",
      territorio: "Lagoa",
    }),
  );
  assert.equal(result.valido, false);
  assert.match(result.valido ? "" : result.erros.join(" "), /não devem ter freguesia/);
});

test("aceita perfil municipal coerente", () => {
  const result = validarCoerenciaPerfilEleito(
    perfil({
      cargo: "Membro da Assembleia Municipal",
      orgao: "Assembleia Municipal",
      municipio: "Lagoa",
      freguesia: undefined,
      territorio: "Lagoa",
    }),
  );
  assert.equal(result.valido, true);
});
