import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { construirDestinoLegado } from "./-legacy-redirect-path";

function fonte(caminho: string) {
  return readFileSync(resolve(process.cwd(), caminho), "utf8");
}

function fontesVisiveis(diretorio: string): string[] {
  return readdirSync(resolve(process.cwd(), diretorio), { withFileTypes: true }).flatMap(
    (entrada) => {
      const caminho = `${diretorio}/${entrada.name}`;
      if (entrada.isDirectory()) return fontesVisiveis(caminho);
      if (!entrada.name.endsWith(".tsx") || entrada.name.endsWith(".test.tsx")) return [];
      return [fonte(caminho)];
    },
  );
}

describe("conceitos e rotas canónicas", () => {
  const sidebar = fonte("src/components/layout/sidebar-config.ts");
  const caixaEntrada = fonte("src/routes/_app.caixa-de-entrada.tsx");
  const dossies = fonte("src/routes/_app.dossies.index.tsx");
  const dossie = fonte("src/routes/_app.dossies.$dossieId.tsx");
  const assembleias = fonte("src/routes/_app.assembleias.index.tsx");
  const assembleia = fonte("src/routes/_app.assembleias.$id.tsx");
  const preparacaoPonto = fonte("src/routes/_app.assembleias.$id.preparacao.pontos.$pontoId.tsx");

  it("a navegação principal mostra apenas os cinco mundos oficiais", () => {
    const labels = [...sidebar.matchAll(/label: "([^"]+)"/g)].map((match) => match[1]);
    const destinos = [...sidebar.matchAll(/to: "([^"]+)"/g)].map((match) => match[1]);
    assert.deepEqual(labels, ["Hoje", "Assuntos", "Sessões", "Biblioteca", "Agenda"]);
    assert.deepEqual(destinos, ["/", "/assuntos", "/sessoes", "/biblioteca", "/agenda"]);
  });

  it("redireciona as coleções antigas para as rotas canónicas", () => {
    assert.match(dossies, /<LegacyRedirect to="\/assuntos"/);
    assert.match(assembleias, /<LegacyRedirect to="\/sessoes"/);
    assert.match(caixaEntrada, /<LegacyRedirect to="\/biblioteca"/);
    assert.doesNotMatch(caixaEntrada, /useDocumentos|WorkspaceHeader|CaixaDeEntradaPage/);
  });

  it("preserva IDs, parâmetros codificados, query e hash", () => {
    assert.match(dossie, /params=\{\{ dossieId \}\}/);
    assert.match(assembleia, /params=\{\{ id \}\}/);
    assert.match(preparacaoPonto, /params=\{\{ id, pontoId \}\}/);
    assert.equal(
      construirDestinoLegado(
        "/sessoes/$id/preparacao/pontos/$pontoId",
        { id: "sessão 1", pontoId: "ponto/2" },
        "?origem=agenda#notas",
      ),
      "/sessoes/sess%C3%A3o%201/preparacao/pontos/ponto%2F2?origem=agenda#notas",
    );
    assert.equal(
      construirDestinoLegado(
        "/documentos/$docId?origem=sessao&sessaoId=$id",
        { id: "sessão 1", docId: "doc/2" },
        "?filtro=novo&origem=invalida#pagina-2",
      ),
      "/documentos/doc%2F2?origem=sessao&sessaoId=sess%C3%A3o+1&filtro=novo#pagina-2",
    );
  });

  it("mantém as páginas canónicas funcionais e sem implementações paralelas", () => {
    for (const caminho of [
      "src/routes/_app.assuntos.index.tsx",
      "src/routes/_app.assuntos.$dossieId.index.tsx",
      "src/routes/_app.sessoes.index.tsx",
      "src/routes/_app.sessoes.$id.tsx",
      "src/routes/_app.sessoes.$id.preparacao.tsx",
      "src/routes/_app.biblioteca.tsx",
    ]) {
      const source = fonte(caminho);
      assert.match(source, /component:/);
      assert.doesNotMatch(source, /<LegacyRedirect/);
    }
  });

  it("mantém os fluxos Assunto → Documento e Sessão → Preparação nas rotas canónicas", () => {
    assert.match(
      fonte("src/components/dossies/DossieDocumentosCriadosSection.tsx"),
      /to: "\/documentos\/\$documentoId"/,
    );
    assert.match(
      fonte("src/routes/_app.sessoes.$id.tsx"),
      /to="\/sessoes\/\$id\/preparacao\/documentos"/,
    );
  });

  it("não apresenta os conceitos antigos na interface", () => {
    const interfaceVisivel = fontesVisiveis("src/components")
      .concat(fontesVisiveis("src/routes"))
      .join("\n");
    assert.doesNotMatch(interfaceVisivel, /Dossiê|Dossiês|Caixa de Entrada/);
    assert.doesNotMatch(interfaceVisivel, /Documentos a [Cc]riar/);
    assert.doesNotMatch(interfaceVisivel, /esta assembleia|uma assembleia|da assembleia/);
  });
});
