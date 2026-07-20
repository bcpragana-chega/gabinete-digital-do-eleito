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
  const hoje = fonte("src/components/dashboard/DashboardPage.tsx");
  const todayDecision = fonte("src/lib/today-decision.ts");
  const definicoes = fonte("src/routes/_app.definicoes.tsx");
  const workspacePage = fonte("src/components/ui/workspace/WorkspacePage.tsx");
  const intake = fonte("src/components/documentos/InstitutionalDocumentIntake.tsx");

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
  });

  it("páginas principais partilham o mesmo contentor exterior", () => {
    assert.match(workspacePage, /min-h-\[calc\(100vh-4rem\)\] bg-background/);
    assert.match(workspacePage, /mx-auto flex w-full max-w-\[1440px\]/);
    assert.match(workspacePage, /px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6/);

    for (const pagina of [hoje, assuntos, sessoes, biblioteca]) {
      assert.match(pagina, /<WorkspacePage>/);
      assert.doesNotMatch(pagina, /bg-\[#fbfcfe\]|bg-transparent|max-w-7xl|max-w-\[1504px\]/);
    }
  });

  it("destaca a próxima ação e usa linguagem orientada à ação", () => {
    const dashboard = entre(hoje, "<WorkspacePage>", "</WorkspacePage>");
    assert.ok(dashboard.indexOf("<PrimaryActionCard") < dashboard.indexOf("<AlertsSection"));
    assert.match(dashboard, /<PendingSection/);
    assert.match(todayDecision, /Rever documento/);
    assert.doesNotMatch(hoje, /Incoerência detetada/);

    assert.match(biblioteca, /triggerLabel="Adicionar e analisar PDF"/);
    assert.match(biblioteca, /Ainda não está ligado a um assunto ou sessão/);
    assert.match(biblioteca, /estado === "Por rever" \? "Rever documento"/);
    assert.doesNotMatch(biblioteca, /Compreender PDF|Sem ligação institucional/);

    assert.match(intake, /Analisar documento/);
    assert.match(intake, /Adicionar e analisar/);
    assert.match(intake, /A Sessão só será preparada depois da sua confirmação/);
    assert.doesNotMatch(intake, />Compreender<|Adicionar e compreender|A compreender o documento/);
  });

  it("sidebar desktop contém a navegação completa e grupos recolhíveis", () => {
    assert.match(sidebar, /sidebarItems\.map/);
    assert.match(sidebar, /sidebarSections\.map/);
    assert.match(sidebar, /toggleSection/);
    assert.match(sidebar, /aria-expanded=\{expanded\}/);
    assert.match(sidebar, /TRIBUNO/);
    assert.match(sidebar, /Criação rápida/);
    assert.match(sidebar, /UserAvatar/);
    assert.match(sidebar, /LogoutConfirmDialog/);
    assert.match(sidebar, /border-t[\s\S]*HelpAssistantPanel/);
    assert.doesNotMatch(sidebarConfig, /Ajuda|HelpAssistantPanel/);

    for (const label of [
      "Hoje",
      "Assuntos",
      "Sessões",
      "Biblioteca",
      "Agenda",
      "Favoritos",
      "Workspace",
      "Definições",
      "Perfil institucional",
      "Integrações",
      "Lixeira",
    ]) {
      assert.match(sidebarConfig, new RegExp(label));
    }
  });

  it("menu móvel expõe a navegação completa sem duplicar o logout", () => {
    const menuMovel = entre(topBar, "<SheetContent", "</SheetContent>");
    assert.match(menuMovel, /sidebarItems\.map/);
    assert.match(menuMovel, /sidebarSections\.map/);
    assert.match(menuMovel, /section\.label/);
    assert.doesNotMatch(menuMovel, /Terminar sessão|LogoutConfirmDialog/);
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
