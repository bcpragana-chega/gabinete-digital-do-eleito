import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { useProductHelpPageState } from "@/components/help/ProductHelpPageState";
import { NovaAssembleiaDialog } from "@/components/assembleias/NovaAssembleiaDialog";
import { StatusBadge } from "@/components/ui/common";
import { EmptyState } from "@/components/ui/feedback";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WorkspacePage } from "@/components/ui/workspace";
import { useAssembleias } from "@/lib/assembleias-store";
import { listarDocumentosLocais } from "@/lib/documentos-store";
import { formatarData } from "@/lib/civil-date";
import { obterPontosDaAssembleia } from "@/lib/pontos-store";
import { formatarDataSessaoMobile, sessaoJaPassou } from "@/lib/session-list-presentation";
import type { Assembleia, EstadoAssembleia } from "@/lib/types";
import { cn } from "@/lib/utils";

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
      <TopBar
        title={`Sessões (${assembleiasNaoArquivadas.length})`}
        description=""
        actions={<NovaAssembleiaDialog />}
        showUtilities={false}
      />

      <div className="sticky top-14 z-30 border-b border-border/60 bg-background/95 backdrop-blur-lg md:top-16">
        <div className="mx-auto flex w-full max-w-[1440px] items-center px-4 py-2 sm:px-5 lg:px-6">
          <Select value={filtroAtivo} onValueChange={(value) => setFiltroAtivo(value as FiltroId)}>
            <SelectTrigger
              className="h-9 w-full min-w-0 border-border/70 bg-background/0 text-xs md:hidden"
              aria-label="Filtrar sessões"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              {filtros.map((filtro) => (
                <SelectItem key={filtro.id} value={filtro.id} className="text-xs">
                  {filtro.label} (
                  {filtro.id === "todas"
                    ? assembleiasNaoArquivadas.length
                    : filtro.id === "preparacao"
                      ? emPreparacao
                      : filtro.id === "analise"
                        ? emAnalise
                        : concluidas}
                  )
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="hidden min-w-0 flex-1 items-center gap-0.5 md:flex">
            {filtros.map((filtro) => (
              <button
                key={filtro.id}
                type="button"
                onClick={() => setFiltroAtivo(filtro.id)}
                aria-pressed={filtroAtivo === filtro.id}
                className={cn(
                  "inline-flex h-7 shrink-0 items-center gap-1.5 rounded px-2 text-xs font-medium transition-colors",
                  filtroAtivo === filtro.id
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                {filtro.label}
                <span className="text-[10px] font-normal tabular-nums text-muted-foreground">
                  {filtro.id === "todas" && assembleiasNaoArquivadas.length}
                  {filtro.id === "preparacao" && emPreparacao}
                  {filtro.id === "analise" && emAnalise}
                  {filtro.id === "concluida" && concluidas}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <WorkspacePage contentClassName="overflow-x-hidden">
        <section aria-label="Lista de sessões">
          {assembleiasVisiveis.length === 0 ? (
            <EmptyState
              title="Ainda não existem Sessões nesta vista"
              description="As Sessões organizam documentos, pontos e estratégia do mandato. Crie uma Sessão para começar a preparação."
              action={<NovaAssembleiaDialog />}
            />
          ) : (
            <SessoesList assembleias={assembleiasVisiveis} />
          )}
        </section>
      </WorkspacePage>
    </>
  );
}

const listGrid =
  "grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 md:grid-cols-[minmax(12rem,2fr)_minmax(8rem,1fr)_minmax(7rem,.8fr)_minmax(6rem,.65fr)_minmax(7rem,.75fr)]";

function SessoesList({ assembleias }: { assembleias: Assembleia[] }) {
  return (
    <div
      className="min-w-0 overflow-hidden rounded-lg border border-border/70 bg-card"
      data-sessoes-list
    >
      <div
        className={cn(
          listGrid,
          "hidden min-h-8 items-center border-b border-border/70 bg-muted/25 px-3 text-[10px] font-medium uppercase tracking-wide text-muted-foreground md:grid",
        )}
        aria-hidden="true"
      >
        <span>Sessão</span>
        <span>Data</span>
        <span>Estado</span>
        <span>Pontos</span>
        <span>Ação</span>
      </div>

      <div className="divide-y divide-border/60">
        {assembleias.map((assembleia) => (
          <SessaoRow key={assembleia.id} assembleia={assembleia} />
        ))}
      </div>
    </div>
  );
}

function SessaoRow({ assembleia }: { assembleia: Assembleia }) {
  const documentos = listarDocumentosLocais(assembleia.id).length;
  const pontos = obterPontosDaAssembleia(assembleia.id).length;
  const passada = sessaoJaPassou(assembleia.data);
  const acaoPrincipal = passada ? "Editar" : "Preparar";
  const preparacaoLabel =
    assembleia.preparacaoEstado === "pronta"
      ? "Preparada"
      : assembleia.preparacaoEstado === "em_preparacao" && assembleia.estado !== "preparacao"
        ? "Em preparação"
        : undefined;
  const orgaoOuTerritorio = assembleia.orgao?.trim() || assembleia.local?.trim();

  return (
    <Link
      to="/sessoes/$id"
      params={{ id: assembleia.id }}
      aria-label={`Abrir sessão: ${assembleia.nome}`}
      className={cn(
        listGrid,
        "group min-h-14 items-center gap-y-1.5 px-3 py-2 outline-none transition-colors hover:bg-muted/35 focus-visible:bg-muted/45 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/30 md:min-h-12 md:py-2",
        passada ? "max-md:bg-muted/10" : "max-md:bg-primary/[0.025]",
      )}
    >
      <div className="col-span-2 min-w-0 md:hidden" data-sessao-mobile>
        <div className="flex min-w-0 items-center justify-between gap-2">
          <time
            dateTime={assembleia.data || undefined}
            className={cn(
              "min-w-0 truncate text-sm font-bold leading-5 tabular-nums",
              passada ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {formatarDataSessaoMobile(assembleia.data, assembleia.hora)}
          </time>
          <StatusBadge
            tone={estadoTone(assembleia.estado)}
            dot={false}
            className="h-5 max-w-[42%] shrink-0 truncate border-transparent bg-background/0 px-1.5 py-0 text-[10px]"
          >
            {estadoLabel(assembleia.estado)}
          </StatusBadge>
        </div>

        <div className="flex min-w-0 items-baseline gap-1.5">
          <h2 className="min-w-0 flex-1 truncate text-sm font-semibold leading-4 text-foreground">
            {assembleia.nome}
          </h2>
          {orgaoOuTerritorio && (
            <span className="max-w-[38%] shrink truncate text-[10px] text-muted-foreground">
              {orgaoOuTerritorio}
            </span>
          )}
        </div>

        <div className="flex min-w-0 items-center gap-1.5 text-[10px] leading-4 text-muted-foreground">
          {preparacaoLabel && (
            <span className="shrink-0 font-medium text-foreground/80">{preparacaoLabel}</span>
          )}
          {preparacaoLabel && pontos > 0 && <span aria-hidden="true">·</span>}
          {pontos > 0 && (
            <span className="shrink-0 tabular-nums">
              {pontos} {pontos === 1 ? "ponto" : "pontos"}
            </span>
          )}
          {(preparacaoLabel || pontos > 0) && <span aria-hidden="true">·</span>}
          <span className="min-w-0 truncate font-semibold text-foreground">{acaoPrincipal}</span>
          <ArrowRight
            className="h-3 w-3 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
            aria-hidden="true"
          />
        </div>
      </div>

      <div className="hidden min-w-0 md:block">
        <h2 className="truncate text-sm font-semibold leading-5 text-foreground">
          {assembleia.nome}
        </h2>
      </div>

      <div className="hidden min-w-0 text-xs text-muted-foreground md:block">
        <time dateTime={assembleia.data} className="block truncate tabular-nums">
          {formatarData(assembleia.data)} · {assembleia.hora}
        </time>
        <span className="block truncate text-[11px]">{assembleia.local}</span>
      </div>

      <StatusBadge
        tone={estadoTone(assembleia.estado)}
        className="hidden h-5 max-w-40 truncate border-transparent bg-background/0 px-1.5 py-0 text-[10px] md:inline-flex md:justify-self-start"
      >
        {estadoLabel(assembleia.estado)}
      </StatusBadge>

      <span className="hidden truncate text-xs tabular-nums text-muted-foreground md:block">
        {pontos} {pontos === 1 ? "ponto" : "pontos"}
        {documentos > 0 ? ` · ${documentos} doc.` : ""}
      </span>

      <div className="hidden min-w-0 items-center gap-1.5 md:flex">
        <span className="truncate text-xs font-semibold text-foreground">{acaoPrincipal}</span>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
      </div>
    </Link>
  );
}
