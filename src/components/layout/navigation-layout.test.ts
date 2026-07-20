import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import {
  isSidebarItemActive,
  settingsSidebarItems,
  sidebarItems,
  sidebarSections,
} from "./sidebar-config";

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
  const mobileMenu = fonte("src/components/layout/MobileSecondaryMenu.tsx");
  const sidebar = fonte("src/components/layout/AppSidebar.tsx");
  const appLayout = fonte("src/routes/_app.tsx");
  const searchProvider = fonte("src/components/search/GlobalSearchProvider.tsx");
  const searchTrigger = fonte("src/components/search/GlobalSearchTrigger.tsx");
  const universalSearch = fonte("src/components/search/UniversalSearch.tsx");
  const quickCreate = fonte("src/components/layout/QuickCreateMenu.tsx");
  const novoAssunto = fonte("src/components/dossies/NovoAssuntoWizard.tsx");
  const sidebarConfig = fonte("src/components/layout/sidebar-config.ts");
  const assuntos = fonte("src/routes/_app.assuntos.index.tsx");
  const sessoes = fonte("src/routes/_app.sessoes.index.tsx");
  const biblioteca = fonte("src/routes/_app.biblioteca.tsx");
  const hoje = fonte("src/components/dashboard/DashboardPage.tsx");
  const todayDecision = fonte("src/lib/today-decision.ts");
  const definicoes = fonte("src/routes/_app.definicoes.tsx");
  const workspacePage = fonte("src/components/ui/workspace/WorkspacePage.tsx");
  const intake = fonte("src/components/documentos/InstitutionalDocumentIntake.tsx");

  it("TopBar preserva ações no desktop e concentra-as num único menu em mobile", () => {
    assert.match(topBar, /actions\?: ReactNode/);
    assert.match(topBar, /hidden shrink-0 md:block/);
    assert.match(topBar, /<MobileContextActions>\{actions\}<\/MobileContextActions>/);
    assert.match(topBar, /aria-label="Mais ações"/);
    assert.doesNotMatch(topBar, /order-3 w-full/);
  });

  it("utilitários visuais podem ser ocultados sem desmontar a pesquisa global", () => {
    assert.match(topBar, /showUtilities = true/);
    assert.match(
      topBar,
      /\{showUtilities && \([\s\S]*<GlobalSearchTrigger variant="topbar" \/>[\s\S]*<UserAvatar/,
    );
    assert.doesNotMatch(topBar, /useEffect/);
    assert.match(hoje, /<TopBar showUtilities=\{false\} \/>/);

    for (const pagina of [assuntos, sessoes, biblioteca]) {
      assert.match(pagina, /<TopBar[\s\S]*showUtilities=\{false\}/);
      assert.doesNotMatch(pagina, /\[&>header>div>div:last-child\]:hidden/);
    }

    assert.match(definicoes, /<TopBar breadcrumb="Definições" \/>/);
    assert.doesNotMatch(definicoes, /showUtilities=\{false\}/);
    assert.match(appLayout, /<GlobalSearchProvider>[\s\S]*<AppSidebar \/>[\s\S]*<Outlet \/>/);
    assert.match(
      searchProvider,
      /<UniversalSearch open=\{open\} onOpenChange=\{setOpen\} showTrigger=\{false\} \/>/,
    );
    assert.match(sidebar, /<GlobalSearchTrigger variant="sidebar" \/>/);
    assert.doesNotMatch(sidebar, /KeyboardEvent|dispatchEvent|abrirPesquisa/);
    assert.match(sidebar, /<UserAvatar/);
    assert.doesNotMatch(hoje, /UniversalSearch|UserAvatar/);
  });

  it("uma única pesquisa global abre por clique, ⌘K e Ctrl+K com foco no input", () => {
    assert.equal((appLayout.match(/<GlobalSearchProvider>/g) ?? []).length, 1);
    assert.equal((searchProvider.match(/<UniversalSearch/g) ?? []).length, 1);
    assert.doesNotMatch(topBar, /<UniversalSearch/);
    assert.doesNotMatch(sidebar, /<UniversalSearch/);

    assert.match(searchTrigger, /const openSearch = useGlobalSearch\(\)/);
    assert.match(searchTrigger, /onClick=\{open\}/);
    assert.match(universalSearch, /\(event\.metaKey \|\| event\.ctrlKey\) && key === "k"/);
    assert.match(universalSearch, /paletteInputRef\.current\?\.focus\(\)/);
    assert.match(universalSearch, /ref=\{paletteInputRef\}/);
    assert.match(universalSearch, /value=\{paletteQuery\}/);
    assert.match(
      universalSearch,
      /onChange=\{\(event\) => setPaletteQuery\(event\.target\.value\)\}/,
    );
    assert.match(universalSearch, /event\.key === "Escape"/);
    assert.match(universalSearch, /<Dialog[\s\S]*onOpenChange/);
  });

  it("desktop e mobile abrem a mesma pesquisa e o menu móvel fecha primeiro", () => {
    assert.match(sidebar, /<GlobalSearchTrigger variant="sidebar" \/>/);
    assert.match(mobileMenu, /<GlobalSearchTrigger variant="mobile" onOpen=\{closeMenu\} \/>/);
    assert.match(topBar, /<GlobalSearchTrigger variant="topbar" \/>/);
    assert.match(searchTrigger, /variant: "sidebar" \| "mobile" \| "topbar"/);
    assert.match(searchTrigger, /min-h-11/);
  });

  it("preserva resultados, ações rápidas e navegação da pesquisa existente", () => {
    assert.match(universalSearch, /pesquisarUniversal\(paletteQuery\)/);
    assert.match(universalSearch, /Ações rápidas/);
    assert.match(universalSearch, /filteredQuickActions\.map/);
    assert.match(universalSearch, /paletteGroups\.map/);
    assert.match(universalSearch, /event\.key === "Enter"/);
    assert.match(universalSearch, /router\.history\.push\(result\.href\)/);
    assert.match(universalSearch, /router\.history\.push\(action\.href\)/);
  });

  it("páginas principais não repetem o cabeçalho canónico", () => {
    assert.match(hoje, /<TopBar showUtilities=\{false\} \/>/);
    assert.doesNotMatch(hoje, /<h1/);

    assert.match(assuntos, /<TopBar[\s\S]*actions=\{<NovoDossieDialog \/>\}/);
    assert.doesNotMatch(assuntos, /<h1/);

    assert.match(sessoes, /title=\{`Sessões \(\$\{assembleiasNaoArquivadas\.length\}\)`\}/);
    assert.match(sessoes, /actions=\{<NovaAssembleiaDialog \/>\}/);
    assert.match(sessoes, /<SessoesList assembleias=\{assembleiasVisiveis\} \/>/);
    assert.doesNotMatch(sessoes, /<h1/);

    assert.match(biblioteca, /<TopBar[\s\S]*actions=\{/);
    assert.match(biblioteca, /title=\{`Biblioteca \(\$\{documentos\.length\}\)`\}/);
    assert.match(biblioteca, /<DocumentosList itens=\{documentosVisiveis\} \/>/);
    assert.doesNotMatch(biblioteca, /WorkspaceHeader/);
  });

  it("páginas principais partilham o mesmo contentor exterior", () => {
    assert.match(workspacePage, /min-h-\[calc\(100vh-4rem\)\] bg-background/);
    assert.match(workspacePage, /mx-auto flex w-full max-w-\[1440px\]/);
    assert.match(workspacePage, /px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6/);

    for (const pagina of [hoje, assuntos, sessoes, biblioteca]) {
      assert.match(pagina, /<WorkspacePage(?:>|\s)/);
      assert.doesNotMatch(pagina, /bg-\[#fbfcfe\]|bg-transparent|max-w-7xl|max-w-\[1504px\]/);
    }
  });

  it("destaca a próxima ação e usa linguagem orientada à ação", () => {
    const dashboard = entre(hoje, "<WorkspacePage", "</WorkspacePage>");
    assert.ok(dashboard.indexOf("<PrimaryActionCard") < dashboard.indexOf("<AlertsSection"));
    assert.match(dashboard, /<PendingSection/);
    assert.match(todayDecision, /Rever documento/);
    assert.doesNotMatch(hoje, /Incoerência detetada/);

    assert.match(biblioteca, /triggerLabel="Adicionar e analisar PDF"/);
    assert.match(biblioteca, /\[assunto, sessao\]\.filter\(Boolean\)\.join\(" · "\)/);
    assert.match(biblioteca, /estado === "Por rever" \? "Rever documento"/);
    assert.doesNotMatch(biblioteca, /Compreender PDF|Sem ligação institucional/);

    assert.match(intake, /Analisar documento/);
    assert.match(intake, /Adicionar e analisar/);
    assert.match(intake, /A Sessão só será preparada depois da sua confirmação/);
    assert.doesNotMatch(intake, />Compreender<|Adicionar e compreender|A compreender o documento/);
  });

  it("sidebar desktop contém apenas a navegação principal e Definições recolhível", () => {
    assert.match(sidebar, /sidebarItems\.map/);
    assert.match(sidebar, /sidebarSections\.map/);
    assert.match(sidebar, /toggleSection/);
    assert.match(sidebar, /aria-expanded=\{expanded\}/);
    assert.match(sidebar, /settings: false/);
    assert.match(sidebar, /expandedSections\[section\.id\] \?\? false/);
    assert.match(sidebar, /TRIBUNO/);
    assert.match(sidebar, /<QuickCreateMenu variant="desktop"/);
    assert.match(sidebar, /UserAvatar/);
    assert.match(sidebar, /LogoutConfirmDialog/);
    assert.match(sidebar, /border-t[\s\S]*HelpAssistantPanel/);
    assert.doesNotMatch(sidebarConfig, /Ajuda|HelpAssistantPanel/);

    assert.deepEqual(
      sidebarItems.map((item) => item.label),
      ["Hoje", "Assuntos", "Sessões", "Biblioteca"],
    );
    assert.doesNotMatch(sidebarConfig, /label: "Agenda"/);

    assert.deepEqual(
      sidebarSections.map((section) => section.label),
      ["Definições"],
    );
    assert.doesNotMatch(
      sidebarConfig,
      /Favoritos|Workspace|Próxima sessão|Assuntos pendentes|Documentos recentes|Painel|Relatórios|Base Jurídica|Modelos/,
    );

    for (const label of ["Definições", "Perfil institucional", "Integrações", "Lixeira"]) {
      assert.match(sidebarConfig, new RegExp(label));
    }
  });

  it("menu móvel contém apenas funções secundárias e não repete os quatro destinos", () => {
    assert.match(mobileMenu, /GlobalSearchTrigger/);
    assert.match(mobileMenu, /QuickCreateMenu/);
    assert.match(mobileMenu, /Definições e perfil/);
    assert.match(mobileMenu, /HelpAssistantPanel/);
    assert.match(mobileMenu, /LogoutConfirmDialog/);
    assert.match(mobileMenu, /Terminar sessão/);
    assert.doesNotMatch(mobileMenu, /sidebarItems|Hoje|Assuntos|Sessões|Biblioteca/);
    assert.doesNotMatch(mobileMenu, /Collapsible|aria-expanded/);
  });

  it("remove o menu dos três pontos sem perder o acesso por Definições", () => {
    assert.doesNotMatch(
      sidebar,
      /Ellipsis|Abrir menu do Tribuno|Abrir definições|Gabinete digital/,
    );
    assert.match(sidebar, /<GlobalSearchTrigger variant="sidebar" \/>/);
    assert.match(sidebar, /<QuickCreateMenu variant="desktop"/);
    assert.match(sidebar, /HelpAssistantPanel/);
    assert.match(sidebar, /aria-label="Abrir menu da conta"/);
    assert.deepEqual(
      settingsSidebarItems.map(({ to, label }) => ({ to, label })),
      [
        { to: "/definicoes", label: "Perfil institucional" },
        { to: "/equipa", label: "Equipa" },
        { to: "/definicoes-gerais", label: "Definições gerais" },
        { to: "/integracoes", label: "Integrações" },
        { to: "/lixeira", label: "Lixeira" },
      ],
    );
  });

  it("+ Novo abre diretamente o fluxo canónico de Novo Assunto", () => {
    const posicaoPrincipal = quickCreate.indexOf("Novo Assunto");
    const posicaoSeparador = quickCreate.indexOf("<DropdownMenuSeparator />");
    const posicaoSecundaria = quickCreate.indexOf("{secondaryQuickCreateItems.map");

    assert.ok(posicaoPrincipal >= 0 && posicaoPrincipal < posicaoSeparador);
    assert.ok(posicaoSeparador < posicaoSecundaria);
    assert.match(quickCreate, /onSelect=\{onNewSubject\}/);
    assert.match(quickCreate, /bg-primary\/10 font-semibold text-primary/);
    assert.match(quickCreate, /Mais opções/);
    assert.match(quickCreate, /to: "\/sessoes" as const/);
    assert.doesNotMatch(quickCreate, /documento|biblioteca/i);

    assert.match(sidebar, /onNewSubject=\{\(\) => setNovoAssuntoAberto\(true\)\}/);
    assert.match(sidebar, /<NovoAssuntoWizard[\s\S]*open=\{novoAssuntoAberto\}/);
    assert.match(novoAssunto, /adicionarDossie/);
    assert.match(novoAssunto, /navigate\(\{ to: "\/assuntos\/\$dossieId"/);
  });

  it("desktop e mobile reutilizam o mesmo menu sem listas divergentes", () => {
    assert.equal((sidebar.match(/<QuickCreateMenu/g) ?? []).length, 1);
    assert.equal((mobileMenu.match(/<QuickCreateMenu/g) ?? []).length, 1);
    assert.match(sidebar, /variant="desktop"/);
    assert.match(mobileMenu, /variant="mobile"/);
    assert.equal((quickCreate.match(/const secondaryQuickCreateItems/g) ?? []).length, 1);
    assert.equal((quickCreate.match(/Preparar sessão/g) ?? []).length, 1);
    assert.doesNotMatch(sidebar, /Preparar sessão|Criar assunto/);
    assert.doesNotMatch(mobileMenu, /Preparar sessão|Criar assunto/);
  });

  it("não duplica destinos entre a navegação principal, Definições e + Novo", () => {
    const destinosPrincipais = sidebarItems.map((item) => item.to);
    const destinosDefinicoes = settingsSidebarItems.map((item) => item.to);
    const conjuntoDefinicoes = new Set<string>(destinosDefinicoes);

    assert.equal(new Set(destinosPrincipais).size, destinosPrincipais.length);
    assert.equal(new Set(destinosDefinicoes).size, destinosDefinicoes.length);
    assert.deepEqual(
      destinosPrincipais.filter((destino) => conjuntoDefinicoes.has(destino)),
      [],
    );
    assert.equal((quickCreate.match(/to: "\/sessoes" as const/g) ?? []).length, 1);
    assert.equal((quickCreate.match(/Novo Assunto/g) ?? []).length, 1);
  });

  it("+ Novo preserva fecho, teclado e área de toque adequada", () => {
    assert.match(quickCreate, /<DropdownMenu>/);
    assert.match(quickCreate, /<DropdownMenuTrigger asChild>/);
    assert.match(quickCreate, /<DropdownMenuContent/);
    assert.match(quickCreate, /<DropdownMenuItem[\s\S]*onSelect=\{onNewSubject\}/);
    assert.doesNotMatch(quickCreate, /preventDefault/);
    assert.match(quickCreate, /focus-visible:ring-2/);
    assert.match(quickCreate, /min-h-11/);
    assert.match(mobileMenu, /closeMenu\(\);[\s\S]*setNewSubjectOpen\(true\)/);
    assert.match(mobileMenu, /onSecondarySelect=\{closeMenu\}/);
  });

  it("mantém Sessões ativa na rota canónica e nas suas subrotas", () => {
    const sessoes = sidebarItems.find((item) => item.to === "/sessoes");
    assert.ok(sessoes);
    assert.equal(isSidebarItemActive("/sessoes", sessoes), true);
    assert.equal(isSidebarItemActive("/sessoes/123/preparacao", sessoes), true);
    assert.equal(isSidebarItemActive("/assuntos", sessoes), false);
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
