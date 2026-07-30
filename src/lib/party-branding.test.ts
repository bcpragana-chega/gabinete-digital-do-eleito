import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LOGO_PARTIDARIO_CHEGA,
  LOGO_PARTIDARIO_NEUTRO,
  isLogoPartidarioPlaceholder,
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

  it("não inventa nem apresenta um placeholder sem identidade partidária resolvida", () => {
    assert.equal(
      resolverLogoPartidario({ perfil: { organizacao: "Lista não configurada" } }),
      undefined,
    );
  });

  it("reconhece os placeholders históricos para nunca os voltar a exportar", () => {
    assert.equal(isLogoPartidarioPlaceholder(LOGO_PARTIDARIO_NEUTRO), true);
    assert.equal(isLogoPartidarioPlaceholder("/logo.png"), true);
    assert.equal(
      isLogoPartidarioPlaceholder(
        "https://tribuno.example/branding/neutral-mark.svg?cache=antiga#cabecalho",
      ),
      true,
    );
    assert.equal(isLogoPartidarioPlaceholder("https://tribuno.example/logo.png?v=1"), true);
    assert.equal(isLogoPartidarioPlaceholder("https://storage.test/logo.png"), true);
    assert.equal(isLogoPartidarioPlaceholder("https://storage.test/logos/user/logo.png"), false);
  });

  it("não aceita um placeholder histórico guardado no perfil", () => {
    assert.equal(
      resolverLogoPartidario({ perfil: { logoUrl: "/logo.png", organizacao: "" } }),
      undefined,
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
