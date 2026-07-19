import { Link, useRouterState } from "@tanstack/react-router";
import {
  isSidebarItemActive,
  sidebarItemClassName,
  sidebarItems,
} from "@/components/layout/sidebar-config";
import { HelpAssistantPanel } from "@/components/help/HelpAssistantPanel";

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border/60 bg-background/95 p-3 text-foreground md:flex">
      <div className="px-2 py-3">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Tribuno" className="h-9 w-9 rounded-xl object-contain" />
          <div className="leading-tight">
            <div className="font-display text-base font-semibold">Tribuno</div>
            <div className="text-xs text-muted-foreground">Gabinete Digital do Eleito</div>
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
            <Link key={item.to} to={item.to} className={sidebarItemClassName(active, "desktop")}>
              <Icon className="h-4 w-4 shrink-0 opacity-90" strokeWidth={1.75} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border/60 pt-3">
        <HelpAssistantPanel
          pathname={pathname}
          triggerClassName={sidebarItemClassName(false, "desktop")}
        />
      </div>
    </aside>
  );
}
