import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  Archive,
  ArrowLeft,
  Bot,
  CheckCircle2,
  Clock3,
  FileText,
  NotebookText,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { EditarDossieDialog } from "@/components/dossies/EditarDossieDialog";
import { DossieNotasSection } from "@/components/dossies/DossieNotasSection";
import { DossieRelacionadosSection } from "@/components/dossies/DossieRelacionadosSection";
import { DossieTimelineSection } from "@/components/dossies/DossieTimelineSection";
import { ActionCard, InfoCard, MetricCard } from "@/components/ui/cards";
import { SectionTitle, StatusBadge } from "@/components/ui/common";
import { EmptyState } from "@/components/ui/feedback";
import { Breadcrumb } from "@/components/ui/navigation";
import { Button } from "@/components/ui/button";
import { Timeline, TimelineItem } from "@/components/ui/timeline";
import {
  WorkspaceHeader,
  WorkspaceLayout,
  WorkspaceMetrics,
  WorkspaceSection,
} from "@/components/ui/workspace";
import { arquivarDossie, useDossie } from "@/lib/dossies-store";
import type { Dossie, EstadoDossie, PrioridadeDossie } from "@/lib/types";

export const Route = createFileRoute("/_app/dossies/$dossieId")({
  head: () => ({
    meta: [
      { title: "Dossiê — Tribuno" },
      {
        name: "description",
        content: "Workspace de Dossiê do mandato.",
      },
    ],
  }),
  component: DossieDetalhePage,
});

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

function formatarData(data?: string) {
  if (!data) return "Sem data";

  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(data));
}

function proximaAcaoPlaceholder(dossie: Dossie) {
  if (dossie.prioridade === "Crítica") {
    return "Validar urgência política e preparar intervenção.";
  }

  if (dossie.estado === "em acompanhamento") {
    return "Rever informação recente e definir seguimento.";
  }

  if (dossie.estado === "concluido") {
    return "Confirmar se o histórico está completo.";
  }

  return "Definir primeiro passo de acompanhamento.";
}

function DossieDetalhePage() {
  const { dossieId } = Route.useParams();
  const dossie = useDossie(dossieId);

  if (!dossie) {
    return (
      <>
        <TopBar breadcrumb="Dossiê" />
        <main className="min-h-screen bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
            <Button asChild variant="ghost" size="sm" className="mb-6">
              <Link to="/dossies">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar aos Dossiês
              </Link>
            </Button>
            <EmptyState
              title="Dossiê não encontrado"
              description="Este Dossiê pode ter sido removido ou ainda não estar disponível neste navegador."
            />
          </div>
        </main>
      </>
    );
  }

  function arquivar() {
    if (!dossie || dossie.archivedAt) return;

    const confirmado = window.confirm(`Arquivar o Dossiê "${dossie.titulo}"?`);
    if (!confirmado) return;
    arquivarDossie(dossie.id);
  }

  const arquivado = Boolean(dossie.archivedAt);
  const ultimaAtualizacao = formatarData(dossie.updatedAt ?? dossie.createdAt);

  return (
    <>
      <TopBar breadcrumb="Dossiê" />
      <main className="min-h-screen bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <Breadcrumb items={[{ label: "Dossiês" }, { label: dossie.titulo }]} />
            <Button asChild variant="ghost" size="sm">
              <Link to="/dossies">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar aos Dossiês
              </Link>
            </Button>
          </div>

          <WorkspaceLayout
            header={
              <WorkspaceHeader
                icon={NotebookText}
                eyebrow="Workspace de Dossiê"
                title={dossie.titulo}
                description="Centro de trabalho para acompanhar este tema ao longo do mandato."
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
                  <>
                    {arquivado && (
                      <StatusBadge tone="muted" dot={false}>
                        Arquivado
                      </StatusBadge>
                    )}
                    <StatusBadge tone={estadoTone(dossie.estado)}>
                      {estadoLabel(dossie.estado)}
                    </StatusBadge>
                    <StatusBadge tone={prioridadeTone(dossie.prioridade)} dot={false}>
                      {dossie.prioridade}
                    </StatusBadge>
                    {dossie.tags.map((tag) => (
                      <StatusBadge key={tag} tone="muted" dot={false}>
                        {tag}
                      </StatusBadge>
                    ))}
                  </>
                }
              />
            }
            sidebar={
              <>
                <WorkspaceSection>
                  <SectionTitle
                    icon={Bot}
                    title="Assistente"
                    description="Preparado para IA como contexto futuro do Dossiê."
                  />
                  <div className="mt-5">
                    <InfoCard
                      title="Ainda não ativo"
                      description="Mais tarde, o assistente poderá resumir evolução, detetar lacunas e sugerir próximos passos."
                    />
                  </div>
                </WorkspaceSection>

                <WorkspaceSection>
                  <SectionTitle icon={Clock3} title="Estado do workspace" />
                  <div className="mt-5 space-y-3">
                    <InfoCard
                      title="Última atualização"
                      description={ultimaAtualizacao}
                    />
                    <InfoCard
                      title="Arquitetura preparada"
                      description="Timeline, relações, notas e atividade já têm espaço reservado."
                    />
                  </div>
                </WorkspaceSection>
              </>
            }
          >
            <WorkspaceMetrics>
              <MetricCard label="Documentos" value="0" description="Placeholder" />
              <MetricCard label="Assembleias" value="0" description="Placeholder" />
              <MetricCard label="Pessoas" value="0" description="Placeholder" />
              <MetricCard label="Compromissos" value="0" description="Placeholder" />
            </WorkspaceMetrics>

            <WorkspaceSection>
              <SectionTitle
                icon={FileText}
                title="Resumo"
                description="Síntese executiva do tema ou problema acompanhado."
              />
              <p className="mt-5 whitespace-pre-line text-sm leading-7 text-muted-foreground">
                {dossie.resumo || "Sem resumo registado."}
              </p>
            </WorkspaceSection>

            <WorkspaceSection>
              <SectionTitle
                icon={CheckCircle2}
                title="Objetivo político"
                description="A intenção que orienta decisões, intervenções e acompanhamento."
              />
              <p className="mt-5 whitespace-pre-line text-sm leading-7 text-muted-foreground">
                {dossie.objetivoPolitico || "Sem objetivo político registado."}
              </p>
            </WorkspaceSection>

            <WorkspaceSection>
              <SectionTitle
                icon={Clock3}
                title="Próxima ação"
                description="Placeholder para orientar o trabalho imediato."
              />
              <div className="mt-5">
                <ActionCard
                  icon={Clock3}
                  title={proximaAcaoPlaceholder(dossie)}
                  description="Esta ação é provisória. No futuro poderá ser calculada a partir de assembleias, compromissos e atividade recente."
                  meta={`Baseado no estado "${estadoLabel(dossie.estado)}" e prioridade "${dossie.prioridade}".`}
                />
              </div>
            </WorkspaceSection>

            <DossieTimelineSection dossieId={dossie.id} />

            <DossieRelacionadosSection dossieId={dossie.id} />

            <DossieNotasSection dossieId={dossie.id} />

            <WorkspaceSection>
              <SectionTitle
                icon={Activity}
                title="Atividade recente"
                description="Registo resumido dos movimentos conhecidos neste Dossiê."
              />
              <Timeline className="mt-5">
                {dossie.updatedAt && (
                  <TimelineItem
                    icon={Activity}
                    title="Dossiê atualizado"
                    description="Os dados principais deste Dossiê foram alterados."
                    meta={formatarData(dossie.updatedAt)}
                  />
                )}
                {dossie.archivedAt && (
                  <TimelineItem
                    icon={Archive}
                    title="Dossiê arquivado"
                    description="O Dossiê deixou de estar ativo na lista principal."
                    meta={formatarData(dossie.archivedAt)}
                  />
                )}
                <TimelineItem
                  icon={NotebookText}
                  title="Dossiê criado"
                  description="Workspace inicial criado para acompanhar este tema."
                  meta={formatarData(dossie.createdAt)}
                />
              </Timeline>
            </WorkspaceSection>
          </WorkspaceLayout>
        </div>
      </main>
    </>
  );
}
