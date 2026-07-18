import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, CalendarDays, Folder } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { NovoDossieDialog } from "@/components/dossies/NovoDossieDialog";
import { StatusBadge } from "@/components/ui/common";
import { EmptyState } from "@/components/ui/feedback";
import { Card } from "@/components/ui/card";
import { ds } from "@/components/ui/design-system";
import { useDossies } from "@/lib/dossies-store";
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

type FiltroId = (typeof filtros)[number]["id"];

function estadoLabel(estado: EstadoDossie) {
  if (estado === "ativo") return "Ativo";
  if (estado === "em acompanhamento") return "Em acompanhamento";
  return "Concluído";
}

function prioridadeTone(prioridade: PrioridadeDossie) {
  if (prioridade === "Crítica") return "danger";
  if (prioridade === "Alta") return "warning";
  if (prioridade === "Média") return "info";
  return "muted";
}

function estadoTone(estado: EstadoDossie) {
  if (estado === "concluido") return "success";
  if (estado === "em acompanhamento") return "info";
  return "default";
}

function formatarAtualizacao(dossie: Dossie) {
  const data = dossie.updatedAt ?? dossie.createdAt;
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(data));
}

function proximaAcaoDoAssunto(dossie: Dossie) {
  if (dossie.archivedAt || dossie.estado === "concluido") return "Sem ação definida";
  if (!dossie.objetivoPolitico.trim()) return "Definir objetivo político";
  if (!dossie.resumo.trim()) return "Reunir informação";
  return "Rever assunto";
}

function DossiesPage() {
  const dossies = useDossies();
  const [filtroAtivo, setFiltroAtivo] = useState<FiltroId>("todos");
  const dossiesNaoArquivados = dossies.filter((dossie) => !dossie.archivedAt);
  const dossiesArquivados = dossies.filter((dossie) => dossie.archivedAt);

  const dossiesVisiveis = dossies.filter((dossie) => {
    if (filtroAtivo === "arquivados") return Boolean(dossie.archivedAt);
    if (dossie.archivedAt) return false;
    if (filtroAtivo === "todos") return true;
    return dossie.estado === filtroAtivo;
  });

  const ativos = dossiesNaoArquivados.filter((dossie) => dossie.estado === "ativo").length;
  const emAcompanhamento = dossiesNaoArquivados.filter(
    (dossie) => dossie.estado === "em acompanhamento",
  ).length;
  const concluidos = dossiesNaoArquivados.filter((dossie) => dossie.estado === "concluido").length;

  return (
    <>
      <TopBar
        title="Assuntos"
        description="Temas, problemas e compromissos acompanhados durante o mandato."
        actions={<NovoDossieDialog />}
      />
      <main className={ds.surface.page}>
        <div className={ds.layout.page}>
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
                      {filtro.id === "todos" && dossiesNaoArquivados.length}
                      {filtro.id === "ativo" && ativos}
                      {filtro.id === "em acompanhamento" && emAcompanhamento}
                      {filtro.id === "concluido" && concluidos}
                      {filtro.id === "arquivados" && dossiesArquivados.length}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              {dossiesVisiveis.length === 0 ? (
                <EmptyState
                  title="Ainda não existem Assuntos nesta vista"
                  description="Os Assuntos ajudam a acompanhar temas políticos ao longo do mandato. Crie um Assunto para começar o acompanhamento."
                  action={<NovoDossieDialog />}
                />
              ) : (
                <div className={ds.layout.gridCards}>
                  {dossiesVisiveis.map((dossie) => (
                    <DossieCard key={dossie.id} dossie={dossie} />
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

function DossieCard({ dossie }: { dossie: Dossie }) {
  const arquivado = Boolean(dossie.archivedAt);

  return (
    <Link to="/assuntos/$dossieId" params={{ dossieId: dossie.id }} className="group block min-w-0">
      <Card className="flex min-h-64 min-w-0 flex-col overflow-hidden p-5 transition-colors hover:border-border hover:bg-card/95">
        <div className="flex shrink-0 items-start justify-between gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Folder className={ds.icon.md} strokeWidth={1.75} />
          </div>
        </div>

        <div className="mt-5 min-w-0 overflow-hidden">
          <h2 className="line-clamp-2 break-words text-xl font-semibold leading-7 text-foreground">
            {dossie.titulo}
          </h2>
          <p className="mt-3 line-clamp-2 break-words text-sm leading-7 text-muted-foreground">
            {dossie.resumo || "Sem resumo registado."}
          </p>
        </div>

        <div className="mt-4 shrink-0 overflow-hidden">
          <div className="flex min-w-0 flex-wrap gap-2">
            {arquivado && (
              <StatusBadge tone="muted" dot={false}>
                Arquivado
              </StatusBadge>
            )}
            <StatusBadge tone={estadoTone(dossie.estado)}>{estadoLabel(dossie.estado)}</StatusBadge>
            <StatusBadge tone={prioridadeTone(dossie.prioridade)} dot={false}>
              {dossie.prioridade}
            </StatusBadge>
          </div>
        </div>

        <div className="mt-5 border-t border-border/60 pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Próxima ação
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">{proximaAcaoDoAssunto(dossie)}</p>
        </div>

        <div className="mt-auto flex shrink-0 items-end justify-between gap-4 pt-5 text-sm">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
              <CalendarDays className={ds.icon.sm} strokeWidth={1.75} />
              <span className="truncate">Última atividade</span>
            </div>
            <p className="mt-1 truncate font-medium text-foreground">
              {formatarAtualizacao(dossie)}
            </p>
          </div>
          <Activity
            className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
            strokeWidth={1.75}
          />
        </div>
      </Card>
    </Link>
  );
}
