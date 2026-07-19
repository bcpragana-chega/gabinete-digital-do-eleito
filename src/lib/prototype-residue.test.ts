import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

function fonte(caminho: string) {
  return readFileSync(resolve(process.cwd(), caminho), "utf8");
}

function fontesProducao(diretorio: string): string[] {
  return readdirSync(resolve(process.cwd(), diretorio), { withFileTypes: true }).flatMap(
    (entrada) => {
      const caminho = `${diretorio}/${entrada.name}`;
      if (entrada.isDirectory()) return fontesProducao(caminho);
      if (entrada.name.endsWith(".test.ts") || !/\.[cm]?[jt]sx?$/.test(entrada.name)) return [];
      return [fonte(caminho)];
    },
  );
}

describe("identidade técnica do Tribuno", () => {
  it("usa um pacote Tribuno sem dependências de protótipo", () => {
    const pacote = JSON.parse(fonte("package.json")) as {
      name: string;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const dependencias = { ...pacote.dependencies, ...pacote.devDependencies };

    assert.equal(pacote.name, "tribuno");
    assert.equal(
      Object.keys(dependencias).some((nome) => nome.startsWith("@lovable.dev/")),
      false,
    );
  });

  it("mantém o código de produção independente de dados mock e do template", () => {
    const producao = fontesProducao("src").join("\n");

    assert.doesNotMatch(producao, /mock-data|mock-preparacao|lovable/i);
  });

  it("configura Vite e TanStack através dos plugins nativos", () => {
    const config = fonte("vite.config.ts");

    assert.match(config, /@tanstack\/react-start\/plugin\/vite/);
    assert.match(config, /nitro\/vite/);
    assert.doesNotMatch(config, /@lovable\.dev|lovable/i);
  });
});
