import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

function fonte(caminho: string) {
  return readFileSync(resolve(process.cwd(), caminho), "utf8");
}

describe("composição responsiva do WorkspaceHeader", () => {
  const header = fonte("src/components/ui/workspace/WorkspaceHeader.tsx");
  const documento = fonte("src/routes/_app.documentos.$documentoId.tsx");

  it("mantém informação e ações em linhas próprias até haver largura confortável", () => {
    assert.match(header, /flex flex-col items-stretch[^"]*2xl:flex-row/);
    assert.doesNotMatch(header, /sm:flex-row sm:flex-wrap/);
    assert.match(header, /flex w-full min-w-0 items-start[^"]*2xl:flex-1/);
    assert.match(
      header,
      /w-full min-w-0 max-w-full 2xl:w-auto 2xl:max-w-\[60%\] 2xl:shrink-0/,
    );
  });

  it("permite que as ações do documento ocupem a largura móvel e quebrem em desktop", () => {
    assert.match(
      documento,
      /flex w-full flex-col flex-wrap items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center/,
    );
  });

  it("é usado pelos cinco workspaces cobertos pela regressão", () => {
    const consumidores = [
      "src/routes/_app.assuntos.$dossieId.index.tsx",
      "src/routes/_app.documentos.$documentoId.tsx",
      "src/routes/_app.sessoes.$id.tsx",
      "src/routes/_app.sessoes.$id.preparacao.pontos.$pontoId.tsx",
      "src/routes/_app.caixa-de-entrada.tsx",
    ];

    for (const consumidor of consumidores) {
      assert.match(fonte(consumidor), /<WorkspaceHeader/);
    }
  });
});
