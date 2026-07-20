import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpDown } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { useProductHelpPageState } from "@/components/help/ProductHelpPageState";
import { NovoDossieDialog } from "@/components/dossies/NovoDossieDialog";
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
import { useDossies } from "@/lib/dossies-store";
import { cn } from "@/lib/utils";
import type { Dossie, EstadoDossie, PrioridadeDossie } from "@/lib/types";

export const Route = createFileRoute("/_app/assuntos/")({
  head: () => ({
    meta: [
      { title: "Assuntos — Tribuno" },
      {
        name: "description",
        content: "Assuntos do mandato: temas e problemas acompanhados pelo eleito.",
      },
    ],
  }),
  component: DossiesPage,
});

const filtros = [
  { id: "todos", label: "Todos" },
  { id: "ativo", label: "Ativos" },
  { id: "em acompanhamento", label: "Em acompanhamento" },
  { id: "concluido", label: "Concluídos" },
  { id: "arquivados", label: "Arquivados" },
] as const;

const ordenacoes = [
  { id: "recentes", label: "Atualização recente" },
  { id: "antigos", label: "Atualização antiga" },
  { id: "titulo", label: "Título (A–Z)" },
  { id: "prioridade", label: "Prioridade" },
] as const;

type FiltroId = (typeof filtros)[number]["id"];
type OrdenacaoId = (typeof ordenacoes)[number]["id"];

const prioridadePeso: Record<PrioridadeDossie, number> = {
  Crítica: 0,
  Alta: 1,
  Média: 2,
  Baixa: 3,
};

function estadoLabel(estado: EstadoDossie) {
  if (estado === "ativo") return "Ativo";
  if (estado === "em acompanhamento") return "Em acompanhamento";
  return "Concluído";
}

function prioridadeTone(prioridade: PrioridadeDossie) {
  if (prioridade === "Crítica") return "danger";
  if (prioridade === "Alta") return "warning";
  return "muted";
}

function estadoTone(estado: EstadoDossie) {
  if (estado === "concluido") return "success";
  if (estado === "em acompanhamento") return "info";
  return "default";
}

function dataAtualizacao(dossie: Dossie) {
  return dossie.updatedAt ?? dossie.createdAt;
}

function formatarAtualizacao(dossie: Dossie) {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dataAtualizacao(dossie)));
}

function formatarAtualizacaoMobile(dossie: Dossie) {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
  }).format(new Date(dataAtualizacao(dossie)));
}

function proximaAcaoDoAssunto(dossie: Dossie) {
  if (dossie.archivedAt || dossie.estado === "concluido") return "Sem ação definida";
  if (!dossie.objetivoPolitico.trim()) return "Definir objetivo político";
  if (!dossie.resumo.trim()) return "Reunir informação";
  return "Rever assunto";
}

function ordenarDossies(dossies: Dossie[], ordenacao: OrdenacaoId) {
  return [...dossies].sort((a, b) => {
    if (ordenacao === "titulo") return a.titulo.localeCompare(b.titulo, "pt");
    if (ordenacao === "prioridade") {
      return prioridadePeso[a.prioridade] - prioridadePeso[b.prioridade];
    }

    const diferenca =
      new Date(dataAtualizacao(b)).getTime() - new Date(dataAtualizacao(a)).getTime();
    return ordenacao === "antigos" ? -diferenca : diferenca;
  });
}

function DossiesPage() {
  const dossies = useDossies();
  const [filtroAtivo, setFiltroAtivo] = useState<FiltroId>("todos");
  const [ordenacao, setOrdenacao] = useState<OrdenacaoId>("recentes");
  const dossiesNaoArquivados = dossies.filter((dossie) => !dossie.archivedAt);
  const dossiesArquivados = dossies.filter((dossie) => dossie.archivedAt);

  const dossiesVisiveis = useMemo(() => {
    const filtrados = dossies.filter((dossie) => {
      if (filtroAtivo === "arquivados") return Boolean(dossie.archivedAt);
      if (dossie.archivedAt) return false;
      if (filtroAtivo === "todos") return true;
      return dossie.estado === filtroAtivo;
    });

    return ordenarDossies(filtrados, ordenacao);
  }, [dossies, filtroAtivo, ordenacao]);

  const ativos = dossiesNaoArquivados.filter((dossie) => dossie.estado === "ativo").length;
  const emAcompanhamento = dossiesNaoArquivados.filter(
    (dossie) => dossie.estado === "em acompanhamento",
  ).length;
  const concluidos = dossiesNaoArquivados.filter((dossie) => dossie.estado === "concluido").length;

  const contagens: Record<FiltroId, number> = {
    todos: dossiesNaoArquivados.length,
    ativo: ativos,
    "em acompanhamento": emAcompanhamento,
    concluido: concluidos,
    arquivados: dossiesArquivados.length,
  };

  useProductHelpPageState({
    emptyState: dossiesVisiveis.length === 0,
    primaryAction: "Criar Assunto",
    currentStatus: dossiesNaoArquivados.length === 0 ? "Por iniciar" : "Com conteúdo",
    nextStep:
      dossiesNaoArquivados.length === 0
        ? "Criar um Assunto"
        : "Abrir um Assunto para rever a próxima ação",
    summaryFacts: [
      `${dossiesNaoArquivados.length} assuntos não arquivados`,
      `${ativos} ativos`,
      `${emAcompanhamento} em acompanhamento`,
      `${concluidos} concluídos`,
    ],
  });

  return (
    <>
      <TopBar
        title={`Assuntos (${dossiesNaoArquivados.length})`}
        description=""
        actions={<NovoDossieDialog />}
        showUtilities={false}
      />

      <div className="sticky top-14 z-30 border-b border-border/60 bg-background/95 backdrop-blur-lg md:top-16">
        <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center gap-2 px-4 py-2 sm:px-5 lg:px-6">
          <div className="flex w-full min-w-0 items-center gap-2 md:hidden">
            <Select
              value={filtroAtivo}
              onValueChange={(value) => setFiltroAtivo(value as FiltroId)}
            >
              <SelectTrigger
                className="h-9 min-w-0 flex-1 border-border/70 bg-background/0 text-xs"
                aria-label="Filtrar assuntos"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start">
                {filtros.map((filtro) => (
                  <SelectItem key={filtro.id} value={filtro.id} className="text-xs">
                    {filtro.label} ({contagens[filtro.id]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={ordenacao} onValueChange={(value) => setOrdenacao(value as OrdenacaoId)}>
              <SelectTrigger
                className="h-9 w-36 shrink-0 border-border/70 bg-background/0 text-xs"
                aria-label="Ordenar assuntos"
              >
                <ArrowUpDown className="mr-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {ordenacoes.map((opcao) => (
                  <SelectItem key={opcao.id} value={opcao.id} className="text-xs">
                    {opcao.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
                  {contagens[filtro.id]}
                </span>
              </button>
            ))}
          </div>

          <div className="ml-auto hidden shrink-0 md:block">
            <Select value={ordenacao} onValueChange={(value) => setOrdenacao(value as OrdenacaoId)}>
              <SelectTrigger
                className="h-8 w-40 border-border/70 bg-background/0 text-xs sm:w-44"
                aria-label="Ordenar assuntos"
              >
                <ArrowUpDown className="mr-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {ordenacoes.map((opcao) => (
                  <SelectItem key={opcao.id} value={opcao.id} className="text-xs">
                    {opcao.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <WorkspacePage contentClassName="overflow-x-hidden">
        <section aria-label="Lista de assuntos">
          {dossiesVisiveis.length === 0 ? (
            <EmptyState
              title="Ainda não existem Assuntos nesta vista"
              description="Os Assuntos ajudam a acompanhar temas políticos ao longo do mandato. Crie um Assunto para começar o acompanhamento."
              action={<NovoDossieDialog />}
            />
          ) : (
            <AssuntosList dossies={dossiesVisiveis} />
          )}
        </section>
      </WorkspacePage>
    </>
  );
}

const listGrid =
  "grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 md:grid-cols-[minmax(12rem,2fr)_minmax(7.5rem,1fr)_minmax(5rem,.65fr)_minmax(10rem,1.25fr)] lg:grid-cols-[minmax(14rem,2fr)_minmax(8rem,1fr)_minmax(5rem,.65fr)_minmax(11rem,1.25fr)_minmax(8rem,.8fr)]";

function AssuntosList({ dossies }: { dossies: Dossie[] }) {
  return (
    <div
      className="min-w-0 overflow-hidden rounded-lg border border-border/70 bg-card"
      data-assuntos-list
    >
      <div
        className={cn(
          listGrid,
          "hidden min-h-8 items-center border-b border-border/70 bg-muted/25 px-3 text-[10px] font-medium uppercase tracking-wide text-muted-foreground md:grid",
        )}
        aria-hidden="true"
      >
        <span>Assunto</span>
        <span>Estado</span>
        <span>Prioridade</span>
        <span>Próxima ação</span>
        <span className="hidden lg:block">Atualizado</span>
      </div>

      <div className="divide-y divide-border/60">
        {dossies.map((dossie) => (
          <AssuntoRow key={dossie.id} dossie={dossie} />
        ))}
      </div>
    </div>
  );
}

function AssuntoRow({ dossie }: { dossie: Dossie }) {
  const arquivado = Boolean(dossie.archivedAt);
  const proximaAcao = proximaAcaoDoAssunto(dossie);

  return (
    <Link
      to="/assuntos/$dossieId"
      params={{ dossieId: dossie.id }}
      className={cn(
        listGrid,
        "group min-h-12 items-center gap-y-0.5 px-3 py-1.5 outline-none transition-colors hover:bg-muted/35 focus-visible:bg-muted/45 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/30 md:min-h-12 md:gap-y-1.5 md:py-2",
      )}
      aria-label={`Abrir assunto: ${dossie.titulo}`}
    >
      <h2 className="min-w-0 truncate text-sm font-semibold leading-5 text-foreground">
        {dossie.titulo}
      </h2>

      <StatusBadge
        tone={prioridadeTone(dossie.prioridade)}
        dot={dossie.prioridade === "Crítica" || dossie.prioridade === "Alta"}
        className="h-5 max-w-24 justify-self-end truncate border-transparent bg-background/0 px-1.5 py-0 text-[10px] md:hidden"
      >
        {dossie.prioridade}
      </StatusBadge>

      <div className="col-span-2 flex min-w-0 items-center gap-1.5 text-[10px] leading-4 text-muted-foreground md:hidden">
        <span className="max-w-[38%] shrink truncate font-medium text-foreground/80">
          {arquivado ? "Arquivado" : estadoLabel(dossie.estado)}
        </span>
        <span aria-hidden="true" className="shrink-0 text-border">
          ·
        </span>
        <time dateTime={dataAtualizacao(dossie)} className="shrink-0 tabular-nums">
          {formatarAtualizacaoMobile(dossie)}
        </time>
        {proximaAcao !== "Sem ação definida" && (
          <>
            <span aria-hidden="true" className="shrink-0 text-border">
              ·
            </span>
            <span className="min-w-0 truncate">{proximaAcao}</span>
            <ArrowRight
              className="h-3 w-3 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
              aria-hidden="true"
            />
          </>
        )}
      </div>

      <StatusBadge
        tone={arquivado ? "muted" : estadoTone(dossie.estado)}
        className="hidden h-5 max-w-40 truncate border-transparent bg-background/0 px-1.5 py-0 text-[10px] md:inline-flex md:justify-self-start"
      >
        {arquivado ? "Arquivado" : estadoLabel(dossie.estado)}
      </StatusBadge>

      <StatusBadge
        tone={prioridadeTone(dossie.prioridade)}
        dot={dossie.prioridade === "Crítica" || dossie.prioridade === "Alta"}
        className="hidden h-5 w-fit border-transparent bg-background/0 px-1.5 py-0 text-[10px] md:inline-flex"
      >
        {dossie.prioridade}
      </StatusBadge>

      <div className="hidden min-w-0 items-center gap-1.5 md:flex">
        <span
          className={cn(
            "truncate text-xs font-semibold text-foreground",
            proximaAcao === "Sem ação definida" && "font-medium text-muted-foreground",
          )}
        >
          {proximaAcao}
        </span>
        <ArrowRight
          className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
          aria-hidden="true"
        />
      </div>

      <time
        dateTime={dataAtualizacao(dossie)}
        className="hidden truncate text-xs tabular-nums text-muted-foreground lg:block"
      >
        {formatarAtualizacao(dossie)}
      </time>
    </Link>
  );
}
