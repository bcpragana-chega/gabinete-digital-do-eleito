import { createFileRoute } from "@tanstack/react-router";
import { SidebarPlaceholderPage } from "@/components/layout/SidebarPlaceholderPage";

export const Route = createFileRoute("/_app/integracoes")({
  component: () => <SidebarPlaceholderPage title="Integrações" />,
});
