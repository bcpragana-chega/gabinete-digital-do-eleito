import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Bot,
  Calendar,
  CheckCircle2,
  Clock3,
  FileText,
  Landmark,
  Lightbulb,
  ListChecks,
  MapPin,
  MessageSquareText,
  NotebookText,
  Siren,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { ActionCard, EntityCard, InfoCard, MetricCard } from "@/components/ui/cards";
import { SectionTitle, StatusBadge } from "@/components/ui/common";
import { EmptyState } from "@/components/ui/feedback";
import { Timeline, TimelineItem } from "@/components/ui/timeline";
import {
  WorkspaceHeader,
  WorkspaceLayout,
  WorkspaceMetrics,
  WorkspaceSection,
} from "@/components/ui/workspace";
import { formatarData } from "@/lib/mock-data";
import { useAssembleias } from "@/lib/assembleias-store";
import { useDocumentosDaAssembleia } from "@/lib/documentos-store";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [
      { title: "Gabinete — Tribuno" },
      {
        name: "description",
        content:
          "Gabinete digital do eleito local: próxima assembleia, documentos, alertas e ações pendentes.",
      },
      { property: "og:title", content: "Gabinete — Tribuno" },
      {
        property: "og:description",
        content: "Gabinete digital para eleitos locais em Portugal.",
      },
    ],
  }),
  component: GabinetePage,
});

function diasAte(iso: string): number {
  const alvo = new Date(iso + "T00:00:00").getTime();
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((alvo - hoje.getTime()) / 86400000));
}

const dossiesAtivos = [
  {
    titulo: "Habitação",
    estado: "Ativo",
    detalhe: "3 documentos recentes · 1 compromisso pendente",
    acao: "Preparar pergunta",
  },
  {
    titulo: "Centro de Saúde",
    estado: "A acompanhar",
    detalhe: "Reunião registada · resposta em aberto",
    acao: "Atualizar seguimento",
  },
  {
    titulo: "Iluminação Pública",
    estado: "Crítico",
    detalhe: "2 pedidos sem resposta",
    acao: "Criar requerimento",
  },
  {
    titulo: "Orçamento 2027",
    estado: "Em preparação",
    detalhe: "4 pontos por rever",
    acao: "Analisar documentos",
  },
];

const agendaMock = [
  {
    titulo: "Reunião com moradores",
    data: "Hoje",
    detalhe: "Habitação · 18:00",
  },
  {
    titulo: "Prazo de resposta",
    data: "Amanhã",
    detalhe: "Iluminação Pública",
  },
  {
    titulo: "Revisão de documentos",
    data: "Esta semana",
    detalhe: "Orçamento 2027",
  },
];

const atividadeMock = [
  {
    titulo: "Nota adicionada ao Dossiê Habitação",
    descricao: "Apontamento de reunião com moradores.",
    meta: "Hoje",
  },
  {
    titulo: "Documento associado a Orçamento 2027",
    descricao: "Relatório de execução orçamental marcado para análise.",
    meta: "Ontem",
  },
  {
    titulo: "Compromisso atualizado",
    descricao: "Centro de Saúde ficou a aguardar resposta da entidade responsável.",
    meta: "2 dias",
  },
];

function GabinetePage() {
  const assembleias = useAssembleias();

  const ativas = assembleias.filter((a) => a.estado !== "arquivada");

  const proxima =
    ativas
      .filter((a) => a.estado !== "concluida")
      .sort((a, b) => `${a.data}T${a.hora}`.localeCompare(`${b.data}T${b.hora}`))[0] ??
    ativas
      .slice()
      .sort((a, b) => `${b.data}T${b.hora}`.localeCompare(`${a.data}T${a.hora}`))[0];

  const docsProxima = useDocumentosDaAssembleia(proxima?.id ?? "");

  const assembleiasEmPreparacao = ativas.filter((a) => a.estado === "preparacao").length;
  const assembleiasConcluidas = assembleias.filter((a) => a.estado === "concluida").length;
  const assembleiasArquivadas = assembleias.filter((a) => a.estado === "arquivada").length;

  const atividadeRecente = assembleias
    .slice()
    .sort((a, b) => `${b.data}T${b.hora}`.localeCompare(`${a.data}T${a.hora}`))
    .slice(0, 3);

  const diasParaProxima = proxima ? diasAte(proxima.data) : null;

  return (
    <>
      <TopBar breadcrumb="Gabinete" />
      <main className="min-h-screen bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          <WorkspaceLayout
            header={
              <WorkspaceHeader
                icon={Landmark}
                eyebrow="Centro de Comando"
                title="Bom dia, Benjamin."
                description="O essencial do mandato para decidir o próximo passo com calma e contexto."
                actions={
                  proxima ? (
                    <Link
                      to="/assembleias/$id/preparacao"
                      params={{ id: proxima.id }}
                      className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      Continuar preparação
                      <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
                    </Link>
                  ) : null
                }
                meta={
                  <>
                    <StatusBadge tone="info">Workspace diário</StatusBadge>
                    <StatusBadge tone="muted">{ativas.length} assembleias ativas</StatusBadge>
                    <StatusBadge tone="muted">{dossiesAtivos.length} dossiês ativos</StatusBadge>
                  </>
                }
              >
                {proxima ? (
                  <div className="mt-6 rounded-2xl border border-border bg-background/60 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Próxima assembleia
                          </span>
                          <StatusBadge tone="warning" dot={false}>
                            {proxima.estado}
                          </StatusBadge>
                        </div>
                        <h2 className="mt-2 font-display text-xl font-semibold tracking-tight text-foreground">
                          {proxima.nome}
                        </h2>
                        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                          <span className="inline-flex items-center gap-2">
                            <Calendar className="h-4 w-4" strokeWidth={1.75} />
                            {formatarData(proxima.data)} · {proxima.hora}
                          </span>
                          <span className="inline-flex items-center gap-2">
                            <MapPin className="h-4 w-4" strokeWidth={1.75} />
                            {proxima.local}
                          </span>
                          <span className="inline-flex items-center gap-2">
                            <FileText className="h-4 w-4" strokeWidth={1.75} />
                            {docsProxima.length} documentos
                          </span>
                        </div>
                      </div>
                      <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm">
                        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Estado da preparação
                        </div>
                        <div className="mt-1 font-display text-2xl font-semibold text-foreground">
                          {diasParaProxima === 0 ? "Hoje" : `${diasParaProxima} dias`}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    compact
                    className="mt-6"
                    title="Ainda não existem assembleias."
                    description="Crie a primeira assembleia para começar a organizar o mandato."
                  />
                )}
              </WorkspaceHeader>
            }
            sidebar={
              <>
                <WorkspaceSection>
                  <SectionTitle
                    icon={Calendar}
                    title="Agenda"
                    description="Próximos eventos e momentos de trabalho."
                  />
                  <div className="mt-5 space-y-3">
                    {agendaMock.map((item) => (
                      <InfoCard key={item.titulo} title={item.titulo} description={item.detalhe}>
                        <StatusBadge tone="muted" dot={false}>
                          {item.data}
                        </StatusBadge>
                      </InfoCard>
                    ))}
                  </div>
                </WorkspaceSection>

                <WorkspaceSection>
                  <SectionTitle
                    icon={Bot}
                    title="Assistente Tribuno"
                    description="Preparado para IA. Dados demonstrativos por agora."
                  />
                  <div className="mt-5 space-y-3">
                    <InfoCard
                      icon={Lightbulb}
                      title="Sugestão futura"
                      description="Identificar riscos nos Dossiês ativos e preparar contexto antes da assembleia."
                    />
                    <InfoCard
                      icon={MessageSquareText}
                      title="Perguntas rápidas"
                      description="Resumo do dia, pendentes críticos e documentos por analisar."
                    />
                  </div>
                </WorkspaceSection>
              </>
            }
          >
            <WorkspaceSection>
              <SectionTitle
                icon={Siren}
                title="O que precisa da tua atenção"
                description="Ações, prioridades e pendentes mais importantes neste momento."
              />
              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                <ActionCard
                  icon={ListChecks}
                  title="Preparar próxima assembleia"
                  description={
                    proxima
                      ? `${proxima.nome} · ${docsProxima.length} documentos carregados`
                      : "Sem assembleia futura registada"
                  }
                  action={
                    proxima ? (
                      <Link
                        to="/assembleias/$id/preparacao"
                        params={{ id: proxima.id }}
                        className="text-sm font-medium text-primary hover:text-primary/80"
                      >
                        Abrir
                      </Link>
                    ) : null
                  }
                />
                <ActionCard
                  icon={Clock3}
                  title="Rever pendentes"
                  description="2 compromissos precisam de seguimento esta semana."
                  meta="Mock"
                />
                <ActionCard
                  icon={NotebookText}
                  title="Atualizar Dossiês"
                  description="Iluminação Pública e Centro de Saúde têm atividade recente."
                  meta="Prioridade"
                />
              </div>
            </WorkspaceSection>

            <WorkspaceSection>
              <SectionTitle
                icon={ArrowRight}
                title="Continuar trabalho"
                description="Retomar o último contexto útil."
              />
              <div className="mt-5">
                {proxima ? (
                  <ActionCard
                    icon={Landmark}
                    title={proxima.nome}
                    description="Último local sugerido: preparação da próxima assembleia."
                    meta={`${formatarData(proxima.data)} · ${proxima.hora}`}
                    action={
                      <Link
                        to="/assembleias/$id/preparacao"
                        params={{ id: proxima.id }}
                        className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                      >
                        Continuar
                        <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
                      </Link>
                    }
                  />
                ) : (
                  <EmptyState compact title="Sem trabalho recente para continuar." />
                )}
              </div>
            </WorkspaceSection>

            <WorkspaceSection>
              <SectionTitle
                icon={NotebookText}
                title="Dossiês ativos"
                description="Principais temas acompanhados neste momento."
              />
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {dossiesAtivos.map((dossie) => (
                  <EntityCard
                    key={dossie.titulo}
                    icon={NotebookText}
                    eyebrow={dossie.estado}
                    title={dossie.titulo}
                    description={dossie.detalhe}
                    meta={`Próximo passo: ${dossie.acao}`}
                  />
                ))}
              </div>
            </WorkspaceSection>

            <WorkspaceMetrics>
              <MetricCard
                icon={FileText}
                label="Documentos"
                value={docsProxima.length}
                description="Na próxima sessão"
              />
              <MetricCard
                icon={Siren}
                label="Em preparação"
                value={assembleiasEmPreparacao}
                description="Assembleias ativas"
              />
              <MetricCard
                icon={CheckCircle2}
                label="Concluídas"
                value={assembleiasConcluidas}
                description="No histórico"
              />
              <MetricCard
                icon={Landmark}
                label="Arquivadas"
                value={assembleiasArquivadas}
                description="Guardadas em histórico"
              />
            </WorkspaceMetrics>

            <WorkspaceSection>
              <SectionTitle
                icon={Clock3}
                title="Atividade recente"
                description="Últimos sinais de trabalho e atualização."
              />
              <div className="mt-5">
                <Timeline>
                  {atividadeMock.map((item) => (
                    <TimelineItem
                      key={item.titulo}
                      title={item.titulo}
                      description={item.descricao}
                      meta={item.meta}
                    />
                  ))}
                  {atividadeRecente.map((item) => (
                    <TimelineItem
                      key={item.id}
                      icon={Landmark}
                      title={item.nome}
                      description="Assembleia no histórico recente."
                      meta={formatarData(item.data)}
                    >
                      <Link
                        to="/assembleias/$id"
                        params={{ id: item.id }}
                        className="text-sm font-medium text-primary hover:text-primary/80"
                      >
                        Abrir assembleia
                      </Link>
                    </TimelineItem>
                  ))}
                </Timeline>
              </div>
            </WorkspaceSection>
          </WorkspaceLayout>
        </div>
      </main>
    </>
  );
}
