import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { sidebarItems } from "./sidebar-config";
import {
  getActiveMobileDestination,
  getMobileBackDestination,
  MOBILE_BREAKPOINT,
} from "./mobile-navigation";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const bottomNavigation = read("./MobileBottomNavigation.tsx");
const mobileMenu = read("./MobileSecondaryMenu.tsx");
const topBar = read("./TopBar.tsx");
const appLayout = read("../../routes/_app.tsx");
const sidebar = read("./AppSidebar.tsx");
const mobileHook = read("../../hooks/use-mobile.tsx");

describe("fundação da experiência mobile", () => {
  it("define um único breakpoint de 768 px para shell, sidebar e TopBar", () => {
    assert.equal(MOBILE_BREAKPOINT, 768);
    assert.match(mobileHook, /import \{ MOBILE_BREAKPOINT \}/);
    assert.match(bottomNavigation, /md:hidden/);
    assert.match(sidebar, /hidden[\s\S]*md:flex/);
    assert.match(topBar, /md:hidden/);
  });

  it("apresenta exatamente os quatro destinos canónicos com ícone e label", () => {
    assert.deepEqual(
      sidebarItems.map(({ to, label }) => ({ to, label })),
      [
        { to: "/", label: "Hoje" },
        { to: "/assuntos", label: "Assuntos" },
        { to: "/sessoes", label: "Sessões" },
        { to: "/biblioteca", label: "Biblioteca" },
      ],
    );
    assert.match(bottomNavigation, /sidebarItems\.map/);
    assert.match(bottomNavigation, /<Icon[\s\S]*item\.label/);
    assert.match(bottomNavigation, /aria-current=\{active \? "page" : undefined\}/);
    assert.match(bottomNavigation, /grid-cols-4/);
  });

  it("mantém a área principal ativa nos índices e detalhes", () => {
    assert.equal(getActiveMobileDestination("/", ""), "/");
    assert.equal(getActiveMobileDestination("/assuntos/assunto-1", ""), "/assuntos");
    assert.equal(getActiveMobileDestination("/sessoes/sessao-1/preparacao", ""), "/sessoes");
    assert.equal(getActiveMobileDestination("/documentos/doc-1", ""), "/biblioteca");
    assert.equal(
      getActiveMobileDestination("/documentos/doc-1", "?origem=assunto&assuntoId=assunto-1"),
      "/assuntos",
    );
    assert.equal(
      getActiveMobileDestination("/documentos/doc-1", "?origem=sessao&sessaoId=sessao-1"),
      "/sessoes",
    );
    assert.equal(
      getActiveMobileDestination(
        "/documentos/doc-1",
        "?origem=assunto&assuntoId=assunto-1&sessaoId=sessao-1",
      ),
      "/biblioteca",
    );
  });

  it("oferece regresso contextual apenas quando existe um pai útil", () => {
    assert.equal(getMobileBackDestination("/assuntos/assunto-1"), "/assuntos");
    assert.equal(getMobileBackDestination("/sessoes/sessao-1/preparacao"), "/sessoes/sessao-1");
    assert.equal(
      getMobileBackDestination("/documentos/doc-1", "?origem=sessao&sessaoId=sessao-1"),
      "/sessoes/sessao-1",
    );
    assert.equal(getMobileBackDestination("/assuntos"), undefined);
  });

  it("reserva espaço e safe-area para a barra persistente sem alterar o desktop", () => {
    assert.match(appLayout, /pb-\[calc\(4rem\+env\(safe-area-inset-bottom\)\)\]/);
    assert.match(appLayout, /md:ml-56 md:p-2 md:pl-0/);
    assert.match(appLayout, /<AppSidebar \/>/);
    assert.match(appLayout, /<MobileBottomNavigation \/>/);
    assert.match(bottomNavigation, /fixed inset-x-0 bottom-0/);
    assert.match(bottomNavigation, /pb-\[env\(safe-area-inset-bottom\)\]/);
    assert.match(bottomNavigation, /min-h-11/);
  });

  it("simplifica a TopBar móvel e mantém utilitários completos no desktop", () => {
    assert.match(topBar, /getMobileBackDestination/);
    assert.match(topBar, /aria-label="Voltar"/);
    assert.match(topBar, /aria-label="Abrir menu"/);
    assert.match(topBar, /hidden[\s\S]*md:block/);
    assert.match(topBar, /hidden min-w-0 shrink-0 items-center gap-2 md:flex/);
    assert.match(topBar, /GlobalSearchTrigger variant="topbar"/);
    assert.match(topBar, /UserAvatar/);
    assert.match(topBar, /aria-label="Mais ações"/);
    assert.doesNotMatch(topBar, /order-3 w-full/);
  });

  it("preserva pesquisa, criação, definições, ajuda e logout no menu secundário", () => {
    for (const contract of [
      /GlobalSearchTrigger/,
      /QuickCreateMenu/,
      /Definições e perfil/,
      /HelpAssistantPanel/,
      /LogoutConfirmDialog/,
      /Terminar sessão/,
    ]) {
      assert.match(mobileMenu, contract);
    }
    assert.doesNotMatch(mobileMenu, /sidebarItems|Hoje|Assuntos|Sessões|Biblioteca/);
    assert.match(mobileMenu, /w-\[88vw\] max-w-sm/);
  });
});
