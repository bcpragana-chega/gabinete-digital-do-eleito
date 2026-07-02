import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Archive, ArrowRight, FileText, NotebookText, Tags } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { NovoDossieDialog } from "@/components/dossies/NovoDossieDialog";
import { EditarDossieDialog } from "@/components/dossies/EditarDossieDialog";
import { EntityCard, MetricCard } from "@/components/ui/cards";
import { StatusBadge } from "@/components/ui/common";
import { EmptyState } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import {
  WorkspaceHeader,
  WorkspaceLayout,
  WorkspaceMetrics,
  WorkspaceSection,
} from "@/components/ui/workspace";
import { arquivarDossie, useDossies } from "@/lib/dossies-store";
import type { Dossie, EstadoDossie, PrioridadeDossie } from "@/lib/types";

export const Route = createFileRoute("/_app/dossies/")({
  head: () => ({
    meta: [
      { title: "Dossiês — Tribuno" },
      {
        name: "description",
        content: "Dossiês do mandato: temas e problemas acompanhados pelo eleito.",
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

function documentosMock(dossie: Dossie) {
  const valores: Record<string, number> = {
    "dossie-habitacao": 3,
    "dossie-centro-saude": 2,
    "dossie-iluminacao-publica": 4,
    "dossie-orcamento-2027": 7,
  };

  return valores[dossie.id] ?? Math.max(0, dossie.tags.length);
}

function proximaAcaoPlaceholder(dossie: Dossie) {
  if (dossie.estado === "concluido") return "Rever histórico quando necessário";
  if (dossie.prioridade === "Crítica") return "Definir seguimento prioritário";
  if (dossie.prioridade === "Alta") return "Preparar próximo passo político";
  return "Adicionar contexto e relações futuras";
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
      <TopBar breadcrumb="Dossiês" />
      <main className="min-h-screen bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          <WorkspaceLayout
            header={
              <WorkspaceHeader
                icon={NotebookText}
                eyebrow="Conhecimento do mandato"
                title="Dossiês"
                description="Temas e problemas acompanhados ao longo do mandato. Nesta fase, os Dossiês ainda não têm relações com Assembleias, Documentos ou Compromissos."
                actions={<NovoDossieDialog />}
                meta={
                  <>
                    <StatusBadge tone="default">{dossiesNaoArquivados.length} dossiês</StatusBadge>
                    <StatusBadge tone="muted">{dossiesArquivados.length} arquivados</StatusBadge>
                    <StatusBadge tone="muted">Relações futuras preparadas</StatusBadge>
                  </>
                }
              />
            }
          >
            <WorkspaceMetrics>
              <MetricCard icon={NotebookText} label="Ativos" value={ativos} />
              <MetricCard icon={FileText} label="Em acompanhamento" value={emAcompanhamento} />
              <MetricCard icon={Tags} label="Concluídos" value={concluidos} />
              <MetricCard
                icon={ArrowRight}
                label="Preparado para"
                value="7 relações"
                description="Timeline, pessoas, entidades, documentos, assembleias, compromissos e IA"
              />
            </WorkspaceMetrics>

            <WorkspaceSection>
              <div className="mb-5 flex flex-wrap gap-1 border-b border-border">
                {filtros.map((filtro) => (
                  <Button
                    key={filtro.id}
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFiltroAtivo(filtro.id)}
                    className={
                      filtroAtivo === filtro.id
                        ? "rounded-none border-b-2 border-primary text-foreground -mb-px"
                        : "rounded-none text-muted-foreground hover:text-foreground"
                    }
                  >
                    {filtro.label}
                  </Button>
                ))}
              </div>

              {dossiesVisiveis.length === 0 ? (
                <EmptyState
                  title="Nenhum Dossiê encontrado"
                  description="Crie um novo Dossiê ou altere o filtro selecionado."
                  action={<NovoDossieDialog />}
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {dossiesVisiveis.map((dossie) => (
                    <DossieCard key={dossie.id} dossie={dossie} />
                  ))}
                </div>
              )}
            </WorkspaceSection>
          </WorkspaceLayout>
        </div>
      </main>
    </>
  );
}

function DossieCard({ dossie }: { dossie: Dossie }) {
  function arquivar() {
    const confirmado = window.confirm(`Arquivar o Dossiê "${dossie.titulo}"?`);
    if (!confirmado) return;
    arquivarDossie(dossie.id);
  }

  const arquivado = Boolean(dossie.archivedAt);

  return (
    <EntityCard
      icon={NotebookText}
      eyebrow="Dossiê"
      title={dossie.titulo}
      description={dossie.resumo || "Sem resumo registado."}
      actions={
        <div className="flex flex-wrap justify-end gap-2">
          {!arquivado && <EditarDossieDialog dossie={dossie} />}
          {!arquivado && (
            <Button type="button" variant="outline" size="sm" onClick={arquivar}>
              <Archive className="mr-2 h-4 w-4" />
              Arquivar
            </Button>
          )}
        </div>
      }
      meta={
        <div className="flex flex-wrap gap-2">
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
      }
    >
      {dossie.objetivoPolitico && (
        <p className="text-sm leading-relaxed text-muted-foreground">{dossie.objetivoPolitico}</p>
      )}
      <div className="mt-4 grid gap-3 rounded-xl border border-border bg-background/60 p-3 text-xs text-muted-foreground">
        <div className="flex items-center justify-between gap-3">
          <span>Última atualização</span>
          <span className="font-medium text-foreground">{formatarAtualizacao(dossie)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Próxima ação</span>
          <span className="text-right font-medium text-foreground">
            {proximaAcaoPlaceholder(dossie)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Documentos</span>
          <span className="font-medium text-foreground">{documentosMock(dossie)}</span>
        </div>
      </div>
      {dossie.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {dossie.tags.map((tag) => (
            <StatusBadge key={tag} tone="muted" dot={false}>
              {tag}
            </StatusBadge>
          ))}
        </div>
      )}
      <div className="mt-5 flex justify-end">
        <Button asChild size="sm" variant="outline">
          <Link to="/dossies/$dossieId" params={{ dossieId: dossie.id }}>
            Abrir
            <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
          </Link>
        </Button>
      </div>
    </EntityCard>
  );
}
