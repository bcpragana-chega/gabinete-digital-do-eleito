import { BookOpen, CalendarDays, Home, Landmark, NotebookText, Settings } from "lucide-react";

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

export const sidebarFooterItems = [
  { to: "/definicoes" as const, label: "Definições", icon: Settings, exact: false },
];

export type SidebarItem = (typeof sidebarItems | typeof sidebarFooterItems)[number];

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

  return activeMain || activeAlias;
}
