import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Menu, Scale } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { sidebarItems } from "@/components/layout/AppSidebar";
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

  const isActive = (to: string, exact: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <header className="sticky top-0 z-40 bg-background/85 backdrop-blur border-b border-border">
      <div className="flex h-14 items-center justify-between gap-4 px-4 md:px-8">
        <div className="flex items-center gap-3 min-w-0">
          <Sheet open={menuAberto} onOpenChange={setMenuAberto}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-card text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                aria-label="Abrir menu"
              >
                <Menu className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </SheetTrigger>

            <SheetContent side="left" className="w-72 max-w-[85vw] p-0 bg-sidebar text-sidebar-foreground border-sidebar-border">
              <SheetHeader className="sr-only">
                <SheetTitle>Menu de navegação</SheetTitle>
              </SheetHeader>

              <div className="flex h-full flex-col">
                <div className="px-5 py-5 border-b border-sidebar-border">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-accent">
                      <Scale
                        className="h-4 w-4 text-sidebar-accent-foreground"
                        strokeWidth={1.75}
                      />
                    </div>
                    <div className="leading-tight">
                      <div className="font-display text-base font-semibold tracking-tight">
                        Tribuno
                      </div>
                      <div className="text-[11px] uppercase tracking-wider text-sidebar-muted">
                        Gabinete digital
                      </div>
                    </div>
                  </div>
                </div>

                <nav className="flex-1 px-3 py-5 space-y-1">
                  <div className="px-3 pb-2 text-[10.5px] font-medium uppercase tracking-wider text-sidebar-muted">
                    Navegação
                  </div>

                  {sidebarItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.to, item.exact);

                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setMenuAberto(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0 opacity-90" strokeWidth={1.75} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>

                <div className="px-4 py-4 border-t border-sidebar-border">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground text-sm font-medium">
                      JM
                    </div>
                    <div className="leading-tight min-w-0">
                      <div className="text-sm font-medium truncate">João Martins</div>
                      <div className="text-xs text-sidebar-muted truncate">
                        Vereador · CM Aveiro
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <div className="text-sm text-muted-foreground min-w-0 truncate">
            {breadcrumb}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <UniversalSearch />

          <button
            type="button"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-card text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
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
