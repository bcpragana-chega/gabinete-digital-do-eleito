import { Link, useRouterState } from "@tanstack/react-router";
import { sidebarItems } from "@/components/layout/sidebar-config";
import { getActiveMobileDestination } from "@/components/layout/mobile-navigation";
import { cn } from "@/lib/utils";

export function MobileBottomNavigation() {
  const location = useRouterState({ select: (state) => state.location });
  const activeDestination = getActiveMobileDestination(location.pathname, location.searchStr);

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_-12px_rgba(0,0,0,0.35)] backdrop-blur-lg md:hidden"
    >
      <div className="grid h-16 grid-cols-4">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const active = activeDestination === item.to;

          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-0 h-0.5 w-8 rounded-b-full bg-foreground transition-opacity",
                  active ? "opacity-100" : "opacity-0",
                )}
              />
              <Icon className="h-5 w-5" strokeWidth={active ? 2 : 1.75} aria-hidden="true" />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
