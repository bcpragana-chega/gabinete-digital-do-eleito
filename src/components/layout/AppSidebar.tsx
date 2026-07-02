import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Landmark, History, Settings, Scale, NotebookText } from "lucide-react";
import { cn } from "@/lib/utils";

export const sidebarItems = [
  { to: "/" as const, label: "Gabinete", icon: Home, exact: true },
  { to: "/assembleias" as const, label: "Assembleias", icon: Landmark, exact: false },
  { to: "/dossies" as const, label: "Dossiês", icon: NotebookText, exact: false },
  { to: "/historico" as const, label: "Histórico", icon: History, exact: false },
  { to: "/definicoes" as const, label: "Definições", icon: Settings, exact: false },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isActive = (to: string, exact: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 z-30 w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="px-6 py-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-accent">
            <Scale className="h-4 w-4 text-sidebar-accent-foreground" strokeWidth={1.75} />
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
            <div className="text-xs text-sidebar-muted truncate">Vereador · CM Aveiro</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
