import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, LogOut, Search, UserRound } from "lucide-react";
import { useState } from "react";
import { LogoutConfirmDialog } from "@/components/auth/LogoutConfirmDialog";
import { UserAvatar } from "@/components/auth/UserAvatar";
import { HelpAssistantPanel } from "@/components/help/HelpAssistantPanel";
import { NovoAssuntoWizard } from "@/components/dossies/NovoAssuntoWizard";
import { QuickCreateMenu } from "@/components/layout/QuickCreateMenu";
import {
  isSidebarItemActive,
  sidebarItemClassName,
  sidebarItems,
  sidebarSections,
  type SidebarItem,
} from "@/components/layout/sidebar-config";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth-store";

function abrirPesquisa() {
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
}

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, perfil, displayName } = useAuth();
  const [novoAssuntoAberto, setNovoAssuntoAberto] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    settings: false,
  });

  function toggleSection(sectionId: string) {
    setExpandedSections((current) => ({ ...current, [sectionId]: !current[sectionId] }));
  }

  return (
    <aside className="fixed inset-y-2 left-2 z-30 hidden w-52 flex-col rounded-lg border border-sidebar-border/70 bg-sidebar text-sidebar-foreground md:flex">
      <div className="px-2 pt-2">
        <div className="flex h-9 items-center gap-2 px-1">
          <img src="/logo.png" alt="Tribuno" className="h-6 w-6 rounded object-contain" />
          <span className="min-w-0 flex-1 truncate text-[12px] font-semibold tracking-[0.08em]">
            TRIBUNO
          </span>
        </div>

        <div className="mt-1.5 flex items-center gap-1.5">
          <button
            type="button"
            onClick={abrirPesquisa}
            className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md border border-sidebar-border/80 bg-card/55 px-2 text-[12px] text-sidebar-muted transition-colors hover:bg-sidebar-accent/55 hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
          >
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Pesquisar</span>
            <kbd className="ml-auto text-[9px] opacity-70">⌘K</kbd>
          </button>

          <QuickCreateMenu variant="desktop" onNewSubject={() => setNovoAssuntoAberto(true)} />
        </div>
      </div>

      <NovoAssuntoWizard open={novoAssuntoAberto} onOpenChange={setNovoAssuntoAberto} hideTrigger />

      <nav className="mt-2 min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        <div className="space-y-0.5">
          {sidebarItems.map((item) => (
            <SidebarLink key={item.to} item={item} pathname={pathname} />
          ))}
        </div>

        <div className="mt-3 space-y-2">
          {sidebarSections.map((section) => {
            const expanded = expandedSections[section.id] ?? false;

            return (
              <section key={section.id}>
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className="flex h-7 w-full items-center gap-1.5 rounded px-2 text-[10px] font-medium text-sidebar-muted transition-colors hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
                  aria-expanded={expanded}
                  aria-controls={`sidebar-section-${section.id}`}
                >
                  {expanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  <span>{section.label}</span>
                </button>

                {expanded && (
                  <div id={`sidebar-section-${section.id}`} className="space-y-0.5">
                    {section.items.map((item) => (
                      <SidebarLink
                        key={`${section.id}-${item.to}`}
                        item={item}
                        pathname={pathname}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-sidebar-border/70 p-2">
        <HelpAssistantPanel
          pathname={pathname}
          triggerClassName={sidebarItemClassName(false, "desktop")}
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="mt-1.5 flex w-full items-center gap-2 rounded-md border border-sidebar-border/70 bg-card/45 p-1.5 text-left transition-colors hover:bg-sidebar-accent/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
              aria-label="Abrir menu da conta"
            >
              <UserAvatar user={user} perfil={perfil} className="h-7 w-7 shrink-0" />
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-[12px] font-medium text-sidebar-foreground">
                  {displayName}
                </span>
                <span className="mt-0.5 block truncate text-[10px] text-sidebar-muted">
                  {perfil?.cargo ?? "Perfil institucional"}
                </span>
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-sidebar-muted" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="right" className="w-52">
            <DropdownMenuLabel className="min-w-0">
              <span className="block truncate">{displayName}</span>
              {user?.email && (
                <span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">
                  {user.email}
                </span>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/definicoes">
                <UserRound />
                Perfil institucional
              </Link>
            </DropdownMenuItem>
            <LogoutConfirmDialog
              trigger={
                <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
                  <LogOut />
                  Terminar sessão
                </DropdownMenuItem>
              }
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}

function SidebarLink({ item, pathname }: { item: SidebarItem; pathname: string }) {
  const Icon = item.icon;
  const active = isSidebarItemActive(pathname, item);

  return (
    <Link to={item.to} className={sidebarItemClassName(active, "desktop")}>
      <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" strokeWidth={1.75} />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}
