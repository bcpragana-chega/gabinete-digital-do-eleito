import { useMemo, useState } from "react";
import {
  createFileRoute,
  Link,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import {
  Activity,
  Clock,
  Archive,
  Bot,
  CalendarDays,
  CheckCircle2,
  FileText,
  Landmark,
  ListChecks,
  MapPin,
  NotebookText,
  ScrollText,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { formatarData } from "@/lib/mock-data";
import { arquivarAssembleia, useAssembleia } from "@/lib/assembleias-store";
import { EditarAssembleiaDialog } from "@/components/assembleias/EditarAssembleiaDialog";
import { AdicionarDocumentoSheet } from "@/components/documentos/AdicionarDocumentoSheet";
import { AdicionarPontoDialog } from "@/components/preparacao/AdicionarPontoDialog";
import { Button } from "@/components/ui/button";
import { ActionCard, InfoCard } from "@/components/ui/cards";
import { SectionTitle, StatusBadge } from "@/components/ui/common";
import { EmptyState } from "@/components/ui/feedback";
import { Breadcrumb } from "@/components/ui/navigation";
import { Timeline, TimelineItem } from "@/components/ui/timeline";
import {
  WorkspaceHeader,
  WorkspaceLayout,
  WorkspaceSection,
} from "@/components/ui/workspace";
import { useDocumentosDaAssembleia } from "@/lib/documentos-store";
import { listarDocumentosACriarDaAssembleia } from "@/lib/documentos-a-criar-store";
import { obterPontosDaAssembleia } from "@/lib/pontos-store";
import { obterEstrategiaDaAssembleia } from "@/lib/estrategia-store";
import type { EstadoAssembleia } from "@/lib/types";

export const Route = createFileRoute("/_app/assembleias/$id")({
  head: () => ({
    meta: [
      { title: "Assembleia — Tribuno" },
      {
        name: "description",
        content:
          "Detalhe da sessão, preparação e acompanhamento da assembleia municipal.",
      },
    ],
  }),
  component: AssembleiaDetailPage,
});

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

function AssembleiaDetailPage() {
  const { id } = Route.useParams();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const assembleia = useAssembleia(id);
  const documentos = useDocumentosDaAssembleia(id);
  const [versaoPontos, setVersaoPontos] = useState(0);
  const pontos = useMemo(() => obterPontosDaAssembleia(id), [id, versaoPontos]);
  const documentosACriar = useMemo(() => listarDocumentosACriarDaAssembleia(id), [id]);
  const estrategia = useMemo(() => obterEstrategiaDaAssembleia(id), [id]);
  const [confirmarArquivo, setConfirmarArquivo] = useState(false);

  const isSubRoute = pathname.includes(`/assembleias/${id}/`);

  if (isSubRoute) {
    return <Outlet />;
  }

  if (!assembleia) {
    return (
      <>
        <TopBar breadcrumb="Assembleias" />
        <main className="min-h-screen bg-transparent">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
            <Button asChild variant="ghost" size="sm" className="mb-6">
              <Link to="/assembleias">
                Todas as assembleias
              </Link>
            </Button>
            <EmptyState
              title="Assembleia não encontrada"
              description="Esta assembleia pode ter sido removida ou ainda não estar disponível neste navegador."
            />
          </div>
        </main>
      </>
    );
  }

  function arquivar() {
    if (!assembleia) return;

    if (!confirmarArquivo) {
      setConfirmarArquivo(true);
      return;
    }

    arquivarAssembleia(assembleia.id);
    setConfirmarArquivo(false);
  }

  const estaArquivada = assembleia.estado === "arquivada";
  const estrategiaTemConteudo = [
    estrategia.objetivoPolitico,
    estrategia.mensagemPrincipal,
    estrategia.naoFazer,
    estrategia.adversariosPrevisiveis,
    estrategia.notasLivres,
  ].some((campo) => campo.trim().length > 0);

  return (
    <>
      <TopBar breadcrumb="Assembleia" />
      <main className="min-h-screen bg-transparent">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <Breadcrumb items={[{ label: "Assembleias" }, { label: assembleia.nome }]} />
            <Button asChild variant="ghost" size="sm">
              <Link to="/assembleias">Voltar às Assembleias</Link>
            </Button>
          </div>

          <WorkspaceLayout
            header={
              <WorkspaceHeader
                icon={Landmark}
                eyebrow="Workspace de Assembleia"
                title={assembleia.nome}
                description="Centro de trabalho para preparar, acompanhar e consultar esta sessão."
                className="border-border/60 bg-white p-4 shadow-none sm:p-7"
                actions={
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
                    <EditarAssembleiaDialog assembleia={assembleia} />
                    {!estaArquivada && (
                      <Button type="button" variant="secondary" size="sm" onClick={arquivar} className="w-full sm:w-auto">
                        <Archive className="mr-2 h-4 w-4" />
                        {confirmarArquivo ? "Confirmar arquivo" : "Arquivar"}
                      </Button>
                    )}
                  </div>
                }
                meta={
                  <>
                    <StatusBadge tone={estadoTone(assembleia.estado)}>
                      {estadoLabel(assembleia.estado)}
                    </StatusBadge>
                    <StatusBadge tone="muted" dot={false}>
                      {formatarData(assembleia.data)}
                    </StatusBadge>
                    <StatusBadge tone="muted" dot={false}>
                      {assembleia.hora}
                    </StatusBadge>
                    <StatusBadge tone="muted" dot={false}>
                      {assembleia.local}
                    </StatusBadge>
                  </>
                }
              >
                {confirmarArquivo && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Clique novamente em <span className="font-medium text-foreground">Confirmar arquivo</span> para arquivar esta assembleia.
                  </p>
                )}
              </WorkspaceHeader>
            }
            sidebar={
              <>
                <WorkspaceSection>
                  <SectionTitle
                    icon={Clock}
                    title="Estado do workspace"
                    description="Resumo rápido do trabalho disponível nesta assembleia."
                  />
                  <div className="mt-5 space-y-3">
                    <InfoCard title="Data" description={`${formatarData(assembleia.data)} · ${assembleia.hora}`} />
                    <InfoCard title="Local" description={assembleia.local} />
                    <InfoCard
                      title="Conteúdo preparado"
                      description={`${documentos.length} documentos · ${pontos.length} pontos · ${documentosACriar.length} rascunhos`}
                    />
                  </div>
                </WorkspaceSection>
              </>
            }
          >
            <WorkspaceSection className="border-border/60 bg-white shadow-none">
              <SectionTitle
                icon={FileText}
                title="Visão geral"
                description="Informação essencial da sessão e estado atual de preparação."
              />
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <InfoCard icon={CalendarDays} title="Data" description={formatarData(assembleia.data)} />
                <InfoCard icon={Clock} title="Hora" description={assembleia.hora} />
                <InfoCard icon={MapPin} title="Local" description={assembleia.local} />
              </div>
            </WorkspaceSection>

            <WorkspaceSection className="border-border/60 bg-white shadow-none">
              <SectionTitle
                icon={FileText}
                title="Documentos"
                description="Documentos associados à preparação desta assembleia."
                actions={
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
                    <AdicionarDocumentoSheet assembleiaId={id} />
                    <Button asChild variant="secondary" size="sm" className="w-full sm:w-auto">
                      <Link to="/assembleias/$id/preparacao/documentos" params={{ id }}>
                        Ver todos
                      </Link>
                    </Button>
                  </div>
                }
              />
              <div className="mt-5 grid gap-3">
                {documentos.length === 0 ? (
                  <InfoCard
                    icon={FileText}
                    title="Ainda não existem documentos"
                    description="Adicione convocatórias, atas, propostas ou relatórios para preparar a sessão."
                  />
                ) : (
                  documentos.slice(0, 3).map((documento) => (
                    <ActionCard
                      key={documento.id}
                      icon={FileText}
                      title={documento.titulo}
                      description={documento.notas || documento.ficheiroNome || documento.tipo}
                      meta={`${documento.tipo} · ${formatarData(documento.data)}`}
                      action={
                        <Button asChild variant="secondary" size="sm">
                          <Link
                            to="/assembleias/$id/documentos/$docId"
                            params={{ id, docId: documento.id }}
                          >
                            Abrir
                          </Link>
                        </Button>
                      }
                    />
                  ))
                )}
              </div>
            </WorkspaceSection>

            <WorkspaceSection className="border-border/60 bg-white shadow-none">
              <SectionTitle
                icon={CheckCircle2}
                title="Estratégia"
                description="Objetivo político, mensagem principal e notas estratégicas."
                actions={
                  <Button asChild variant="secondary" size="sm" className="w-full sm:w-auto">
                    <Link to="/assembleias/$id/preparacao/estrategia" params={{ id }}>
                      Editar estratégia
                    </Link>
                  </Button>
                }
              />
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <InfoCard
                  title="Objetivo político"
                  description={estrategia.objetivoPolitico || "Ainda sem objetivo político definido."}
                />
                <InfoCard
                  title="Mensagem principal"
                  description={estrategia.mensagemPrincipal || "Ainda sem mensagem principal definida."}
                />
                {!estrategiaTemConteudo && (
                  <InfoCard
                    title="Briefing por preencher"
                    description="Abra a estratégia para definir a linha política antes da sessão."
                    className="md:col-span-2"
                  />
                )}
              </div>
            </WorkspaceSection>

            <WorkspaceSection className="border-border/60 bg-white shadow-none">
              <SectionTitle
                icon={ListChecks}
                title="Pontos da Ordem de Trabalhos"
                description="Pontos da ordem de trabalhos e preparação por ponto."
                actions={
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
                    <AdicionarPontoDialog
                      assembleiaId={id}
                      onAdicionar={() => setVersaoPontos((valor) => valor + 1)}
                    />
                    <Button asChild variant="secondary" size="sm" className="w-full sm:w-auto">
                      <Link to="/assembleias/$id/preparacao/pontos" params={{ id }}>
                        Ver todos
                      </Link>
                    </Button>
                  </div>
                }
              />
              <div className="mt-5 grid gap-3">
                {pontos.length === 0 ? (
                  <InfoCard
                    icon={ListChecks}
                    title="Ainda não existem pontos"
                    description="Adicione pontos para preparar perguntas, notas, ações e documentos associados."
                  />
                ) : (
                  pontos.slice(0, 4).map((ponto) => (
                    <ActionCard
                      key={ponto.id}
                      icon={ListChecks}
                      title={`${ponto.numero}. ${ponto.titulo}`}
                      description={ponto.descricao || ponto.objetivoPolitico || "Ponto por preparar."}
                      meta={`${ponto.estado} · ${ponto.prioridade}`}
                      action={
                        <Button asChild variant="secondary" size="sm">
                          <Link
                            to="/assembleias/$id/preparacao/pontos/$pontoId"
                            params={{ id, pontoId: ponto.id }}
                          >
                            Abrir
                          </Link>
                        </Button>
                      }
                    />
                  ))
                )}
              </div>
            </WorkspaceSection>

            <WorkspaceSection className="border-border/60 bg-white shadow-none">
              <SectionTitle
                icon={ScrollText}
                title="Documentos a Criar"
                description="Rascunhos e documentos que resultam da preparação."
                actions={
                  <Button asChild variant="secondary" size="sm" className="w-full sm:w-auto">
                    <Link to="/assembleias/$id/preparacao/documentos-a-criar" params={{ id }}>
                      Ver todos
                    </Link>
                  </Button>
                }
              />
              <div className="mt-5 grid gap-3">
                {documentosACriar.length === 0 ? (
                  <InfoCard
                    icon={ScrollText}
                    title="Ainda não existem rascunhos"
                    description="Os documentos a criar aparecem aqui quando forem preparados a partir dos pontos."
                  />
                ) : (
                  documentosACriar.slice(0, 3).map((documento) => (
                    <ActionCard
                      key={documento.id}
                      icon={ScrollText}
                      title={documento.titulo}
                      description={documento.tipo}
                      meta={documento.estado}
                      action={
                        <Button asChild variant="secondary" size="sm">
                          <Link
                            to="/assembleias/$id/preparacao/pontos/$pontoId/rascunhos/$rascunhoId"
                            params={{ id, pontoId: documento.pontoId, rascunhoId: documento.id }}
                          >
                            Abrir
                          </Link>
                        </Button>
                      }
                    />
                  ))
                )}
              </div>
            </WorkspaceSection>

            <WorkspaceSection className="border-border/60 bg-white shadow-none">
              <SectionTitle
                icon={Activity}
                title="Timeline"
                description="Placeholder para a história desta assembleia."
              />
              <Timeline className="mt-5">
                <TimelineItem
                  icon={Landmark}
                  title="Assembleia criada"
                  description="Sessão registada no Tribuno."
                  meta={formatarData(assembleia.data)}
                />
              </Timeline>
            </WorkspaceSection>

            <WorkspaceSection className="border-border/60 bg-white shadow-none">
              <SectionTitle
                icon={NotebookText}
                title="Relacionados"
                description="Placeholder para Dossiês, documentos, pessoas, entidades e compromissos ligados à assembleia."
              />
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <InfoCard title="Dossiês" description="Relações reais serão ligadas nesta área." />
                <InfoCard title="Compromissos" description="Preparado para acompanhamento futuro." />
              </div>
            </WorkspaceSection>

            <WorkspaceSection className="border-border/60 bg-white shadow-none">
              <SectionTitle
                icon={Bot}
                title="Assistente"
                description="Preparado para IA. Não ativo nesta fase."
              />
              <div className="mt-5">
                <InfoCard
                  title="Contexto pronto"
                  description="No futuro, o assistente poderá usar documentos, estratégia, pontos e rascunhos desta assembleia para ajudar na preparação."
                />
              </div>
            </WorkspaceSection>
          </WorkspaceLayout>
        </div>
      </main>
    </>
  );
}
