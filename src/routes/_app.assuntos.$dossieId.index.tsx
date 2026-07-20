import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Activity,
  Archive,
  ArrowLeft,
  ChevronDown,
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
import { DossieAcompanhamentoSection } from "@/components/dossies/DossieAcompanhamentoSection";
import { SectionTitle, StatusBadge } from "@/components/ui/common";
import { EmptyState } from "@/components/ui/feedback";
import { Breadcrumb } from "@/components/ui/navigation";
import { Button } from "@/components/ui/button";
import { Timeline, TimelineItem } from "@/components/ui/timeline";
import { WorkspaceHeader, WorkspaceSection } from "@/components/ui/workspace";
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
import type { EstadoDossie, PrioridadeDossie } from "@/lib/types";

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

type MobileAreaProps = {
  id: string;
  title: string;
  children: ReactNode;
};

function MobileArea({ id, title, children }: MobileAreaProps) {
  const [aberta, setAberta] = useState(false);
  const painelId = `${id}-painel`;

  return (
    <div className="min-w-0 md:contents">
      <button
        type="button"
        aria-expanded={aberta}
        aria-controls={painelId}
        onClick={() => setAberta((atual) => !atual)}
        className="flex min-h-12 w-full items-center justify-between gap-3 border-b border-border px-1 py-3 text-left text-sm font-semibold text-foreground outline-none transition-colors hover:text-primary focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:hidden"
      >
        <span>{title}</span>
        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 transition-transform ${aberta ? "rotate-180" : ""}`}
        />
      </button>
      <div id={painelId} className={`min-w-0 md:contents ${aberta ? "" : "max-md:hidden"}`}>
        {children}
      </div>
    </div>
  );
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
        <main className="min-h-screen overflow-x-hidden bg-transparent">
          <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
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
  function renderAcao(acao: AcaoAssunto, principal = false) {
    if (acao.tipo === "editar") {
      return (
        <Button
          type="button"
          variant={principal ? "primary" : "secondary"}
          size="sm"
          onClick={() => document.getElementById("editar-assunto")?.click()}
        >
          {acao.label}
        </Button>
      );
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
      <main className="min-h-screen overflow-x-hidden bg-transparent">
        <div className="mx-auto max-w-[1280px] px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
          <div className="mb-4 hidden flex-wrap items-center justify-between gap-4 md:flex">
            <Breadcrumb items={[{ label: "Assuntos" }, { label: dossie.titulo }]} />
            <Button asChild variant="ghost" size="sm">
              <Link to="/assuntos">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar aos assuntos
              </Link>
            </Button>
          </div>

          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 md:hidden">
            <Link to="/assuntos">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>

          <WorkspaceHeader
            icon={NotebookText}
            eyebrow="Assunto"
            title={dossie.titulo}
            className="p-4 md:p-5"
            mobileCompact
            actions={
              <div className="flex w-full flex-wrap gap-2 md:w-auto md:justify-end">
                {!arquivado && (
                  <EditarDossieDialog
                    dossie={dossie}
                    triggerId="editar-assunto"
                    triggerClassName="max-md:min-w-0 max-md:flex-1"
                  />
                )}
                {!arquivado && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={aArquivar}
                    onClick={() => void arquivar()}
                    className="max-md:min-w-0 max-md:flex-1 md:w-auto"
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
                  <StatusBadge key={tag} tone="muted" dot={false} className="max-md:hidden">
                    {tag}
                  </StatusBadge>
                ))}
              </>
            }
          />

          {erroArquivo && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {erroArquivo}
            </p>
          )}

          <WorkspaceSection className="mt-4 border-l-2 border-l-primary p-4 md:p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Próxima ação
            </p>
            <div className="mt-3 grid min-w-0 gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
              <div className="min-w-0">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/80 bg-muted/40 text-muted-foreground sm:flex">
                    <Clock3 className="h-4 w-4" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="break-words font-display text-base font-semibold leading-6 text-foreground">
                      {estadoUx.titulo}
                    </h2>
                    <p className="mt-1 break-words text-sm leading-6 text-muted-foreground">
                      {estadoUx.descricao}
                    </p>
                    <p className="mt-3 text-sm font-medium text-foreground">
                      Situação atual: {estadoUx.estadoResumido}.
                    </p>
                    {estadoUx.recomendacoes.length > 0 && (
                      <ul className="mt-2 space-y-1 text-sm leading-6 text-muted-foreground">
                        {estadoUx.recomendacoes.map((recomendacao) => (
                          <li key={recomendacao} className="flex gap-2">
                            <span aria-hidden="true">•</span>
                            <span>{recomendacao}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row md:max-w-sm md:flex-wrap md:justify-end">
                <div className="max-md:[&>button]:w-full max-md:[&>a]:w-full">
                  {renderAcao(estadoUx.acaoPrincipal, true)}
                </div>
                {estadoUx.acoesSecundarias.map((acao) => (
                  <div
                    key={`${acao.tipo}-${acao.label}`}
                    className="max-md:[&>button]:w-full max-md:[&>a]:w-full"
                  >
                    {renderAcao(acao)}
                  </div>
                ))}
              </div>
            </div>
          </WorkspaceSection>

          <nav aria-label="Navegação nesta página" className="mt-3 hidden md:block">
            <ul className="flex flex-wrap gap-x-1 gap-y-2 border-b border-border pb-3">
              {[
                ["Visão geral", "#visao-geral"],
                ["Trabalho", "#trabalho-assunto"],
                ["Relações", "#relacoes-assunto"],
                ["Histórico", "#atividade-assunto"],
              ].map(([label, href]) => (
                <li key={href}>
                  <Button asChild variant="ghost" size="sm">
                    <a href={href}>{label}</a>
                  </Button>
                </li>
              ))}
            </ul>
          </nav>

          <WorkspaceSection id="visao-geral" className="mt-4 scroll-mt-24 p-4 md:p-5">
            <SectionTitle
              icon={FileText}
              title="Visão geral"
              description="O essencial sobre este tema de mandato."
            />
            <div className="mt-5 grid gap-5 md:grid-cols-2 md:gap-8">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground">Resumo</h3>
                <p className="mt-2 whitespace-pre-line break-words text-sm leading-7 text-muted-foreground">
                  {dossie.resumo || "Sem resumo registado."}
                </p>
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground">Objetivo</h3>
                <p className="mt-2 whitespace-pre-line break-words text-sm leading-7 text-muted-foreground">
                  {dossie.objetivoPolitico || "Sem objetivo político registado."}
                </p>
              </div>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">Estado</dt>
                <dd className="mt-1 text-sm font-medium text-foreground">
                  {estadoLabel(dossie.estado)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Prioridade</dt>
                <dd className="mt-1 text-sm font-medium text-foreground">{dossie.prioridade}</dd>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <dt className="text-xs text-muted-foreground">Última atualização</dt>
                <dd className="mt-1 text-sm font-medium text-foreground">{ultimaAtualizacao}</dd>
              </div>
            </dl>
          </WorkspaceSection>

          <section id="trabalho-assunto" className="mt-8 scroll-mt-24">
            <div className="mb-4 hidden md:block">
              <h2 className="font-display text-lg font-semibold text-foreground">Trabalho</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Documentos, notas e acompanhamento operacional deste assunto.
              </p>
            </div>
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <MobileArea id="area-trabalho" title="Trabalho">
                <div id="documentos-assunto" className="min-w-0 scroll-mt-24 md:order-1">
                  <DossieDocumentosCriadosSection dossieId={dossie.id} />
                </div>
                <div className="min-w-0 pt-4 md:order-3 md:col-span-2 md:pt-0">
                  <DossieAcompanhamentoSection dossieId={dossie.id} />
                </div>
              </MobileArea>
              <MobileArea id="area-notas" title="Notas">
                <div className="min-w-0 pt-4 md:order-2 md:pt-0">
                  <DossieNotasSection dossieId={dossie.id} />
                </div>
              </MobileArea>
            </div>
          </section>

          <section id="relacoes-assunto" className="mt-8 scroll-mt-24">
            <div className="mb-4 hidden md:block">
              <h2 className="font-display text-lg font-semibold text-foreground">Relações</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Ligações deste assunto a elementos institucionais.
              </p>
            </div>
            <MobileArea id="area-relacoes" title="Relações">
              <div className="min-w-0 pt-4 md:pt-0">
                <DossieRelacionadosSection dossieId={dossie.id} />
              </div>
            </MobileArea>
          </section>

          <section id="atividade-assunto" className="mt-8 scroll-mt-24">
            <div className="mb-4 hidden md:block">
              <h2 className="font-display text-lg font-semibold text-foreground">Histórico</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Acontecimentos e marcos técnicos ao longo da vida deste assunto.
              </p>
            </div>
            <MobileArea id="area-historico" title="Histórico">
              <div className="grid min-w-0 gap-4 pt-4 md:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] md:pt-0">
                <DossieTimelineSection dossieId={dossie.id} />
                <WorkspaceSection>
                  <SectionTitle
                    icon={Activity}
                    title="Marcos do assunto"
                    description="Criação, alterações e arquivo deste assunto."
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
              </div>
            </MobileArea>
          </section>
        </div>
      </main>
    </>
  );
}
