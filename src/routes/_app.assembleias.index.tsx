import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { AssembleiaCard } from "@/components/cards/AssembleiaCard";
import { assembleias } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/assembleias/")({
  head: () => ({
    meta: [
      { title: "Assembleias — Tribuno" },
      {
        name: "description",
        content:
          "Lista de assembleias municipais em preparação, em análise e concluídas.",
      },
      { property: "og:title", content: "Assembleias — Tribuno" },
      {
        property: "og:description",
        content: "Organize todas as assembleias do seu mandato num único local.",
      },
    ],
  }),
  component: AssembleiasPage,
});

const filtros = [
  { id: "todas", label: "Todas" },
  { id: "preparacao", label: "Preparação" },
  { id: "analise", label: "Em análise" },
  { id: "concluida", label: "Concluída" },
];

function AssembleiasPage() {
  return (
    <>
      <TopBar breadcrumb="Assembleias" />
      <main className="px-8 py-10 max-w-7xl">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
              Assembleias
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {assembleias.length} sessões organizadas
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nova Assembleia
          </button>
        </div>

        <div className="flex flex-wrap gap-1 border-b border-border mb-6">
          {filtros.map((f, idx) => (
            <button
              key={f.id}
              type="button"
              className={
                idx === 0
                  ? "px-3 py-2 text-sm font-medium text-foreground border-b-2 border-primary -mb-px"
                  : "px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assembleias.map((a) => (
            <AssembleiaCard key={a.id} assembleia={a} />
          ))}
        </div>
      </main>
    </>
  );
}
