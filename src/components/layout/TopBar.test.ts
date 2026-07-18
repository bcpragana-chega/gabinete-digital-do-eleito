import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const source = readFileSync(new URL("./TopBar.tsx", import.meta.url), "utf8");

describe("saudação do TopBar", () => {
  it("não apresenta o fallback Utilizador antes da autenticação inicializar", () => {
    assert.match(source, /const \{ user, perfil, displayName, initialized \} = useAuth\(\)/);
    assert.match(source, /\{initialized \? \(/);

    const inicioCondicao = source.indexOf("{initialized ? (");
    const inicioPlaceholder = source.indexOf('aria-hidden="true"', inicioCondicao);
    const fimPlaceholder = source.indexOf("</span>", inicioPlaceholder);
    const placeholder = source.slice(inicioPlaceholder, fimPlaceholder);
    const fallback = source.indexOf('nome || "Utilizador"');

    assert.ok(inicioCondicao >= 0);
    assert.ok(inicioPlaceholder > inicioCondicao);
    assert.ok(fallback > inicioPlaceholder);
    assert.match(placeholder, /className="invisible"/);
    assert.match(placeholder, /Boa noite, Benjamin/);
    assert.doesNotMatch(placeholder, /bg-muted|role="status"|A carregar saudação/);
  });

  it("mantém Utilizador como fallback real depois da inicialização", () => {
    assert.match(source, /return primeiroNome\(nome \|\| "Utilizador"\)/);
    assert.match(source, /\{saudacaoPorHora\(\)\}, \{greetingName\}/);
  });
});
