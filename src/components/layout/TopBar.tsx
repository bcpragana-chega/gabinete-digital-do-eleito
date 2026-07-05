import { Link, useRouterState } from "@tanstack/react-router";
import { LogOut, Menu, Scale } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { UserAvatar } from "@/components/auth/UserAvatar";
import {
  isSidebarItemActive,
  sidebarFooterItems,
  sidebarItems,
} from "@/components/layout/sidebar-config";
import { UniversalSearch } from "@/components/search/UniversalSearch";
import { logout, primeiroNome, saudacaoPorHora, useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function TopBar({ breadcrumb: _breadcrumb }: { breadcrumb?: ReactNode }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, perfil, displayName } = useAuth();
  const greetingName = nomeTopBar(displayName, user?.nome, perfil?.nomeInstitucional);

  return (
    <header className="sticky top-0 z-40 border-b border-border/45 bg-background/90 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between gap-3 px-4 md:h-20 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Sheet open={menuAberto} onOpenChange={setMenuAberto}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-card/80 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
                aria-label="Abrir menu"
              >
                <Menu className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </SheetTrigger>

            <SheetContent
              side="left"
              className="w-[88vw] max-w-80 border-border/70 bg-background p-0 text-foreground"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>Menu de navegação</SheetTitle>
              </SheetHeader>

              <div className="flex h-full flex-col">
                <div className="border-b border-border/60 px-5 py-5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-foreground text-background">
                      <Scale className="h-4 w-4" strokeWidth={1.75} />
                    </div>
                    <div className="leading-tight">
                      <div className="font-display text-base font-semibold">Tribuno</div>
                      <div className="text-[11px] uppercase text-muted-foreground">
                        Apoio ao mandato
                      </div>
                    </div>
                  </div>
                </div>

                <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
                  <div className="px-3 pb-2 text-[10.5px] font-medium uppercase text-muted-foreground">
                    Navegação
                  </div>

                  {sidebarItems.map((item) => {
                    const Icon = item.icon;
                    const active = isSidebarItemActive(pathname, item);

                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setMenuAberto(false)}
                        className={cn(
                          "flex min-h-11 items-center gap-3 rounded-2xl px-3.5 py-3 text-[15px] transition-all",
                          active
                            ? "bg-muted text-foreground font-medium"
                            : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0 opacity-90" strokeWidth={1.75} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>

                <div className="border-t border-border/60 px-3 py-3">
                  {sidebarFooterItems.map((item) => {
                    const Icon = item.icon;
                    const active = isSidebarItemActive(pathname, item);

                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setMenuAberto(false)}
                        className={cn(
                          "flex min-h-11 items-center gap-3 rounded-2xl px-3.5 py-3 text-[15px] transition-all",
                          active
                            ? "bg-muted text-foreground font-medium"
                            : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0 opacity-90" strokeWidth={1.75} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <div className="min-w-0 leading-tight">
            <div className="truncate font-display text-xl font-bold leading-6 text-foreground sm:text-2xl lg:text-[1.65rem] lg:leading-8">
              {saudacaoPorHora()}, {greetingName}{" "}
              <span className="inline-block align-baseline text-[0.9em]">👋</span>
            </div>
            <div className="mt-0.5 truncate text-[13px] leading-5 text-muted-foreground sm:text-sm">
              Vamos preparar a próxima sessão.
            </div>
          </div>
        </div>

        <div className="flex min-w-0 shrink-0 items-center gap-1.5 md:gap-2">
          <UniversalSearch />

          <Link
            to="/definicoes"
            className="rounded-full transition-opacity hover:opacity-80"
            aria-label="Abrir perfil"
          >
            <UserAvatar user={user} perfil={perfil} className="h-9 w-9" />
          </Link>

          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-transparent text-muted-foreground transition-colors hover:border-border/70 hover:bg-muted/60 hover:text-foreground md:h-9 md:w-9 md:rounded-xl"
                  aria-label="Terminar sessão"
                >
                  <LogOut className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Terminar sessão</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </header>
  );
}

function nomeTopBar(...nomes: Array<string | undefined>) {
  const nome = nomes
    .map((valor) => valor?.trim())
    .find((valor) => valor && valor.toLocaleLowerCase("pt-PT") !== "eleito");

  return primeiroNome(nome || "Utilizador");
}
