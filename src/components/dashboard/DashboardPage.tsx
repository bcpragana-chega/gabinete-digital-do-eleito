import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  MapPin,
  NotebookText,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { useProductHelpPageState } from "@/components/help/ProductHelpPageState";
import { NovaSessaoWizard } from "@/components/assembleias/NovaSessaoWizard";
import { InstitutionalDocumentIntake } from "@/components/documentos/InstitutionalDocumentIntake";
import { NovoDossieDialog } from "@/components/dossies/NovoDossieDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { WorkspacePage } from "@/components/ui/workspace";
import { useAssembleias } from "@/lib/assembleias-store";
import {
  listarDocumentosACriarDaAssembleia,
  subscreverDocumentosACriar,
} from "@/lib/documentos-a-criar-store";
import { useDocumentos } from "@/lib/documentos-store";
import { documentoGeraPendenciaHoje } from "@/lib/documentos-state";
import { useDossies } from "@/lib/dossies-store";
import {
  carregarPontosRemotosSeDisponivel,
  obterPontosDaAssembleia,
  type PontoOrdemTrabalhos,
} from "@/lib/pontos-store";
import { useAuth } from "@/lib/auth-store";
import { temProximaAcaoConvocatoria } from "@/lib/onboarding-state";
import { decideToday, type TodayAction, type TodayDecision } from "@/lib/today-decision";
import type { Assembleia, Documento, DocumentoCriado } from "@/lib/types";
import { useAcompanhamentos } from "@/lib/acompanhamentos-store";
import { ordenarAcompanhamentos } from "@/lib/acompanhamento-politico";

export function DashboardPage() {
  const { user } = useAuth();
  const assembleias = useAssembleias();
  const dossies = useDossies();
  const documentos = useDocumentos();
  const acompanhamentos = useAcompanhamentos();
  const proxima = useMemo(() => obterProximaAssembleia(assembleias), [assembleias]);
  const documentosDaProxima = useMemo(
    () => documentos.filter((documento) => documento.assembleiaId === proxima?.id),
    [documentos, proxima?.id],
  );
  const pontosDaProxima = usePontosDaAssembleia(proxima?.id);
  const documentosCriados = useDocumentosCriadosDaAssembleia(proxima?.id);
  const documentosParaOrganizar = useMemo(
    () =>
      documentos
        .filter(documentoGeraPendenciaHoje)
        .sort((a, b) => prioridadeDocumento(a) - prioridadeDocumento(b)),
    [documentos],
  );
  const documentosRecentes = useMemo(
    () =>
      [...documentos]
        .filter((documento) => !documento.archivedAt)
        .sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt))
        .slice(0, 4),
    [documentos],
  );
  const assuntosAtivos = useMemo(
    () => dossies.filter((dossie) => !dossie.archivedAt && dossie.estado !== "concluido"),
    [dossies],
  );
  const acompanhamentosAtuais = useMemo(() => {
    const porAssunto = new Map<string, (typeof acompanhamentos)[number]>();
    for (const evento of ordenarAcompanhamentos(acompanhamentos)) {
      if (!porAssunto.has(evento.assuntoId)) porAssunto.set(evento.assuntoId, evento);
    }
    return [...porAssunto.values()];
  }, [acompanhamentos]);

  const decision = useMemo(
    () =>
      decideToday({
        today: localDateKey(new Date()),
        onboardingRequired: temProximaAcaoConvocatoria(user?.id),
        activeSubjectCount: assuntosAtivos.length,
        registeredSessionCount: assembleias.length,
        documentsToOrganize: documentosParaOrganizar.map((documento) => ({
          id: documento.id,
          title: documento.titulo,
        })),
        politicalFollowUps: acompanhamentosAtuais.map((evento) => ({
          id: evento.id,
          subjectId: evento.assuntoId,
          subjectTitle:
            dossies.find((dossie) => dossie.id === evento.assuntoId)?.titulo ?? "Assunto",
          state: evento.estado,
          deadline: evento.prazo,
          nextActionAt: evento.proximaAcaoEm,
        })),
        nextSession: proxima
          ? {
              id: proxima.id,
              title: proxima.nome,
              date: proxima.data,
              time: proxima.hora,
              location: proxima.local,
              preparationComplete: proxima.preparacaoEstado === "pronta",
              documentsToReview: documentosDaProxima
                .filter(documentoGeraPendenciaHoje)
                .map((documento) => ({ id: documento.id, title: documento.titulo })),
              pendingPoints: pontosDaProxima
                .filter((ponto) => ponto.estado !== "Preparado")
                .map((ponto) => ({ id: ponto.id, number: ponto.numero, title: ponto.titulo })),
              documentsInProgress: documentosCriados
                .filter(
                  (documento) =>
                    documento.estado === "rascunho" || documento.estado === "em revisão",
                )
                .map((documento) => ({ id: documento.id, title: documento.titulo })),
              followUps: [],
            }
          : undefined,
      }),
    [
      assembleias.length,
      assuntosAtivos.length,
      acompanhamentosAtuais,
      dossies,
      documentosCriados,
      documentosDaProxima,
      documentosParaOrganizar,
      pontosDaProxima,
      proxima,
      user?.id,
    ],
  );

  useProductHelpPageState({
    emptyState: decision.state === "clear",
    primaryAction: decision.primaryAction?.label,
    currentStatus: helpStatus(decision),
    nextStep: decision.primaryAction?.label,
    visibleWarnings:
      decision.alerts.length > 0 ? decision.alerts.map((alert) => alert.title) : undefined,
    summaryFacts: [
      decision.primaryAction
        ? `Próxima ação: ${decision.primaryAction.title}`
        : "Sem trabalho relevante neste momento",
      `${decision.alerts.length} alertas reais`,
      `${decision.pendingItems.length} pendências secundárias`,
    ],
  });

  return (
    <>
      <TopBar showUtilities={false} />
      <WorkspacePage contentClassName="overflow-x-hidden">
        {decision.state !== "clear" && <MobileTodayContext decision={decision} />}

        <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.85fr)]">
          <div className="min-w-0 space-y-4">
            {decision.state === "clear" ? (
              <ClearState />
            ) : (
              decision.primaryAction && (
                <PrimaryActionCard
                  action={decision.primaryAction}
                  documentToAnalyze={documentosParaOrganizar[0]}
                  critical={decision.state === "critical"}
                />
              )
            )}
          </div>

          {proxima && (
            <div className="hidden min-w-0 md:block">
              <NextSessionPanel session={proxima} />
            </div>
          )}
        </div>

        <div className="mt-4 grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.85fr)]">
          <div className="min-w-0 space-y-4">
            {decision.alerts.length > 0 && <AlertsSection alerts={decision.alerts} />}
            {decision.pendingItems.length > 0 && (
              <PendingSection pendingItems={decision.pendingItems} />
            )}
          </div>

          {(assuntosAtivos.length > 0 || documentosRecentes.length > 0) && (
            <aside className="hidden min-w-0 space-y-4 md:block">
              {assuntosAtivos.length > 0 && <SubjectsPanel subjects={assuntosAtivos.slice(0, 4)} />}
              {documentosRecentes.length > 0 && (
                <RecentDocumentsPanel documents={documentosRecentes} />
              )}
            </aside>
          )}
        </div>
      </WorkspacePage>
    </>
  );
}

function MobileTodayContext({ decision }: { decision: TodayDecision }) {
  const context =
    decision.primaryAction?.context ??
    (decision.state === "critical"
      ? "Há trabalho prioritário que precisa da tua atenção."
      : decision.state === "onboarding"
        ? "Vamos preparar o essencial para começares."
        : "Há uma próxima ação pronta para avançar.");

  return (
    <p
      className="max-w-prose text-sm leading-5 text-muted-foreground md:hidden"
      data-mobile-today-context
    >
      {context}
    </p>
  );
}

function PrimaryActionCard({
  action,
  documentToAnalyze,
  critical,
}: {
  action: TodayAction;
  documentToAnalyze?: Documento;
  critical: boolean;
}) {
  return (
    <Card
      className={`overflow-hidden p-0 shadow-sm md:border-primary/35 md:bg-primary/[0.025] md:shadow-md ${
        critical
          ? "border-l-4 border-l-status-alerta-foreground/70 bg-status-alerta/15"
          : "border-border/80 bg-card"
      }`}
      data-today-primary-action
      data-state={critical ? "critical" : "standard"}
      aria-labelledby="today-primary-action-title"
    >
      <div className="flex items-center gap-2 border-b border-border/70 px-4 py-2.5 md:border-primary/15 md:bg-primary/[0.06] md:px-5 md:py-3">
        <span
          className={`h-2 w-2 rounded-full ${
            critical ? "bg-status-alerta-foreground" : "bg-primary"
          }`}
          aria-hidden="true"
        />
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {critical ? "Ação prioritária" : "Próxima ação"}
        </p>
      </div>
      <div className="p-4 md:p-6">
        <h2
          id="today-primary-action-title"
          className="text-xl font-semibold leading-7 text-foreground md:text-2xl"
        >
          {action.title}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          {action.explanation}
        </p>
        {action.context && (
          <p className="mt-3 hidden items-center gap-2 text-xs text-muted-foreground md:inline-flex">
            <Clock3 className="h-3.5 w-3.5" strokeWidth={1.75} />
            {action.context}
          </p>
        )}

        {action.id === "onboarding-subject" ? (
          <div className="mt-4 flex w-full flex-col gap-2 sm:flex-row [&_button]:min-h-11 [&_button]:w-full sm:[&_button]:w-auto">
            <NovoDossieDialog />
            <InstitutionalDocumentIntake
              triggerLabel="Analisar documentos"
              triggerVariant="secondary"
            />
          </div>
        ) : action.id === "onboarding-session" ? (
          <div className="mt-4 flex w-full flex-col gap-2 sm:flex-row [&_button]:min-h-11 [&_button]:w-full sm:[&_button]:w-auto">
            <InstitutionalDocumentIntake triggerLabel="Carregar convocatória" />
            <NovaSessaoWizard triggerLabel="Criar manualmente" />
          </div>
        ) : action.id.startsWith("organize-document-") && documentToAnalyze ? (
          <div className="mt-4 flex w-full [&_button]:min-h-11 [&_button]:w-full sm:[&_button]:w-auto">
            <InstitutionalDocumentIntake
              documentoInicial={documentToAnalyze}
              triggerLabel="Analisar documentos"
            />
          </div>
        ) : (
          <Button asChild className="mt-4 min-h-11 w-full sm:w-auto">
            <a href={action.href}>
              {action.label}
              <ArrowRight className="h-4 w-4" strokeWidth={1.85} />
            </a>
          </Button>
        )}
      </div>
    </Card>
  );
}

function AlertsSection({ alerts }: { alerts: TodayDecision["alerts"] }) {
  return (
    <OperationalPanel
      title="Atenção"
      count={alerts.length}
      ariaId="today-alerts-title"
      dataAttribute="today-alerts"
    >
      <div className="divide-y divide-border/70">
        {alerts.map((alert) => (
          <a
            key={alert.id}
            href={alert.href}
            className="flex min-h-11 items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/30"
          >
            <AlertTriangle
              className="h-4 w-4 shrink-0 text-status-alerta-foreground"
              strokeWidth={1.75}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{alert.title}</p>
              <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted-foreground">
                {alert.explanation}
              </p>
            </div>
            <span className="hidden shrink-0 text-xs font-medium text-foreground sm:block">
              {alert.label}
            </span>
          </a>
        ))}
      </div>
    </OperationalPanel>
  );
}

function PendingSection({ pendingItems }: { pendingItems: TodayDecision["pendingItems"] }) {
  return (
    <OperationalPanel
      title="Depois"
      count={pendingItems.length}
      ariaId="today-pending-title"
      dataAttribute="today-pending"
    >
      <div className="divide-y divide-border/70">
        {pendingItems.map((item) => (
          <a
            key={item.id}
            href={item.href}
            className="flex min-h-11 items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/30"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{item.title}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.explanation}</p>
            </div>
            <span className="hidden shrink-0 text-xs font-medium text-foreground sm:block">
              {item.label}
            </span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          </a>
        ))}
      </div>
    </OperationalPanel>
  );
}

function ClearState() {
  return (
    <Card
      className="flex items-start gap-3 border-status-concluida-foreground/15 bg-status-concluida/35 p-4 shadow-none md:shadow-card"
      data-today-clear
    >
      <CheckCircle2
        className="mt-0.5 h-4 w-4 shrink-0 text-status-concluida-foreground"
        strokeWidth={1.75}
      />
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-foreground">
          Não tens nada urgente neste momento
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">O mandato está em dia.</p>
        <Link
          to="/assuntos"
          className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-md text-xs font-medium text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
        >
          Consultar assuntos ativos
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
        </Link>
      </div>
    </Card>
  );
}

function OperationalPanel({
  title,
  count,
  ariaId,
  dataAttribute,
  children,
}: {
  title: string;
  count?: number;
  ariaId?: string;
  dataAttribute?: "today-alerts" | "today-pending";
  children: React.ReactNode;
}) {
  return (
    <Card
      className="overflow-hidden p-0 shadow-none md:shadow-card"
      data-section={dataAttribute}
      aria-labelledby={ariaId}
    >
      <div className="flex h-10 items-center justify-between border-b border-border/80 px-4">
        <h2 id={ariaId} className="text-xs font-semibold text-foreground">
          {title}
        </h2>
        {typeof count === "number" && (
          <span className="text-[11px] tabular-nums text-muted-foreground">{count}</span>
        )}
      </div>
      {children}
    </Card>
  );
}

function NextSessionPanel({ session }: { session: Assembleia }) {
  const preparada = session.preparacaoEstado === "pronta";

  return (
    <OperationalPanel title="Próxima sessão">
      <div className="px-4 py-4">
        <p className="line-clamp-2 text-sm font-semibold text-foreground">{session.nome}</p>
        <div className="mt-2 space-y-1.5 text-xs text-muted-foreground">
          <p className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatCompactDate(session.data)} · {session.hora}
          </p>
          {session.local && (
            <p className="flex items-center gap-2 truncate">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{session.local}</span>
            </p>
          )}
          <p className="flex items-center gap-2 pt-1 font-medium text-foreground">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {preparada ? "Preparação concluída" : "Preparação em curso"}
          </p>
        </div>
        <Link
          to="/sessoes/$id/preparacao"
          params={{ id: session.id }}
          className="mt-4 inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          {preparada ? "Abrir preparação" : "Continuar preparação"}
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
        </Link>
      </div>
    </OperationalPanel>
  );
}

function SubjectsPanel({ subjects }: { subjects: ReturnType<typeof useDossies> }) {
  return (
    <OperationalPanel title="Assuntos pendentes" count={subjects.length}>
      <div className="divide-y divide-border/70">
        {subjects.map((subject) => (
          <Link
            key={subject.id}
            to="/assuntos/$dossieId"
            params={{ dossieId: subject.id }}
            className="flex items-center gap-3 px-4 py-2.5 transition-colors duration-150 hover:bg-muted/40"
          >
            <NotebookText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
              {subject.titulo}
            </span>
            <span className="text-[10px] text-muted-foreground">{subject.prioridade}</span>
          </Link>
        ))}
      </div>
    </OperationalPanel>
  );
}

function RecentDocumentsPanel({ documents }: { documents: Documento[] }) {
  return (
    <OperationalPanel title="Documentos recentes" count={documents.length}>
      <div className="divide-y divide-border/70">
        {documents.map((document) => (
          <Link
            key={document.id}
            to="/documentos/$documentoId"
            params={{ documentoId: document.id }}
            search={{ origem: "biblioteca" }}
            className="flex items-center gap-3 px-4 py-2.5 transition-colors duration-150 hover:bg-muted/40"
          >
            <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium text-foreground">
                {document.titulo}
              </span>
              <span className="mt-0.5 block text-[10px] text-muted-foreground">
                {formatCompactDate(document.updatedAt ?? document.createdAt)}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </OperationalPanel>
  );
}

function formatCompactDate(value: string) {
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value);
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short" }).format(date);
}

function helpStatus(decision: TodayDecision) {
  if (decision.state === "clear") return "O mandato está em dia";
  if (decision.state === "critical") return "Existe uma ação crítica comprovada";
  if (decision.primaryAction?.id === "onboarding-subject") {
    return "É necessário começar o acompanhamento do mandato";
  }
  if (decision.state === "onboarding") return "É útil preparar a próxima sessão";
  return "Existe uma próxima ação recomendada";
}

function usePontosDaAssembleia(assembleiaId?: string) {
  const [pontos, setPontos] = useState<PontoOrdemTrabalhos[]>([]);

  useEffect(() => {
    if (!assembleiaId) {
      setPontos([]);
      return;
    }

    const atualizar = () => setPontos(obterPontosDaAssembleia(assembleiaId));
    atualizar();
    void carregarPontosRemotosSeDisponivel().then(atualizar);
    window.addEventListener("tribuno:pontos", atualizar);
    window.addEventListener("storage", atualizar);

    return () => {
      window.removeEventListener("tribuno:pontos", atualizar);
      window.removeEventListener("storage", atualizar);
    };
  }, [assembleiaId]);

  return pontos;
}

function useDocumentosCriadosDaAssembleia(assembleiaId?: string) {
  const [documentos, setDocumentos] = useState<DocumentoCriado[]>([]);

  useEffect(() => {
    if (!assembleiaId) {
      setDocumentos([]);
      return;
    }

    const atualizar = () => setDocumentos(listarDocumentosACriarDaAssembleia(assembleiaId));
    atualizar();
    return subscreverDocumentosACriar(atualizar);
  }, [assembleiaId]);

  return documentos;
}

function obterProximaAssembleia(assembleias: Assembleia[]) {
  const agora = new Date();
  return assembleias
    .filter((assembleia) => assembleia.estado !== "concluida" && assembleia.estado !== "arquivada")
    .filter((assembleia) => new Date(`${assembleia.data}T${assembleia.hora || "00:00"}`) >= agora)
    .sort((a, b) => `${a.data}T${a.hora}`.localeCompare(`${b.data}T${b.hora}`))[0];
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function prioridadeDocumento(documento: Documento) {
  if (documento.estado === "Por rever" && documento.importante) return 0;
  if (documento.estado === "Por rever") return 1;
  return documento.importante ? 2 : 3;
}
