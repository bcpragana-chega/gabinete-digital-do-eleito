import { Search, Bell } from "lucide-react";
import type { ReactNode } from "react";

export function TopBar({ breadcrumb }: { breadcrumb?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 bg-background/85 backdrop-blur border-b border-border">
      <div className="flex h-14 items-center justify-between gap-4 px-8">
        <div className="text-sm text-muted-foreground min-w-0 truncate">{breadcrumb}</div>
        <div className="flex items-center gap-2">
          <div className="hidden lg:flex items-center gap-2 rounded-md border border-input bg-card px-3 py-1.5 w-72">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Pesquisar documentos, assembleias…
            </span>
          </div>
          <button
            type="button"
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-card text-muted-foreground hover:text-foreground transition-colors"
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
