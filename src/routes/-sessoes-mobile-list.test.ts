import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const list = read("./_app.sessoes.index.tsx");
const detail = read("./_app.sessoes.$id.tsx");
const store = read("../lib/assembleias-store.ts");
const appLayout = read("./_app.tsx");
const mobileMenu = read("../components/layout/MobileSecondaryMenu.tsx");

describe("lista mobile de Sessões", () => {
  it("mantém a abertura canónica da mesma Sessão em toda a linha", () => {
    assert.match(list, /to="\/sessoes\/\$id"/);
    assert.match(list, /params=\{\{ id: assembleia\.id \}\}/);
    assert.match(list, /aria-label=\{`Abrir sessão: \$\{assembleia\.nome\}`\}/);
    assert.match(detail, /createFileRoute\("\/_app\/sessoes\/\$id"\)/);
  });

  it("preserva estados, filtros e ordenação existentes", () => {
    for (const estado of ["preparacao", "analise", "concluida", "arquivada"]) {
      assert.match(list, new RegExp(`estado === "${estado}"`));
    }
    for (const filtro of ["todas", "preparacao", "analise", "concluida"]) {
      assert.match(list, new RegExp(`id: "${filtro}"`));
    }
    assert.match(list, /return assembleia\.estado === \(filtroAtivo as EstadoAssembleia\)/);
    assert.match(store, /const dataA = `\$\{a\.data\}T\$\{a\.hora \|\| "00:00"\}`/);
    assert.match(store, /return dataB\.localeCompare\(dataA\)/);
    assert.doesNotMatch(list, /\.sort\(/);
  });

  it("baseia preparação e próxima ação apenas nos campos e regra já existentes", () => {
    assert.match(list, /assembleia\.preparacaoEstado === "pronta"/);
    assert.match(list, /assembleia\.preparacaoEstado === "em_preparacao"/);
    assert.match(list, /const passada = sessaoJaPassou\(assembleia\.data\)/);
    assert.match(list, /const acaoPrincipal = passada \? "Editar" : "Preparar"/);
    assert.match(list, /obterPontosDaAssembleia\(assembleia\.id\)\.length/);
    assert.match(list, /listarDocumentosLocais\(assembleia\.id\)\.length/);
  });

  it("torna data, estado, identidade e preparação percorríveis em três linhas compactas", () => {
    assert.match(list, /data-sessao-mobile/);
    assert.match(list, /formatarDataSessaoMobile\(assembleia\.data, assembleia\.hora\)/);
    assert.match(list, /estadoLabel\(assembleia\.estado\)/);
    assert.match(list, /\{assembleia\.nome\}/);
    assert.match(list, /assembleia\.orgao\?\.trim\(\) \|\| assembleia\.local\?\.trim\(\)/);
    assert.match(list, /\{preparacaoLabel\}/);
    assert.match(list, /\{pontos\} \{pontos === 1 \? "ponto" : "pontos"\}/);
    assert.match(list, /min-h-14[\s\S]*px-3 py-2/);
  });

  it("dá prioridade apenas visual às Sessões não passadas", () => {
    assert.match(list, /passada \? "max-md:bg-muted\/10" : "max-md:bg-primary\/\[0\.025\]"/);
    assert.match(list, /passada \? "text-muted-foreground" : "text-foreground"/);
  });

  it("mantém criação, ações da linha e estado vazio acessíveis", () => {
    assert.ok((list.match(/<NovaAssembleiaDialog \/>/g) ?? []).length >= 2);
    assert.match(list, /action=\{<NovaAssembleiaDialog \/>\}/);
    assert.match(list, /Ainda não existem Sessões nesta vista/);
    assert.match(list, /\{acaoPrincipal\}/);
    assert.match(list, /<ArrowRight/);
  });

  it("usa filtro compacto, mantém pesquisa global e impede scroll horizontal", () => {
    assert.match(list, /aria-label="Filtrar sessões"/);
    assert.match(list, /md:hidden/);
    assert.match(list, /contentClassName="overflow-x-hidden"/);
    assert.match(list, /data-sessoes-list/);
    assert.doesNotMatch(list, /overflow-x-auto|overflow-x-scroll/);
    assert.match(appLayout, /<GlobalSearchProvider>/);
    assert.match(mobileMenu, /<GlobalSearchTrigger variant="mobile" onOpen=\{closeMenu\} \/>/);
  });

  it("protege títulos extensos, Sessões sem data e a composição entre 320 e 430 px", () => {
    assert.match(list, /dateTime=\{assembleia\.data \|\| undefined\}/);
    assert.match(list, /min-w-0 flex-1 truncate/);
    assert.match(list, /max-w-\[38%\] shrink truncate/);
    assert.match(list, /min-w-0 overflow-hidden/);
    assert.doesNotMatch(list, /min-w-\[(?:320|375|390|430)px\]/);
  });

  it("preserva tabela, colunas e controlos desktop a partir de 768 px", () => {
    for (const coluna of ["Sessão", "Data", "Estado", "Pontos", "Ação"]) {
      assert.match(list, new RegExp(`<span>${coluna}</span>`));
    }
    assert.match(list, /hidden min-w-0 flex-1 items-center gap-0\.5 md:flex/);
    assert.match(list, /hidden min-h-8[\s\S]*md:grid/);
    assert.match(list, /md:grid-cols-\[minmax\(12rem,2fr\)/);
    assert.match(list, /formatarData\(assembleia\.data\)/);
    assert.match(list, /documentos > 0 \? ` · \$\{documentos\} doc\.` : ""/);
  });
});
