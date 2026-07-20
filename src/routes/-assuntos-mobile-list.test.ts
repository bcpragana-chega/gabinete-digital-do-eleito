import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const list = read("./_app.assuntos.index.tsx");
const detailLayout = read("./_app.assuntos.$dossieId.tsx");
const detail = read("./_app.assuntos.$dossieId.index.tsx");
const appLayout = read("./_app.tsx");
const mobileMenu = read("../components/layout/MobileSecondaryMenu.tsx");

describe("lista mobile de Assuntos", () => {
  it("mantém a abertura canónica do mesmo detalhe", () => {
    assert.match(list, /to="\/assuntos\/\$dossieId"/);
    assert.match(list, /params=\{\{ dossieId: dossie\.id \}\}/);
    assert.match(list, /aria-label=\{`Abrir assunto: \$\{dossie\.titulo\}`\}/);
    assert.match(detailLayout, /<Outlet \/>/);
    assert.match(detail, /createFileRoute\("\/_app\/assuntos\/\$dossieId\/"\)/);
  });

  it("preserva integralmente filtros e ordenações existentes", () => {
    for (const filter of ["todos", "ativo", "em acompanhamento", "concluido", "arquivados"]) {
      assert.match(list, new RegExp(`id: "${filter}"`));
    }
    for (const order of ["recentes", "antigos", "titulo", "prioridade"]) {
      assert.match(list, new RegExp(`id: "${order}"`));
    }
    assert.match(list, /if \(filtroAtivo === "arquivados"\)/);
    assert.match(list, /return dossie\.estado === filtroAtivo/);
    assert.match(list, /return ordenarDossies\(filtrados, ordenacao\)/);
    assert.match(list, /setFiltroAtivo\(value as FiltroId\)/);
    assert.match(list, /setOrdenacao\(value as OrdenacaoId\)/);
  });

  it("mantém a pesquisa global acessível no shell mobile", () => {
    assert.match(appLayout, /<GlobalSearchProvider>/);
    assert.match(mobileMenu, /<GlobalSearchTrigger variant="mobile" onOpen=\{closeMenu\} \/>/);
  });

  it("compõe cada assunto em apenas duas linhas compactas no mobile", () => {
    assert.match(list, /min-h-12 items-center gap-y-0\.5 px-3 py-1\.5/);
    assert.match(list, /data-assuntos-list/);
    assert.match(list, /<h2[\s\S]*\{dossie\.titulo\}[\s\S]*<StatusBadge/);
    assert.match(list, /col-span-2 flex min-w-0 items-center[\s\S]*md:hidden/);
    assert.match(list, /formatarAtualizacaoMobile\(dossie\)/);
    assert.match(list, /proximaAcao !== "Sem ação definida"/);
  });

  it("mostra prioridade discreta, estado e atualização sem alterar as regras", () => {
    assert.match(list, /tone=\{prioridadeTone\(dossie\.prioridade\)\}/);
    assert.match(list, /dossie\.prioridade === "Crítica" \|\| dossie\.prioridade === "Alta"/);
    assert.match(list, /arquivado \? "Arquivado" : estadoLabel\(dossie\.estado\)/);
    assert.match(list, /dateTime=\{dataAtualizacao\(dossie\)\}/);
    assert.match(list, /if \(estado === "ativo"\) return "Ativo"/);
    assert.match(list, /if \(estado === "em acompanhamento"\)/);
    assert.match(list, /return "Concluído"/);
  });

  it("usa filtros compactos e não cria scroll horizontal", () => {
    assert.match(list, /className="flex w-full min-w-0 items-center gap-2 md:hidden"/);
    assert.match(list, /aria-label="Filtrar assuntos"/);
    assert.match(list, /aria-label="Ordenar assuntos"/);
    assert.match(list, /contentClassName="overflow-x-hidden"/);
    assert.doesNotMatch(list, /overflow-x-auto|overflow-x-scroll/);
  });

  it("preserva a tabela e os controlos desktop a partir de 768 px", () => {
    assert.match(list, /hidden min-w-0 flex-1 items-center gap-0\.5 md:flex/);
    assert.match(list, /ml-auto hidden shrink-0 md:block/);
    assert.match(list, /hidden min-h-8[\s\S]*md:grid/);
    assert.match(list, /md:grid-cols-\[minmax\(12rem,2fr\)/);
    assert.match(list, /hidden h-5 max-w-40[\s\S]*md:inline-flex/);
    assert.match(list, /hidden min-w-0 items-center gap-1\.5 md:flex/);
    assert.match(list, /hidden truncate text-xs[\s\S]*lg:block/);
  });
});
