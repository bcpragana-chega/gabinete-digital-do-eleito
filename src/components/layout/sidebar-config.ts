import { BookOpen, CalendarDays, Home, Landmark, NotebookText, Settings } from "lucide-react";

export const sidebarItems = [
  { to: "/" as const, label: "Hoje", icon: Home, exact: true },
  { to: "/dossies" as const, label: "Assuntos", icon: NotebookText, exact: false },
  { to: "/assembleias" as const, label: "Sessões", icon: Landmark, exact: false },
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
