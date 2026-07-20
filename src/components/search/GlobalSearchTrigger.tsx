import { Search } from "lucide-react";
import { useGlobalSearch } from "@/components/search/global-search-context";
import { cn } from "@/lib/utils";

type GlobalSearchTriggerProps = {
  variant: "sidebar" | "mobile" | "topbar";
  onOpen?: () => void;
};

export function GlobalSearchTrigger({ variant, onOpen }: GlobalSearchTriggerProps) {
  const openSearch = useGlobalSearch();

  function open() {
    onOpen?.();
    openSearch();
  }

  if (variant === "topbar") {
    return (
      <>
        <button
          type="button"
          onClick={open}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors duration-150 hover:border-border/70 hover:bg-muted/60 hover:text-foreground lg:hidden"
          aria-label="Abrir pesquisa"
        >
          <Search className="h-4 w-4" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          onClick={open}
          className="hidden h-8 w-64 max-w-64 items-center gap-2 rounded-md border border-border/70 bg-card px-2.5 text-muted-foreground transition-colors duration-150 hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 lg:flex"
          aria-label="Abrir pesquisa"
        >
          <Search className="h-3.5 w-3.5 shrink-0 opacity-70" strokeWidth={1.75} />
          <span className="min-w-0 flex-1 text-left text-xs">Pesquisar...</span>
          <kbd className="flex h-5 shrink-0 items-center rounded-md border border-border/50 bg-background/70 px-1.5 text-[10px] font-medium leading-none text-muted-foreground">
            ⌘K
          </kbd>
        </button>
      </>
    );
  }

  return (
    <button
      type="button"
      onClick={open}
      className={cn(
        "flex items-center gap-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25",
        variant === "sidebar"
          ? "h-8 min-w-0 flex-1 rounded-md border border-sidebar-border/80 bg-card/55 px-2 text-[12px] text-sidebar-muted hover:bg-sidebar-accent/55 hover:text-sidebar-foreground"
          : "mb-2 min-h-11 w-full rounded-lg px-3.5 py-3 text-[15px] text-muted-foreground hover:bg-muted/70 hover:text-foreground",
      )}
      aria-label="Pesquisar"
    >
      <Search className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">Pesquisar</span>
      {variant === "sidebar" && <kbd className="ml-auto text-[9px] opacity-70">⌘K</kbd>}
    </button>
  );
}
