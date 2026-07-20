import {
  BarChart3,
  BookOpen,
  CalendarClock,
  CalendarDays,
  FileClock,
  Files,
  Home,
  Landmark,
  LayoutDashboard,
  LayoutTemplate,
  NotebookText,
  Plug,
  Scale,
  Settings2,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";
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
] as const;

export const favoriteSidebarItems = [
  {
    to: "/sessoes" as const,
    label: "Próxima sessão",
    icon: CalendarClock,
    exact: false,
    highlight: false,
  },
  {
    to: "/assuntos" as const,
    label: "Assuntos pendentes",
    icon: FileClock,
    exact: false,
    highlight: false,
  },
  {
    to: "/biblioteca" as const,
    label: "Documentos recentes",
    icon: Files,
    exact: false,
    highlight: false,
  },
] as const;

export const workspaceSidebarItems = [
  { to: "/" as const, label: "Painel", icon: LayoutDashboard, exact: true, highlight: false },
  { to: "/relatorios" as const, label: "Relatórios", icon: BarChart3, exact: false },
  { to: "/base-juridica" as const, label: "Base Jurídica", icon: Scale, exact: false },
  { to: "/modelos" as const, label: "Modelos", icon: LayoutTemplate, exact: false },
] as const;

export const settingsSidebarItems = [
  {
    to: "/definicoes" as const,
    label: "Perfil institucional",
    icon: UserRound,
    exact: true,
  },
  { to: "/equipa" as const, label: "Equipa", icon: UsersRound, exact: false },
  {
    to: "/definicoes-gerais" as const,
    label: "Definições gerais",
    icon: Settings2,
    exact: false,
  },
  { to: "/integracoes" as const, label: "Integrações", icon: Plug, exact: false },
  { to: "/lixeira" as const, label: "Lixeira", icon: Trash2, exact: false },
] as const;

export const sidebarSections = [
  { id: "favorites", label: "Favoritos", items: favoriteSidebarItems },
  { id: "workspace", label: "Workspace", items: workspaceSidebarItems },
  { id: "settings", label: "Definições", items: settingsSidebarItems },
] as const;

export type SidebarItem =
  | (typeof sidebarItems)[number]
  | (typeof favoriteSidebarItems)[number]
  | (typeof workspaceSidebarItems)[number]
  | (typeof settingsSidebarItems)[number];
export type SidebarItemVariant = "desktop" | "mobile";

export function sidebarItemClassName(active: boolean, variant: SidebarItemVariant = "desktop") {
  return cn(
    "group relative flex w-full cursor-pointer items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25",
    variant === "desktop"
      ? "min-h-8 rounded-md px-2 py-1 text-[12px] transition-colors"
      : "min-h-11 rounded-lg px-3.5 py-3 text-[15px] transition-colors",
    active
      ? variant === "desktop"
        ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
        : "bg-muted font-medium text-foreground"
      : variant === "desktop"
        ? "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
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
  if ("highlight" in item && item.highlight === false) return false;

  const activeMain = pathAtivo(pathname, item.to, item.exact);
  const activeAlias =
    "aliases" in item && item.aliases?.some((alias) => pathAtivo(pathname, alias, false));

  return Boolean(activeMain || activeAlias);
}
