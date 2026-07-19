import { BookOpen, CalendarDays, Home, Landmark, NotebookText } from "lucide-react";
import { cn } from "@/lib/utils";

export const sidebarItems = [
  { to: "/" as const, label: "Hoje", icon: Home, exact: true },
  { to: "/assuntos" as const, label: "Assuntos", icon: NotebookText, exact: false },
  { to: "/sessoes" as const, label: "Sessões", icon: Landmark, exact: false },
  {
    to: "/biblioteca" as const,
    label: "Biblioteca",
    icon: BookOpen,
    exact: false,
    aliases: ["/caixa-de-entrada"],
  },
  { to: "/agenda" as const, label: "Agenda", icon: CalendarDays, exact: false },
];

export type SidebarItem = (typeof sidebarItems)[number];
export type SidebarItemVariant = "desktop" | "mobile";

export function sidebarItemClassName(active: boolean, variant: SidebarItemVariant = "desktop") {
  return cn(
    "group relative flex w-full cursor-pointer items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20",
    variant === "desktop"
      ? "rounded-xl px-3 py-2.5 text-sm transition-colors"
      : "min-h-11 rounded-2xl px-3.5 py-3 text-[15px] transition-all",
    active
      ? variant === "desktop"
        ? "bg-muted/70 font-medium text-foreground before:absolute before:left-0 before:top-1/2 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-foreground/70"
        : "bg-muted font-medium text-foreground"
      : variant === "desktop"
        ? "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
  );
}

function normalizarPath(path: string) {
  if (path === "/") return path;
  return path.replace(/\/+$/, "");
}

function pathAtivo(pathname: string, path: string, exact?: boolean) {
  const atual = normalizarPath(pathname);
  const alvo = normalizarPath(path);

  if (exact) return atual === alvo;
  return atual === alvo || atual.startsWith(`${alvo}/`);
}

export function isSidebarItemActive(pathname: string, item: SidebarItem) {
  const activeMain = pathAtivo(pathname, item.to, item.exact);
  const activeAlias =
    "aliases" in item && item.aliases?.some((alias) => pathAtivo(pathname, alias, false));

  return Boolean(activeMain || activeAlias);
}
