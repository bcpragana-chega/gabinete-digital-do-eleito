import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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
import { DossieDocumentosCriadosSection } from "@/components/dossies/DossieDocumentosCriadosSection";
import { DossieNotasSection } from "@/components/dossies/DossieNotasSection";
import { DossieRelacionadosSection } from "@/components/dossies/DossieRelacionadosSection";
import { DossieTimelineSection } from "@/components/dossies/DossieTimelineSection";
import { ActionCard, InfoCard } from "@/components/ui/cards";
import { SectionTitle, StatusBadge } from "@/components/ui/common";
import { EmptyState } from "@/components/ui/feedback";
import { Breadcrumb } from "@/components/ui/navigation";
import { Button } from "@/components/ui/button";
import { Timeline, TimelineItem } from "@/components/ui/timeline";
import { WorkspaceHeader, WorkspaceLayout, WorkspaceSection } from "@/components/ui/workspace";
import { arquivarDossie, useDossie } from "@/lib/dossies-store";
import { useNotasDossie } from "@/lib/dossie-notas-store";
import { useEventosTimelineDossie } from "@/lib/dossie-timeline-store";
import { useDocumentosDoDossie } from "@/lib/dossie-documentos-store";
import { useAssembleiasDoDossie } from "@/lib/dossie-assembleias-store";
import {
  listarDocumentosACriarDoAssunto,
  subscreverDocumentosACriar,
} from "@/lib/documentos-a-criar-store";
import { calcularEstadoUxAssunto, type AcaoAssunto } from "@/lib/assunto-ux";
import type { DocumentoCriado } from "@/lib/types";
import type { Dossie, EstadoDossie, PrioridadeDossie } from "@/lib/types";

export const Route = createFileRoute("/_app/assuntos/$dossieId/")({
  head: () => ({
    meta: [
      { title: "Assunto — Tribuno" },
      {
        name: "description",
        content: "Assunto acompanhado ao longo do mandato.",
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

function DossieDetalhePage() {
  const { dossieId } = Route.useParams();
  const dossie = useDossie(dossieId);
  const notas = useNotasDossie(dossieId);
  const eventos = useEventosTimelineDossie(dossieId);
  const documentosRelacionados = useDocumentosDoDossie(dossieId);
  const sessoes = useAssembleiasDoDossie(dossieId);
  const [documentosCriados, setDocumentosCriados] = useState<DocumentoCriado[]>([]);
  const [aArquivar, setAArquivar] = useState(false);
  const [erroArquivo, setErroArquivo] = useState("");
  const arquivoEmCurso = useRef(false);

  useEffect(() => {
    const atualizar = () => setDocumentosCriados(listarDocumentosACriarDoAssunto(dossieId));
    atualizar();
    return subscreverDocumentosACriar(atualizar);
  }, [dossieId]);

  if (!dossie) {
    return (
      <>
        <TopBar breadcrumb="Assunto" />
        <main className="min-h-screen bg-transparent">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
            <Button asChild variant="ghost" size="sm" className="mb-6">
              <Link to="/assuntos">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar aos assuntos
              </Link>
            </Button>
            <EmptyState
              title="Assunto não encontrado"
              description="Não foi possível encontrar este assunto. Pode ter sido removido ou já não estar disponível."
              action={
                <Button asChild>
                  <Link to="/assuntos">Ir para Assuntos</Link>
                </Button>
              }
            />
          </div>
        </main>
      </>
    );
  }

  async function arquivar() {
    if (!dossie || dossie.archivedAt || arquivoEmCurso.current) return;

    const confirmado = window.confirm(`Arquivar o assunto "${dossie.titulo}"?`);
    if (!confirmado) return;
    arquivoEmCurso.current = true;
    setAArquivar(true);
    setErroArquivo("");
    try {
      await arquivarDossie(dossie.id);
    } catch {
      setErroArquivo("Não foi possível arquivar o assunto. Tenta novamente.");
    } finally {
      arquivoEmCurso.current = false;
      setAArquivar(false);
    }
  }

  const arquivado = Boolean(dossie.archivedAt);
  const ultimaAtualizacao = formatarData(dossie.updatedAt ?? dossie.createdAt);
  const estadoUx = calcularEstadoUxAssunto({
    assuntoId: dossie.id,
    objetivoPolitico: dossie.objetivoPolitico,
    resumo: dossie.resumo,
    estado: dossie.estado,
    totalNotas: notas.length,
    totalEventos: eventos.length,
    totalDocumentosRelacionados: documentosRelacionados.length,
    sessoesIds: sessoes.map((relacao) => relacao.assembleiaId),
    documentosCriados,
  });
  const dossieAtual = dossie;

  function renderAcao(acao: AcaoAssunto, principal = false) {
    if (acao.tipo === "editar") {
      return <EditarDossieDialog dossie={dossieAtual} triggerLabel={acao.label} />;
    }

    return (
      <Button asChild variant={principal ? "primary" : "secondary"} size="sm">
        <a href={acao.href}>{acao.label}</a>
      </Button>
    );
  }

  return (
    <>
      <TopBar breadcrumb="Assunto" />
      <main className="min-h-screen bg-transparent">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <Breadcrumb items={[{ label: "Assuntos" }, { label: dossie.titulo }]} />
            <Button asChild variant="ghost" size="sm">
              <Link to="/assuntos">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar aos assuntos
              </Link>
            </Button>
          </div>

          <WorkspaceLayout
            header={
              <WorkspaceHeader
                icon={NotebookText}
                eyebrow="Assunto"
                title={dossie.titulo}
                description="Tema acompanhado ao longo do mandato, com notas, histórico e ligações."
                className="p-4 sm:p-7"
                actions={
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
                    {!arquivado && <EditarDossieDialog dossie={dossie} />}
                    {!arquivado && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={aArquivar}
                        onClick={() => void arquivar()}
                        className="w-full sm:w-auto"
                      >
                        <Archive className="mr-2 h-4 w-4" />
                        {aArquivar ? "A guardar…" : "Arquivar"}
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
                    description="Síntese determinística do estado atual."
                  />
                  <div className="mt-5 space-y-3">
                    <InfoCard
                      title="Leitura do Tribuno"
                      description={`Este assunto está com ${estadoUx.estadoResumido}.`}
                    />
                    {estadoUx.recomendacoes.length > 0 && (
                      <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
                        {estadoUx.recomendacoes.map((recomendacao) => (
                          <li key={recomendacao}>• {recomendacao}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </WorkspaceSection>

                <WorkspaceSection>
                  <SectionTitle icon={Clock3} title="Estado do assunto" />
                  <div className="mt-5 space-y-3">
                    <InfoCard title="Última atualização" description={ultimaAtualizacao} />
                    <InfoCard
                      title="Memória do assunto"
                      description="Notas, acontecimentos e ligações guardam o histórico do tema."
                    />
                  </div>
                </WorkspaceSection>
              </>
            }
          >
            {erroArquivo && (
              <p role="alert" className="mt-4 text-sm text-destructive">
                {erroArquivo}
              </p>
            )}

            <div id="documentos-assunto" className="scroll-mt-24">
              <DossieDocumentosCriadosSection dossieId={dossie.id} />
            </div>

            <WorkspaceSection id="contexto-assunto" className="scroll-mt-24">
              <SectionTitle
                icon={Activity}
                title="Estado do assunto"
                description="Como está este tema neste momento."
              />
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <InfoCard title="Estado" description={estadoLabel(dossie.estado)} />
                <InfoCard title="Prioridade" description={dossie.prioridade} />
                <InfoCard title="Última atividade" description={ultimaAtualizacao} />
              </div>
            </WorkspaceSection>

            <WorkspaceSection>
              <SectionTitle
                icon={FileText}
                title="Resumo"
                description="O essencial sobre este tema de mandato."
              />
              <p className="mt-5 whitespace-pre-line text-sm leading-7 text-muted-foreground">
                {dossie.resumo || "Sem resumo registado."}
              </p>
            </WorkspaceSection>

            <WorkspaceSection>
              <SectionTitle
                icon={CheckCircle2}
                title="Objetivo"
                description="O que pretende acompanhar, resolver ou defender."
              />
              <p className="mt-5 whitespace-pre-line text-sm leading-7 text-muted-foreground">
                {dossie.objetivoPolitico || "Sem objetivo político registado."}
              </p>
            </WorkspaceSection>

            <WorkspaceSection>
              <SectionTitle
                icon={Clock3}
                title="Seguimento do assunto"
                description="Outras formas de manter este tema atualizado."
              />
              <div className="mt-5">
                <ActionCard
                  icon={Clock3}
                  title={estadoUx.titulo}
                  description={estadoUx.descricao}
                  action={
                    <div className="flex flex-col gap-2 sm:flex-row">
                      {renderAcao(estadoUx.acaoPrincipal, true)}
                      {estadoUx.acoesSecundarias.map((acao) => (
                        <span key={`${acao.tipo}-${acao.label}`}>{renderAcao(acao)}</span>
                      ))}
                    </div>
                  }
                />
              </div>
            </WorkspaceSection>

            <div id="relacoes-assunto" className="scroll-mt-24">
              <DossieRelacionadosSection dossieId={dossie.id} />
            </div>

            <DossieNotasSection dossieId={dossie.id} />

            <div id="atividade-assunto" className="scroll-mt-24">
              <DossieTimelineSection dossieId={dossie.id} />
            </div>

            <WorkspaceSection>
              <SectionTitle
                icon={Activity}
                title="Última atividade"
                description="Últimos sinais registados neste tema."
              />
              <Timeline className="mt-5">
                {dossie.updatedAt && (
                  <TimelineItem
                    icon={Activity}
                    title="Assunto atualizado"
                    description="Os dados principais deste assunto foram alterados."
                    meta={formatarData(dossie.updatedAt)}
                  />
                )}
                {dossie.archivedAt && (
                  <TimelineItem
                    icon={Archive}
                    title="Assunto arquivado"
                    description="O assunto deixou de estar ativo na lista principal."
                    meta={formatarData(dossie.archivedAt)}
                  />
                )}
                <TimelineItem
                  icon={NotebookText}
                  title="Assunto criado"
                  description="Espaço criado para acompanhar este tema."
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
