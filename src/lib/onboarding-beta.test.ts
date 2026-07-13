import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const wizard = readFileSync(
  new URL("../components/auth/OnboardingInicialWizard.tsx", import.meta.url),
  "utf8",
);
const profile = readFileSync(
  new URL("../components/auth/PerfilEleitoForm.tsx", import.meta.url),
  "utf8",
);
const session = readFileSync(new URL("../routes/_app.sessoes.$id.tsx", import.meta.url), "utf8");

describe("Onboarding Beta P0", () => {
  it("remove os passos manuais antigos", () => {
    assert.doesNotMatch(
      wizard,
      /Assunto inicial|Já sabe quando será a próxima sessão|Criar Assunto/,
    );
    assert.doesNotMatch(wizard, /adicionarDossie|adicionarAssembleia/);
  });

  it("usa o fluxo institucional real", () => {
    assert.match(wizard, /carregarDocumentoParaAnalise\(file\)/);
    assert.match(wizard, /analisarDocumentoCarregado\(/);
    assert.match(wizard, /confirmarAnaliseDocumento\(/);
    assert.match(wizard, /<ReviewForm/);
  });

  it("mantém o perfil avançado fora do modo reduzido", () => {
    assert.match(profile, /!modoOnboarding/);
    assert.match(profile, /Logótipo do grupo político/);
    assert.match(profile, /Será usado automaticamente nos documentos institucionais/);
  });

  it("apresenta o WOW e a primeira ação específicos", () => {
    assert.match(session, /A tua sessão está preparada/);
    assert.match(session, /O Tribuno criou a sessão e organizou a tua preparação/);
    assert.match(session, /Começar preparação/);
    assert.match(session, /setWizardAberto\(true\)/);
  });
});
