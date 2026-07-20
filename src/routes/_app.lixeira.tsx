import { createFileRoute } from "@tanstack/react-router";
import { SidebarPlaceholderPage } from "@/components/layout/SidebarPlaceholderPage";

export const Route = createFileRoute("/_app/lixeira")({
  component: () => <SidebarPlaceholderPage title="Lixeira" />,
});
