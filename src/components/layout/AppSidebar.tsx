import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Landmark, History, Settings, Scale, NotebookText, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export const sidebarItems = [
  { to: "/" as const, label: "Gabinete", icon: Home, exact: true },
  { to: "/caixa-de-entrada" as const, label: "Caixa de Entrada", icon: Inbox, exact: false },
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
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border/60 bg-background/95 p-3 text-foreground md:flex">
      <div className="px-2 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-background">
            <Scale className="h-4 w-4" strokeWidth={1.75} />
          </div>
          <div className="leading-tight">
            <div className="font-display text-base font-semibold">Tribuno</div>
            <div className="text-xs text-muted-foreground">
              Gabinete digital
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 py-7">
        <div className="px-3 pb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
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

      <div className="rounded-2xl border border-border/70 bg-card/70 p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
            JM
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-semibold">João Martins</div>
            <div className="truncate text-xs text-muted-foreground">Vereador · CM Aveiro</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
