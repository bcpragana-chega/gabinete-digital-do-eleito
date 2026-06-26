import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/layout/TopBar";
import { AssembleiaCard } from "@/components/cards/AssembleiaCard";
import { NovaAssembleiaDialog } from "@/components/assembleias/NovaAssembleiaDialog";
import { useAssembleias } from "@/lib/assembleias-store";
import type { EstadoAssembleia } from "@/lib/types";

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
] as const;

type FiltroId = (typeof filtros)[number]["id"];

function AssembleiasPage() {
  const assembleias = useAssembleias();
  const [filtroAtivo, setFiltroAtivo] = useState<FiltroId>("todas");

  const assembleiasVisiveis = assembleias
    .filter((assembleia) => assembleia.estado !== "arquivada")
    .filter((assembleia) => {
      if (filtroAtivo === "todas") return true;
      return assembleia.estado === (filtroAtivo as EstadoAssembleia);
    });

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
              {assembleiasVisiveis.length} sessões organizadas
            </p>
          </div>

          <NovaAssembleiaDialog />
        </div>

        <div className="flex flex-wrap gap-1 border-b border-border mb-6">
          {filtros.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltroAtivo(f.id)}
              className={
                filtroAtivo === f.id
                  ? "px-3 py-2 text-sm font-medium text-foreground border-b-2 border-primary -mb-px"
                  : "px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        {assembleiasVisiveis.length === 0 ? (
          <section className="rounded-2xl border border-border bg-card p-8 shadow-card">
            <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
              Nenhuma assembleia encontrada
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Crie uma nova assembleia ou altere o filtro selecionado.
            </p>
          </section>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {assembleiasVisiveis.map((a) => (
              <AssembleiaCard key={a.id} assembleia={a} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}