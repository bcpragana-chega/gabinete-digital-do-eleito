import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Clock, FileText, Landmark, ListChecks, MapPin } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { useProductHelpPageState } from "@/components/help/ProductHelpPageState";
import { NovaAssembleiaDialog } from "@/components/assembleias/NovaAssembleiaDialog";
import { StatusBadge } from "@/components/ui/common";
import { EmptyState } from "@/components/ui/feedback";
import { Card } from "@/components/ui/card";
import { ds } from "@/components/ui/design-system";
import { WorkspacePage } from "@/components/ui/workspace";
import { useAssembleias } from "@/lib/assembleias-store";
import { listarDocumentosLocais } from "@/lib/documentos-store";
import { formatarData } from "@/lib/civil-date";
import { obterPontosDaAssembleia } from "@/lib/pontos-store";
import type { Assembleia, EstadoAssembleia } from "@/lib/types";

export const Route = createFileRoute("/_app/sessoes/")({
  head: () => ({
    meta: [
      { title: "Sessões — Tribuno" },
      {
        name: "description",
        content: "Lista de sessões em preparação, em análise e concluídas.",
      },
      { property: "og:title", content: "Sessões — Tribuno" },
      {
        property: "og:description",
        content: "Organize todas as sessões do mandato num único local.",
      },
    ],
  }),
  component: AssembleiasPage,
});

const filtros = [
  { id: "todas", label: "Todas" },
  { id: "preparacao", label: "Em preparação" },
  { id: "analise", label: "Em análise" },
  { id: "concluida", label: "Concluída" },
] as const;

type FiltroId = (typeof filtros)[number]["id"];

function estadoLabel(estado: EstadoAssembleia) {
  if (estado === "preparacao") return "Em preparação";
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
  const assembleiasNaoArquivadas = assembleias.filter(
    (assembleia) => assembleia.estado !== "arquivada",
  );

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

  useProductHelpPageState({
    emptyState: assembleiasVisiveis.length === 0,
    primaryAction: "Criar sessão",
    currentStatus: assembleiasNaoArquivadas.length === 0 ? "Por iniciar" : "Com sessões",
    nextStep:
      assembleiasNaoArquivadas.length === 0
        ? "Criar manualmente uma sessão ou analisar uma convocatória"
        : emPreparacao > 0
          ? "Abrir uma sessão em preparação"
          : "Abrir uma sessão para consultar o estado",
    summaryFacts: [
      `${assembleiasNaoArquivadas.length} sessões não arquivadas`,
      `${emPreparacao} em preparação`,
      `${emAnalise} em análise`,
      `${concluidas} concluídas`,
    ],
  });

  return (
    <>
      <TopBar breadcrumb="Sessões" actions={<NovaAssembleiaDialog />} />
      <WorkspacePage>
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
              title="Ainda não existem Sessões nesta vista"
              description="As Sessões organizam documentos, pontos e estratégia do mandato. Crie uma Sessão para começar a preparação."
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
      </WorkspacePage>
    </>
  );
}

function AssembleiaWorkspaceCard({ assembleia }: { assembleia: Assembleia }) {
  const documentos = listarDocumentosLocais(assembleia.id).length;
  const pontos = obterPontosDaAssembleia(assembleia.id).length;
  const acaoPrincipal = sessaoJaPassou(assembleia.data) ? "Editar" : "Preparar";

  return (
    <Link to="/sessoes/$id" params={{ id: assembleia.id }} className="group block min-w-0">
      <Card className="flex min-h-72 min-w-0 flex-col overflow-hidden p-5 transition-colors hover:border-border hover:bg-card/95 md:h-72">
        <div className="flex shrink-0 items-start justify-between gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Landmark className={ds.icon.md} strokeWidth={1.75} />
          </div>
          <StatusBadge tone="muted" dot={false}>
            Sessão de trabalho
          </StatusBadge>
        </div>

        <div className="mt-5 min-w-0 overflow-hidden">
          <h2 className="line-clamp-2 break-words text-xl font-semibold leading-7 text-foreground">
            {assembleia.nome}
          </h2>
          <div className="mt-3 flex min-w-0 flex-wrap gap-2">
            <StatusBadge tone={estadoTone(assembleia.estado)}>
              {estadoLabel(assembleia.estado)}
            </StatusBadge>
          </div>
        </div>

        <div className="mt-5 grid shrink-0 gap-2 text-sm text-muted-foreground">
          <div className="flex min-w-0 items-center gap-2">
            <CalendarDays className={ds.icon.sm} strokeWidth={1.75} />
            <span className="truncate">{formatarData(assembleia.data)}</span>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <Clock className={ds.icon.sm} strokeWidth={1.75} />
            <span className="truncate">{assembleia.hora}</span>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <MapPin className={ds.icon.sm} strokeWidth={1.75} />
            <span className="truncate">{assembleia.local}</span>
          </div>
        </div>

        <div className="mt-auto flex shrink-0 flex-wrap items-center justify-between gap-3 pt-5 text-sm">
          <div className="flex min-w-0 flex-wrap gap-x-4 gap-y-2 text-muted-foreground">
            <span className="inline-flex min-w-0 items-center gap-2">
              <FileText className={ds.icon.sm} strokeWidth={1.75} />
              <span className="truncate">{documentos} documentos</span>
            </span>
            <span className="inline-flex min-w-0 items-center gap-2">
              <ListChecks className={ds.icon.sm} strokeWidth={1.75} />
              <span className="truncate">{pontos} pontos</span>
            </span>
          </div>
          <span className="font-medium text-foreground transition-transform group-hover:translate-x-0.5">
            {acaoPrincipal}
          </span>
        </div>
      </Card>
    </Link>
  );
}

function sessaoJaPassou(data: string) {
  const [ano, mes, dia] = data.split("-").map(Number);

  if (!ano || !mes || !dia) return false;

  const dataSessao = new Date(ano, mes - 1, dia);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  return dataSessao.getTime() < hoje.getTime();
}
