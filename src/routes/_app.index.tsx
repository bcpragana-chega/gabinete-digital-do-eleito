import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "@/components/dashboard/DashboardPage";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [
      { title: "Hoje — Tribuno" },
      {
        name: "description",
        content: "O que precisa de fazer hoje: sessões, documentos e assuntos importantes.",
      },
      { property: "og:title", content: "Hoje — Tribuno" },
      {
        property: "og:description",
        content: "Apoio ao mandato para eleitos locais em Portugal.",
      },
    ],
  }),
  component: DashboardPage,
});
