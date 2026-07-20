import { createFileRoute } from "@tanstack/react-router";
import { SidebarPlaceholderPage } from "@/components/layout/SidebarPlaceholderPage";

export const Route = createFileRoute("/_app/relatorios")({
  component: () => <SidebarPlaceholderPage title="Relatórios" />,
});
