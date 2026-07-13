import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { it } from "node:test";

it("página da sessão usa assunto_sessoes e não cria relação apenas local", () => {
  const source = readFileSync(new URL("../routes/_app.sessoes.$id.tsx", import.meta.url), "utf8");
  assert.match(source, /associarAssembleiaAoDossie/);
  assert.doesNotMatch(source, /criarRelacaoTribuno/);
});

it("ponto usa a persistência assunto_pontos", () => {
  const source = readFileSync(new URL("assunto-pontos-store.ts", import.meta.url), "utf8");
  assert.match(source, /from\("assunto_pontos"\)/);
  assert.match(source, /ASSUNTO_PONTOS_UPSERT/);
  assert.match(source, /ASSUNTO_PONTOS_DELETE/);
});
