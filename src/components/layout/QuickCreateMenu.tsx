import { Link } from "@tanstack/react-router";
import { Landmark, NotebookText, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const secondaryQuickCreateItems = [
  {
    to: "/sessoes" as const,
    label: "Preparar sessão",
    icon: Landmark,
  },
] as const;

type QuickCreateMenuProps = {
  variant: "desktop" | "mobile";
  onNewSubject: () => void;
  onSecondarySelect?: () => void;
};

export function QuickCreateMenu({
  variant,
  onNewSubject,
  onSecondarySelect,
}: QuickCreateMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-center gap-1.5 border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25",
            variant === "desktop"
              ? "h-8 shrink-0 rounded-md border-sidebar-border/80 bg-card/55 px-2 text-[12px] font-medium text-sidebar-muted hover:bg-sidebar-accent/55 hover:text-sidebar-foreground"
              : "mb-3 min-h-11 w-full rounded-lg border-border/70 bg-card px-3.5 text-sm font-medium text-foreground hover:bg-muted/70",
          )}
          aria-label={variant === "mobile" ? "Criar novo" : "Novo"}
        >
          <Plus className="h-3.5 w-3.5 shrink-0" />
          <span>{variant === "mobile" ? "Criar novo" : "Novo"}</span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Novo</DropdownMenuLabel>
        <DropdownMenuItem
          onSelect={onNewSubject}
          className="min-h-11 bg-primary/10 font-semibold text-primary focus:bg-primary/15 focus:text-primary"
        >
          <NotebookText />
          Novo Assunto
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
          Mais opções
        </DropdownMenuLabel>
        {secondaryQuickCreateItems.map((item) => {
          const Icon = item.icon;

          return (
            <DropdownMenuItem key={item.to} asChild onSelect={onSecondarySelect}>
              <Link to={item.to}>
                <Icon />
                {item.label}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
