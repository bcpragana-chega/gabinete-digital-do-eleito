import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

function fonte(caminho: string) {
  return readFileSync(resolve(process.cwd(), caminho), "utf8");
}

function entre(source: string, inicio: string, fim: string) {
  const start = source.indexOf(inicio);
  const end = source.indexOf(fim, start);
  assert.ok(start >= 0 && end > start, `Não foi possível encontrar ${inicio}…${fim}`);
  return source.slice(start, end + fim.length);
}

describe("cabeçalhos canónicos e navegação", () => {
  const topBar = fonte("src/components/layout/TopBar.tsx");
  const sidebar = fonte("src/components/layout/AppSidebar.tsx");
  const sidebarConfig = fonte("src/components/layout/sidebar-config.ts");
  const assuntos = fonte("src/routes/_app.assuntos.index.tsx");
  const sessoes = fonte("src/routes/_app.sessoes.index.tsx");
  const biblioteca = fonte("src/routes/_app.biblioteca.tsx");
  const agenda = fonte("src/routes/_app.agenda.tsx");
  const hoje = fonte("src/components/dashboard/DashboardPage.tsx");
  const definicoes = fonte("src/routes/_app.definicoes.tsx");

  it("TopBar aceita ações e coloca-as numa segunda linha em mobile", () => {
    assert.match(topBar, /actions\?: ReactNode/);
    assert.match(topBar, /order-3 w-full md:order-2 md:w-auto md:shrink-0/);
    assert.match(topBar, /order-2 ml-auto[\s\S]*md:order-3 md:ml-0/);
  });

  it("páginas principais não repetem o cabeçalho canónico", () => {
    assert.match(hoje, /<TopBar \/>/);
    assert.doesNotMatch(hoje, /<h1/);

    assert.match(assuntos, /<TopBar[\s\S]*actions=\{<NovoDossieDialog \/>\}/);
    assert.doesNotMatch(assuntos, /<h1/);

    assert.match(sessoes, /<TopBar breadcrumb="Sessões" actions=\{<NovaAssembleiaDialog \/>\}/);
    assert.doesNotMatch(sessoes, /<h1/);

    assert.match(biblioteca, /<TopBar[\s\S]*actions=\{/);
    assert.doesNotMatch(biblioteca, /WorkspaceHeader/);

    assert.match(agenda, /<TopBar breadcrumb="Agenda" \/>/);
    assert.doesNotMatch(agenda, /WorkspaceHeader/);
  });

  it("sidebar desktop contém apenas a navegação principal", () => {
    assert.doesNotMatch(sidebarConfig, /sidebarFooterItems|\/definicoes|Settings/);
    assert.doesNotMatch(sidebar, /Definições|Terminar sessão|LogoutConfirmDialog|LogOut/);
    assert.match(sidebar, /sidebarItems\.map/);
  });

  it("menu móvel não repete definições nem logout", () => {
    const menuMovel = entre(topBar, "<SheetContent", "</SheetContent>");
    assert.doesNotMatch(menuMovel, /Definições|Terminar sessão|LogoutConfirmDialog/);
    assert.match(menuMovel, /sidebarItems\.map/);
  });

  it("menu do avatar mantém perfil, logout e acesso direto a definições", () => {
    const menuAvatar = entre(topBar, "<DropdownMenu>", "</DropdownMenu>");
    assert.match(menuAvatar, /to="\/definicoes"/);
    assert.match(menuAvatar, /Definições e perfil/);
    assert.match(menuAvatar, /LogoutConfirmDialog/);
    assert.match(menuAvatar, /Terminar sessão/);
    assert.match(definicoes, /createFileRoute\("\/_app\/definicoes"\)/);
  });
});
