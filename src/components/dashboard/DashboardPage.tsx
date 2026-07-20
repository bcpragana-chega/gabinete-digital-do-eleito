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
  const agenda = useMemo(
    () =>
      [...assembleias]
        .filter(
          (assembleia) =>
            assembleia.estado !== "arquivada" &&
            assembleia.estado !== "concluida" &&
            new Date(`${assembleia.data}T${assembleia.hora || "00:00"}`) >= new Date(),
        )
        .sort((a, b) => `${a.data}T${a.hora}`.localeCompare(`${b.data}T${b.hora}`))
        .slice(0, 3),
    [assembleias],
  );
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
      <WorkspacePage>
        <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.85fr)]">
          <div className="min-w-0 space-y-4">
            {decision.state === "clear" ? (
              <ClearState />
            ) : (
              <>
                {decision.primaryAction && (
                  <PrimaryActionCard
                    action={decision.primaryAction}
                    documentToAnalyze={documentosParaOrganizar[0]}
                  />
                )}
                {decision.alerts.length > 0 && <AlertsSection alerts={decision.alerts} />}
                {decision.pendingItems.length > 0 && (
                  <PendingSection pendingItems={decision.pendingItems} />
                )}
              </>
            )}
          </div>

          <aside className="min-w-0 space-y-4">
            <NextSessionPanel session={proxima} />
            <AgendaPanel sessions={agenda} />
            <SubjectsPanel subjects={assuntosAtivos.slice(0, 4)} />
            <RecentDocumentsPanel documents={documentosRecentes} />
          </aside>
        </div>
      </WorkspacePage>
    </>
  );
}

function PrimaryActionCard({
  action,
  documentToAnalyze,
}: {
  action: TodayAction;
  documentToAnalyze?: Documento;
}) {
  return (
    <Card className="overflow-hidden border-primary/20 p-0">
      <div className="flex items-center gap-2 border-b border-border/80 bg-muted/25 px-4 py-2.5">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Próxima ação
        </p>
      </div>
      <div className="p-4 sm:p-5">
        <h2 className="text-lg font-semibold leading-6 text-foreground">{action.title}</h2>
        <p className="mt-1.5 max-w-2xl text-sm leading-5 text-muted-foreground">
          {action.explanation}
        </p>
        {action.context && (
          <p className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5" strokeWidth={1.75} />
            {action.context}
          </p>
        )}

        {action.id === "onboarding-subject" ? (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <NovoDossieDialog />
            <InstitutionalDocumentIntake
              triggerLabel="Analisar documentos"
              triggerVariant="secondary"
            />
          </div>
        ) : action.id === "onboarding-session" ? (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <InstitutionalDocumentIntake triggerLabel="Carregar convocatória" />
            <NovaSessaoWizard triggerLabel="Criar manualmente" />
          </div>
        ) : action.id.startsWith("organize-document-") && documentToAnalyze ? (
          <div className="mt-4 flex">
            <InstitutionalDocumentIntake
              documentoInicial={documentToAnalyze}
              triggerLabel="Analisar documentos"
            />
          </div>
        ) : (
          <Button asChild className="mt-4">
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
    <OperationalPanel title="Atenção" count={alerts.length} ariaId="today-alerts-title">
      <div className="divide-y divide-border/70">
        {alerts.map((alert) => (
          <a
            key={alert.id}
            href={alert.href}
            className="flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-muted/40"
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
    <OperationalPanel title="Depois" count={pendingItems.length} ariaId="today-pending-title">
      <div className="divide-y divide-border/70">
        {pendingItems.map((item) => (
          <a
            key={item.id}
            href={item.href}
            className="flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-muted/40"
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
    <Card className="flex items-start gap-3 border-status-concluida-foreground/15 bg-status-concluida/35 p-4">
      <CheckCircle2
        className="mt-0.5 h-4 w-4 shrink-0 text-status-concluida-foreground"
        strokeWidth={1.75}
      />
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-foreground">
          Não tens nada urgente neste momento.
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">O mandato está em dia.</p>
        <a
          href="/assuntos"
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-foreground hover:underline"
        >
          Consultar assuntos ativos
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
        </a>
      </div>
    </Card>
  );
}

function OperationalPanel({
  title,
  count,
  ariaId,
  children,
}: {
  title: string;
  count?: number;
  ariaId?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden p-0">
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

function NextSessionPanel({ session }: { session?: Assembleia }) {
  return (
    <OperationalPanel title="Próxima sessão">
      {session ? (
        <a
          href={`/sessoes/${encodeURIComponent(session.id)}`}
          className="block px-4 py-3 transition-colors duration-150 hover:bg-muted/40"
        >
          <p className="line-clamp-2 text-sm font-medium text-foreground">{session.nome}</p>
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
          </div>
        </a>
      ) : (
        <CompactEmptyState message="Ainda não existe uma próxima sessão agendada." />
      )}
    </OperationalPanel>
  );
}

function SubjectsPanel({ subjects }: { subjects: ReturnType<typeof useDossies> }) {
  return (
    <OperationalPanel title="Assuntos pendentes" count={subjects.length}>
      {subjects.length > 0 ? (
        <div className="divide-y divide-border/70">
          {subjects.map((subject) => (
            <a
              key={subject.id}
              href={`/assuntos/${encodeURIComponent(subject.id)}`}
              className="flex items-center gap-3 px-4 py-2.5 transition-colors duration-150 hover:bg-muted/40"
            >
              <NotebookText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                {subject.titulo}
              </span>
              <span className="text-[10px] text-muted-foreground">{subject.prioridade}</span>
            </a>
          ))}
        </div>
      ) : (
        <CompactEmptyState message="Sem assuntos pendentes." />
      )}
    </OperationalPanel>
  );
}

function AgendaPanel({ sessions }: { sessions: Assembleia[] }) {
  return (
    <OperationalPanel title="Agenda" count={sessions.length}>
      {sessions.length > 0 ? (
        <div className="divide-y divide-border/70">
          {sessions.map((session) => (
            <a
              key={session.id}
              href={`/sessoes/${encodeURIComponent(session.id)}`}
              className="flex items-center gap-3 px-4 py-2.5 transition-colors duration-150 hover:bg-muted/40"
            >
              <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-foreground">
                  {session.nome}
                </span>
                <span className="mt-0.5 block text-[10px] text-muted-foreground">
                  {formatCompactDate(session.data)} · {session.hora}
                </span>
              </span>
            </a>
          ))}
        </div>
      ) : (
        <CompactEmptyState message="Sem sessões futuras na agenda." />
      )}
    </OperationalPanel>
  );
}

function RecentDocumentsPanel({ documents }: { documents: Documento[] }) {
  return (
    <OperationalPanel title="Documentos recentes" count={documents.length}>
      {documents.length > 0 ? (
        <div className="divide-y divide-border/70">
          {documents.map((document) => (
            <a
              key={document.id}
              href={`/documentos/${encodeURIComponent(document.id)}?origem=biblioteca`}
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
            </a>
          ))}
        </div>
      ) : (
        <CompactEmptyState message="Ainda não existem documentos na Biblioteca." />
      )}
    </OperationalPanel>
  );
}

function CompactEmptyState({ message }: { message: string }) {
  return <p className="px-4 py-4 text-xs leading-5 text-muted-foreground">{message}</p>;
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
