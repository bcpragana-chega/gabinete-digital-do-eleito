import { Link, useRouterState } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { LogoutConfirmDialog } from "@/components/auth/LogoutConfirmDialog";
import {
  isSidebarItemActive,
  sidebarFooterItems,
  sidebarItems,
} from "@/components/layout/sidebar-config";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border/60 bg-background/95 p-3 text-foreground md:flex">
      <div className="px-2 py-3">
        <div className="flex items-center gap-2.5">
          <img
            src="/logo.png"
            alt="Tribuno"
            className="h-9 w-9 rounded-xl object-contain"
          />
          <div className="leading-tight">
            <div className="font-display text-base font-semibold">Tribuno</div>
            <div className="text-xs text-muted-foreground">Apoio ao mandato</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 py-7">
        <div className="px-3 pb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Navegação
        </div>
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const active = isSidebarItemActive(pathname, item);

          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-muted/70 font-medium text-foreground before:absolute before:left-0 before:top-1/2 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-foreground/70"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-90" strokeWidth={1.75} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <nav className="mb-3 space-y-1 border-t border-border/60 pt-3">
        {sidebarFooterItems.map((item) => {
          const Icon = item.icon;
          const active = isSidebarItemActive(pathname, item);

          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-muted/70 font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-90" strokeWidth={1.75} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <LogoutConfirmDialog
          trigger={
            <button
              type="button"
              className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              <LogOut className="h-4 w-4 shrink-0 opacity-90" strokeWidth={1.75} />
              <span>Terminar sessão</span>
            </button>
          }
        />
      </nav>
    </aside>
  );
}
