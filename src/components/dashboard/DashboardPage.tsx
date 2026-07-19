import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, CalendarCheck2, CheckCircle2, Clock3 } from "lucide-react";
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

export function DashboardPage() {
  const { user } = useAuth();
  const assembleias = useAssembleias();
  const dossies = useDossies();
  const documentos = useDocumentos();
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
  const assuntosAtivos = useMemo(
    () => dossies.filter((dossie) => !dossie.archivedAt && dossie.estado !== "concluido"),
    [dossies],
  );

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
              followUps: documentosCriados
                .filter(
                  (documento) =>
                    documento.estado === "apresentado" &&
                    (documento.tipo === "Recomendação" || documento.tipo === "Requerimento"),
                )
                .map((documento) => ({ id: documento.id, title: documento.titulo })),
            }
          : undefined,
      }),
    [
      assembleias.length,
      assuntosAtivos.length,
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
      <TopBar />
      <WorkspacePage>
        <div className="mx-auto w-full max-w-4xl space-y-5">
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
    <Card className="relative overflow-hidden rounded-[14px] border-0 bg-[#082f49] p-6 text-white shadow-[0_18px_55px_rgba(5,31,49,0.18)] sm:p-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_10%,rgba(74,222,128,0.16),transparent_28%),linear-gradient(135deg,#031d2e_0%,#073754_58%,#04243a_100%)]" />
      <CalendarCheck2
        className="absolute -bottom-8 right-2 h-44 w-44 text-white/10"
        strokeWidth={1}
      />
      <div className="relative z-10 max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#48d678]">
          O que fazer agora
        </p>
        <h2 className="mt-3 text-2xl font-semibold leading-tight text-white sm:text-[2rem]">
          {action.title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-white/78">{action.explanation}</p>
        {action.context && (
          <p className="mt-4 inline-flex items-center gap-2 text-sm text-white/88">
            <Clock3 className="h-4 w-4" strokeWidth={1.8} />
            {action.context}
          </p>
        )}

        {action.id === "onboarding-subject" ? (
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <NovoDossieDialog />
            <InstitutionalDocumentIntake
              triggerLabel="Analisar documentos"
              triggerVariant="secondary"
            />
          </div>
        ) : action.id === "onboarding-session" ? (
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <InstitutionalDocumentIntake triggerLabel="Carregar convocatória" />
            <NovaSessaoWizard triggerLabel="Criar manualmente" />
          </div>
        ) : action.id.startsWith("organize-document-") && documentToAnalyze ? (
          <div className="mt-6 flex">
            <InstitutionalDocumentIntake
              documentoInicial={documentToAnalyze}
              triggerLabel="Analisar documentos"
            />
          </div>
        ) : (
          <Button
            asChild
            size="lg"
            className="mt-6 h-12 rounded-xl bg-white px-7 text-sm font-semibold text-[#071127] hover:bg-white/92"
          >
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
    <section aria-labelledby="today-alerts-title">
      <h2 id="today-alerts-title" className="mb-3 text-xs font-semibold uppercase text-[#173354]">
        Atenção
      </h2>
      <div className="space-y-2">
        {alerts.map((alert) => (
          <a
            key={alert.id}
            href={alert.href}
            className="flex items-center gap-3 rounded-xl border border-[#f7e0ce] bg-[#fff8f1] p-4 transition-colors hover:bg-[#fff4e8]"
          >
            <AlertTriangle className="h-5 w-5 shrink-0 text-[#e76800]" strokeWidth={1.9} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#071127]">{alert.title}</p>
              <p className="mt-1 text-xs leading-5 text-[#536682]">{alert.explanation}</p>
            </div>
            <span className="hidden shrink-0 text-sm font-semibold text-[#005fd6] sm:block">
              {alert.label}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}

function PendingSection({ pendingItems }: { pendingItems: TodayDecision["pendingItems"] }) {
  return (
    <section aria-labelledby="today-pending-title">
      <h2 id="today-pending-title" className="mb-3 text-xs font-semibold uppercase text-[#173354]">
        Depois
      </h2>
      <Card className="divide-y divide-[#e4ebf4] overflow-hidden rounded-[14px] border-[#dfe7f2] bg-white p-0 shadow-[0_8px_28px_rgba(15,23,42,0.035)]">
        {pendingItems.map((item) => (
          <a
            key={item.id}
            href={item.href}
            className="flex items-center gap-3 px-4 py-4 transition-colors hover:bg-[#f8fbff] sm:px-5"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0 text-[#536682]" strokeWidth={1.7} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#071127]">{item.title}</p>
              <p className="mt-1 truncate text-xs text-[#536682]">{item.explanation}</p>
            </div>
            <span className="hidden shrink-0 text-sm font-semibold text-[#005fd6] sm:block">
              {item.label}
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-[#536682]" strokeWidth={1.8} />
          </a>
        ))}
      </Card>
    </section>
  );
}

function ClearState() {
  return (
    <Card className="rounded-[14px] border-[#d7eadf] bg-[#f3fbf6] p-8 text-center shadow-[0_8px_28px_rgba(15,23,42,0.035)] sm:p-12">
      <CheckCircle2 className="mx-auto h-10 w-10 text-[#16a765]" strokeWidth={1.7} />
      <h2 className="mt-4 text-xl font-semibold text-[#071127]">
        Não tens nada urgente neste momento.
      </h2>
      <p className="mt-2 text-sm text-[#536682]">O mandato está em dia.</p>
      <a
        href="/assuntos"
        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#005fd6]"
      >
        Consultar assuntos ativos
        <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
      </a>
    </Card>
  );
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
