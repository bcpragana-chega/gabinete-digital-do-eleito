import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, FileText, Landmark, MapPin } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { NovaAssembleiaDialog } from "@/components/assembleias/NovaAssembleiaDialog";
import { StatusBadge } from "@/components/ui/common";
import { EmptyState } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ds } from "@/components/ui/design-system";
import { useAssembleias } from "@/lib/assembleias-store";
import { formatarData, getDocumentosByAssembleia } from "@/lib/mock-data";
import type { Assembleia, EstadoAssembleia } from "@/lib/types";

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

function estadoLabel(estado: EstadoAssembleia) {
  if (estado === "preparacao") return "Preparação";
  if (estado === "analise") return "Em análise";
  if (estado === "concluida") return "Concluída";
  return "Arquivada";
}

function estadoTone(estado: EstadoAssembleia) {
  if (estado === "concluida") return "success";
  if (estado === "analise") return "info";
  if (estado === "arquivada") return "muted";
  return "warning";
}

function AssembleiasPage() {
  const assembleias = useAssembleias();
  const [filtroAtivo, setFiltroAtivo] = useState<FiltroId>("todas");
  const assembleiasNaoArquivadas = assembleias.filter((assembleia) => assembleia.estado !== "arquivada");

  const assembleiasVisiveis = assembleias
    .filter((assembleia) => assembleia.estado !== "arquivada")
    .filter((assembleia) => {
      if (filtroAtivo === "todas") return true;
      return assembleia.estado === (filtroAtivo as EstadoAssembleia);
    });

  const emPreparacao = assembleiasNaoArquivadas.filter(
    (assembleia) => assembleia.estado === "preparacao",
  ).length;
  const emAnalise = assembleiasNaoArquivadas.filter(
    (assembleia) => assembleia.estado === "analise",
  ).length;
  const concluidas = assembleiasNaoArquivadas.filter(
    (assembleia) => assembleia.estado === "concluida",
  ).length;

  return (
    <>
      <TopBar breadcrumb="Assembleias" />
      <main className={ds.surface.page}>
        <div className={ds.layout.page}>
          <div className="mb-8 flex flex-col gap-5 sm:mb-10 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-2xl">
              <h1 className={ds.typography.display}>
                Assembleias
              </h1>
              <p className={`mt-2 ${ds.typography.body}`}>
                Organize as sessões do mandato e continue a preparação com contexto.
              </p>
            </div>
            <div className="w-full sm:w-auto">
              <NovaAssembleiaDialog />
            </div>
          </div>

          <section>
            <div className="-mx-4 mb-5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <div className="flex w-max min-w-full items-center gap-2 sm:w-auto sm:min-w-0 sm:flex-wrap">
                {filtros.map((filtro) => (
                  <button
                    key={filtro.id}
                    type="button"
                    onClick={() => setFiltroAtivo(filtro.id)}
                    className={`inline-flex h-9 items-center gap-2 rounded-full px-3 text-sm font-medium transition-colors ${
                      filtroAtivo === filtro.id
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    }`}
                  >
                    {filtro.label}
                    <span className="rounded-full bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground ring-1 ring-border/50">
                      {filtro.id === "todas" && assembleiasNaoArquivadas.length}
                      {filtro.id === "preparacao" && emPreparacao}
                      {filtro.id === "analise" && emAnalise}
                      {filtro.id === "concluida" && concluidas}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {assembleiasVisiveis.length === 0 ? (
              <EmptyState
                title="Nenhuma assembleia encontrada"
                description="Crie uma nova assembleia ou altere o filtro selecionado."
                action={<NovaAssembleiaDialog />}
              />
            ) : (
              <div className={ds.layout.gridCards}>
                {assembleiasVisiveis.map((assembleia) => (
                  <AssembleiaWorkspaceCard key={assembleia.id} assembleia={assembleia} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}

function AssembleiaWorkspaceCard({ assembleia }: { assembleia: Assembleia }) {
  const documentos = getDocumentosByAssembleia(assembleia.id).length;

  return (
    <Card className="group flex min-h-72 min-w-0 flex-col overflow-hidden p-5 transition-colors hover:border-border md:h-72">
      <div className="flex shrink-0 items-start justify-between gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Landmark className={ds.icon.md} strokeWidth={1.75} />
        </div>
        <StatusBadge tone={estadoTone(assembleia.estado)}>
          {estadoLabel(assembleia.estado)}
        </StatusBadge>
      </div>

      <div className="mt-5 min-w-0 overflow-hidden">
        <h2 className="line-clamp-2 break-words text-xl font-semibold leading-7 text-foreground">
          {assembleia.nome}
        </h2>
      </div>

      <div className="mt-5 grid shrink-0 gap-2 text-sm text-muted-foreground">
        <div className="flex min-w-0 items-center gap-2">
          <CalendarDays className={ds.icon.sm} strokeWidth={1.75} />
          <span className="truncate">{formatarData(assembleia.data)} · {assembleia.hora}</span>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <MapPin className={ds.icon.sm} strokeWidth={1.75} />
          <span className="truncate">{assembleia.local}</span>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <FileText className={ds.icon.sm} strokeWidth={1.75} />
          <span className="truncate">{documentos} documentos</span>
        </div>
      </div>

      <div className="mt-auto flex shrink-0 justify-end pt-5">
        <Button asChild variant="secondary" className="w-full sm:w-auto">
          <Link to="/assembleias/$id" params={{ id: assembleia.id }}>
            Abrir
            <ArrowRight className={ds.icon.sm} strokeWidth={1.75} />
          </Link>
        </Button>
      </div>
    </Card>
  );
}
