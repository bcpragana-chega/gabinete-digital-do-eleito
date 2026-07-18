import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const source = readFileSync(new URL("./TopBar.tsx", import.meta.url), "utf8");

describe("saudação do TopBar", () => {
  it("não apresenta o fallback Utilizador antes da autenticação inicializar", () => {
    assert.match(source, /const \{ user, perfil, displayName, initialized \} = useAuth\(\)/);
    assert.match(source, /\{initialized \? \(/);

    const inicioCondicao = source.indexOf("{initialized ? (");
    const inicioSkeleton = source.indexOf('aria-label="A carregar saudação"');
    const fallback = source.indexOf('nome || "Utilizador"');

    assert.ok(inicioCondicao >= 0);
    assert.ok(inicioSkeleton > inicioCondicao);
    assert.ok(fallback > inicioSkeleton);
  });

  it("mantém Utilizador como fallback real depois da inicialização", () => {
    assert.match(source, /return primeiroNome\(nome \|\| "Utilizador"\)/);
    assert.match(source, /\{saudacaoPorHora\(\)\}, \{greetingName\}/);
  });
});
