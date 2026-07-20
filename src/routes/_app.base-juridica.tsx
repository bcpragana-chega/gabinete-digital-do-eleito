import { createFileRoute } from "@tanstack/react-router";
import { SidebarPlaceholderPage } from "@/components/layout/SidebarPlaceholderPage";

export const Route = createFileRoute("/_app/base-juridica")({
  component: () => <SidebarPlaceholderPage title="Base Jurídica" />,
});
