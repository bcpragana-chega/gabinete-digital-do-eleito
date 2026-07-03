import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Menu, Scale } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { sidebarFooterItems, sidebarItems } from "@/components/layout/AppSidebar";
import { UniversalSearch } from "@/components/search/UniversalSearch";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function TopBar({ breadcrumb }: { breadcrumb?: ReactNode }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const mobileTitle = typeof breadcrumb === "string" ? breadcrumb : "Tribuno";

  const isActive = (item: (typeof sidebarItems | typeof sidebarFooterItems)[number]) => {
    const activeMain = item.exact
      ? pathname === item.to
      : pathname === item.to || pathname.startsWith(item.to + "/");
    const activeAlias =
      "aliases" in item &&
      item.aliases?.some((alias) => pathname === alias || pathname.startsWith(alias + "/"));

    return activeMain || activeAlias;
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/45 bg-background/90 backdrop-blur-xl">
      <div className="flex h-12 items-center justify-between gap-3 px-4 md:h-14 md:px-6">
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

            <SheetContent side="left" className="w-[88vw] max-w-80 border-border/70 bg-background p-0 text-foreground">
              <SheetHeader className="sr-only">
                <SheetTitle>Menu de navegação</SheetTitle>
              </SheetHeader>

              <div className="flex h-full flex-col">
                <div className="border-b border-border/60 px-5 py-5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-foreground text-background">
                      <Scale
                        className="h-4 w-4"
                        strokeWidth={1.75}
                      />
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
                    const active = isActive(item);

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
                    const active = isActive(item);

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

                <div className="border-t border-border/60 px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted text-sm font-semibold">
                      JM
                    </div>
                    <div className="leading-tight min-w-0">
                      <div className="text-sm font-medium truncate">João Martins</div>
                      <div className="truncate text-xs text-muted-foreground">
                        Vereador · CM Aveiro
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <div className="min-w-0 truncate font-display text-base font-semibold text-foreground md:hidden">
            {mobileTitle}
          </div>

          <div className="hidden min-w-0 truncate text-sm font-medium text-muted-foreground md:block">
            {breadcrumb}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
          <UniversalSearch />

          <button
            type="button"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-transparent text-muted-foreground transition-colors hover:border-border/70 hover:bg-muted/60 hover:text-foreground md:h-9 md:w-9 md:rounded-xl"
            aria-label="Notificações"
          >
            <Bell className="h-4 w-4" strokeWidth={1.75} />
            <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-status-alerta-foreground" />
          </button>
        </div>
      </div>
    </header>
  );
}
