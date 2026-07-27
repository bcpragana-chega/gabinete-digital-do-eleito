import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LOGO_PARTIDARIO_CHEGA,
  LOGO_PARTIDARIO_NEUTRO,
  resolverLogoPartidario,
  resolverMandatoInstitucional,
} from "@/lib/party-branding";

describe("resolução central de identidade partidária", () => {
  it("prioriza o logótipo partidário explicitamente guardado no perfil", () => {
    assert.equal(
      resolverLogoPartidario({
        perfil: {
          logoUrl: "data:image/png;base64,PARTIDO",
          organizacao: "CHEGA",
        },
      }),
      "data:image/png;base64,PARTIDO",
    );
  });

  it("resolve CHEGA através da organização ou grupo político", () => {
    assert.equal(
      resolverLogoPartidario({ perfil: { organizacao: "Chega!" } }),
      LOGO_PARTIDARIO_CHEGA,
    );
    assert.equal(resolverLogoPartidario({ partidoOuGrupo: "CHEGA" }), LOGO_PARTIDARIO_CHEGA);
  });

  it("usa fallback neutro apenas sem identidade partidária resolvida", () => {
    assert.equal(
      resolverLogoPartidario({ perfil: { organizacao: "Lista não configurada" } }),
      LOGO_PARTIDARIO_NEUTRO,
    );
  });

  it("recupera mandato real do perfil ou contexto e nunca o inventa", () => {
    assert.equal(
      resolverMandatoInstitucional({
        perfil: { mandato: "2025–2029" } as never,
      }),
      "2025–2029",
    );
    assert.equal(resolverMandatoInstitucional({ contexto: { mandate: "2021–2025" } }), "2021–2025");
    assert.equal(resolverMandatoInstitucional(), undefined);
  });
});
