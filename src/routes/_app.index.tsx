import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  Bot,
  Calendar,
  Check,
  ChevronRight,
  Clock3,
  FileCheck2,
  FilePlus2,
  FileText,
  Folder,
  Landmark,
  ListFilter,
  MapPin,
  Mic2,
  Plus,
  Search,
  Square,
  Timer,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAssembleias } from "@/lib/assembleias-store";
import {
  listarDocumentosACriarDaAssembleia,
  subscreverDocumentosACriar,
} from "@/lib/documentos-a-criar-store";
import { useDocumentos, useDocumentosDaAssembleia } from "@/lib/documentos-store";
import { useDossies } from "@/lib/dossies-store";
import { formatarData } from "@/lib/mock-data";
import {
  carregarPontosRemotosSeDisponivel,
  obterPontosDaAssembleia,
  type PontoOrdemTrabalhos,
} from "@/lib/pontos-store";
import { cn } from "@/lib/utils";
import type { Assembleia, Documento, DocumentoCriado, Dossie } from "@/lib/types";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [
      { title: "Hoje — Tribuno" },
      {
        name: "description",
        content: "O que precisa de fazer hoje: sessões, documentos e assuntos importantes.",
      },
      { property: "og:title", content: "Hoje — Tribuno" },
      {
        property: "og:description",
        content: "Apoio ao mandato para eleitos locais em Portugal.",
      },
    ],
  }),
  component: GabinetePage,
});

type TaskTone = "orange" | "red" | "green" | "blue" | "slate";
type AlertTone = "red" | "orange" | "yellow" | "green";

type TaskItem = {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  tone: TaskTone;
  icon: LucideIcon;
  to: string;
  params?: Record<string, string>;
};

type AlertItem = {
  id: string;
  title: string;
  subtitle: string;
  tone: AlertTone;
  icon: LucideIcon;
  to: string;
  params?: Record<string, string>;
};

type PriorityMission = {
  title: string;
  text: string;
  button: string;
  to: string;
  params?: Record<string, string>;
  dueDate?: string;
  indicator: "deadline" | "now" | "priority";
  progress: number;
  meta: Array<{ icon: LucideIcon; text: string }>;
};

function GabinetePage() {
  const assembleias = useAssembleias();
  const documentos = useDocumentos();
  const dossies = useDossies();

  const ativas = useMemo(
    () => assembleias.filter((assembleia) => assembleia.estado !== "arquivada"),
    [assembleias],
  );
  const proxima = useMemo(() => obterProximaAssembleia(ativas), [ativas]);
  const documentosDaProxima = useDocumentosDaAssembleia(proxima?.id ?? "");
  const pontosDaProxima = usePontosDaAssembleia(proxima?.id);
  const rascunhosDaProxima = useDocumentosCriadosDaAssembleia(proxima?.id);

  const dossiesAtivos = useMemo(() => dossies.filter((dossie) => !dossie.archivedAt), [dossies]);
  const documentosPorRever = documentosDaProxima.filter(
    (documento) => documento.estado === "Por rever" || documento.estado === "Importante",
  );
  const documentosGlobaisPorRever = documentos.filter(
    (documento) => documento.estado === "Por rever" || documento.estado === "Importante",
  );
  const pontosPorPreparar = pontosDaProxima.filter((ponto) => ponto.estado !== "Preparado");
  const rascunhosAbertos = rascunhosDaProxima.filter(
    (documento) => documento.estado === "rascunho" || documento.estado === "em revisão",
  );

  const tasks = criarTarefas({
    proxima,
    documentosPorRever,
    pontosPorPreparar,
    rascunhosAbertos,
    dossiesAtivos,
  });
  const alerts = criarAlertas({
    proxima,
    documentosPorRever,
    rascunhosAbertos,
    dossiesAtivos,
  });
  const progress = calcularProgressoPreparacao({
    proxima,
    documentosDaProxima,
    pontosDaProxima,
    rascunhosDaProxima,
  });
  const mission = criarMissaoPrioritaria({
    proxima,
    assembleias: ativas,
    documentos,
    documentosPorRever: documentosGlobaisPorRever,
    pontosPorPreparar,
    rascunhosAbertos,
    progress,
  });
  const metrics = criarMetricas({ ativas, documentos, rascunhosDaProxima, dossies });
  const activity = criarAtividade({ documentos, rascunhosDaProxima, dossiesAtivos });

  return (
    <>
      <TopBar />
      <main className="min-h-screen bg-[#fbfcfe]">
        <div className="mx-auto flex max-w-[1504px] flex-col gap-5 px-4 pb-6 pt-4 sm:px-6 lg:px-8">
          <AnalysisBanner opportunities={Math.max(tasks.length - 1, 0)} proxima={proxima} />

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.38fr)_minmax(360px,0.98fr)_minmax(330px,0.86fr)]">
            <MissionCard
              mission={mission}
              documentosPorRever={documentosGlobaisPorRever.length}
              pontosPorPreparar={pontosPorPreparar.length}
              rascunhosAbertos={rascunhosAbertos.length}
            />
            <TasksCard tasks={tasks} />
            <AlertsCard alerts={alerts} />
          </section>

          <MetricsCard metrics={metrics} />

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.91fr)_320px]">
            <ActivityCard activity={activity} />
            <RecentDocumentsCard documentos={documentos.slice(0, 4)} />
            <QuickAccessCard proxima={proxima} />
          </section>
        </div>
      </main>
    </>
  );
}

function AnalysisBanner({
  opportunities,
  proxima,
}: {
  opportunities: number;
  proxima?: Assembleia;
}) {
  return (
    <Card className="rounded-[14px] border-[#dde6f2] bg-white px-4 py-2 shadow-[0_8px_28px_rgba(15,23,42,0.035)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#dfe7f2] bg-[#f6f9fd] text-[#173354]">
            <Bot className="h-4 w-4" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#071127]">Tribuno</p>
            <p className="mt-1 truncate text-sm text-[#263b62]">
              Analisei os documentos recebidos e encontrei oportunidades para a próxima sessão.
              {opportunities > 0 ? ` ${opportunities} pontos merecem atenção.` : ""}
            </p>
          </div>
        </div>

        <Button
          asChild
          variant="secondary"
          className="h-10 w-full rounded-2xl border-[#dfe7f2] bg-white px-5 text-[#071127] shadow-none sm:w-auto"
        >
          <Link
            to={proxima ? "/sessoes/$id/preparacao" : "/sessoes"}
            params={proxima ? { id: proxima.id } : undefined}
          >
            Ver análise
            <ArrowRight className="h-4 w-4" strokeWidth={1.85} />
          </Link>
        </Button>
      </div>
    </Card>
  );
}

function MissionCard({
  mission,
  documentosPorRever,
  pontosPorPreparar,
  rascunhosAbertos,
}: {
  mission: PriorityMission;
  documentosPorRever: number;
  pontosPorPreparar: number;
  rascunhosAbertos: number;
}) {
  const dias = mission.dueDate ? Math.max(diasAte(mission.dueDate), 0) : undefined;
  const steps = [
    {
      label: "Documentos",
      helper: documentosPorRever > 0 ? `${documentosPorRever} por analisar` : "Concluído",
      done: documentosPorRever === 0,
    },
    {
      label: "Ordem de trabalhos",
      helper: pontosPorPreparar > 0 ? `${pontosPorPreparar} por preparar` : "Concluído",
      done: pontosPorPreparar === 0,
    },
    {
      label: "Estratégia",
      helper: rascunhosAbertos > 0 ? "Em falta" : "Pronta",
      done: rascunhosAbertos === 0,
    },
    {
      label: "Intervenções",
      helper: rascunhosAbertos > 0 ? `${rascunhosAbertos} por preparar` : "Prontas",
      done: rascunhosAbertos === 0,
    },
  ];

  return (
    <Card className="relative min-h-[330px] overflow-hidden rounded-[14px] border-0 bg-[#082f49] p-5 text-white shadow-[0_18px_55px_rgba(5,31,49,0.18)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_14%,rgba(74,222,128,0.18),transparent_22%),linear-gradient(135deg,#031d2e_0%,#073754_55%,#04243a_100%)]" />
      <Landmark className="absolute -bottom-4 right-3 h-40 w-40 text-white/10" strokeWidth={1.1} />

      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-normal text-[#48d678]">
              Missão prioritária
            </p>
            <h2 className="mt-3 max-w-[520px] text-[1.65rem] font-semibold leading-[1.13] text-white sm:text-[2rem]">
              {mission.title}
            </h2>
            <p className="mt-3 max-w-[520px] text-sm leading-6 text-white/78">{mission.text}</p>
            {mission.meta.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/88">
                {mission.meta.map((item) => {
                  const Icon = item.icon;

                  return (
                    <span key={item.text} className="inline-flex items-center gap-2">
                      <Icon className="h-4 w-4" strokeWidth={1.75} />
                      {item.text}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <div className="hidden shrink-0 sm:block">
            <MissionRing indicator={mission.indicator} days={dias} progress={mission.progress} />
          </div>
        </div>

        <div className="mt-auto pt-6">
          <div className="mb-3 flex items-center justify-between text-sm font-semibold">
            <span>Prioridade</span>
            <span>{mission.progress}%</span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {[0, 1, 2, 3, 4].map((segment) => (
              <div
                key={segment}
                className={cn(
                  "h-2 rounded-full",
                  segment < Math.ceil(mission.progress / 20) ? "bg-[#38d66b]" : "bg-white/14",
                )}
              />
            ))}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-5">
            {steps.map((step, index) => (
              <div key={step.label} className="min-w-0">
                <div className="mb-2 flex items-center">
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full border",
                      step.done
                        ? "border-[#38d66b] bg-[#38d66b] text-[#07304b]"
                        : "border-white/40 bg-white/5 text-white/75",
                    )}
                  >
                    {step.done ? <Check className="h-3.5 w-3.5" strokeWidth={2.2} /> : null}
                  </span>
                  {index < steps.length - 1 && (
                    <span className="ml-1 hidden h-px flex-1 bg-white/25 sm:block" />
                  )}
                </div>
                <p className="truncate text-xs font-medium text-white">{step.label}</p>
                <p className="mt-1 truncate text-[11px] leading-4 text-white/72">{step.helper}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-xl bg-white px-8 text-sm font-semibold text-[#071127] hover:bg-white/92"
            >
              <Link to={mission.to as never} params={mission.params as never}>
                {mission.button}
                <ArrowRight className="h-4 w-4" strokeWidth={1.85} />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function MissionRing({
  indicator,
  days,
  progress,
}: {
  indicator: PriorityMission["indicator"];
  days?: number;
  progress: number;
}) {
  const hasDeadline = indicator === "deadline" && typeof days === "number";
  const label = hasDeadline ? "Faltam" : indicator === "now" ? "Fazer" : "Nível";
  const value = hasDeadline ? String(days) : indicator === "now" ? "Agora" : "Alta";
  const helper = hasDeadline ? "dias" : indicator === "now" ? "" : "prioridade";

  return (
    <div
      className="flex h-[90px] w-[90px] items-center justify-center rounded-full p-1.5"
      style={{
        background: `conic-gradient(#48d678 ${progress * 3.6}deg, rgba(255,255,255,0.16) 0deg)`,
      }}
    >
      <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-[#0a314c]/95 text-center">
        <span className="text-[11px] leading-4 text-white/72">{label}</span>
        <span
          className={cn(
            "font-semibold leading-none text-white",
            hasDeadline ? "text-[1.65rem]" : "text-base",
          )}
        >
          {value}
        </span>
        {helper && <span className="mt-1 text-[11px] leading-4 text-white/72">{helper}</span>}
      </div>
    </div>
  );
}

function TasksCard({ tasks }: { tasks: TaskItem[] }) {
  return (
    <DashboardPanel
      title="O que falta fazer"
      action={<ListFilter className="h-4 w-4 text-[#143052]" strokeWidth={1.75} />}
      footer={
        <Link
          to="/agenda"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#005fd6]"
        >
          Ver todas as tarefas
          <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
        </Link>
      }
    >
      <div className="space-y-3">
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
      </div>
    </DashboardPanel>
  );
}

function TaskRow({ task }: { task: TaskItem }) {
  const Icon = task.icon;
  const tone = taskTone(task.tone);

  return (
    <Link
      to={task.to as never}
      params={task.params as never}
      className="flex min-h-[56px] min-w-0 items-center gap-3 rounded-xl border border-[#dfe7f2] bg-white px-3 py-2.5 transition-colors hover:bg-[#f8fbff]"
    >
      <Square className="h-[17px] w-[17px] shrink-0 text-[#a9b8cb]" strokeWidth={1.6} />
      <div
        className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", tone.iconBg)}
      >
        <Icon className={cn("h-[18px] w-[18px]", tone.iconText)} strokeWidth={1.9} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-[#071127]">{task.title}</p>
        <p className="mt-0.5 truncate text-xs text-[#536682]">{task.subtitle}</p>
      </div>
      <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium", tone.badge)}>
        {task.badge}
      </span>
    </Link>
  );
}

function AlertsCard({ alerts }: { alerts: AlertItem[] }) {
  return (
    <DashboardPanel
      title="Alertas e oportunidades"
      action={<ListFilter className="h-4 w-4 text-[#143052]" strokeWidth={1.75} />}
      footer={
        <Link
          to="/historico"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#005fd6]"
        >
          Ver todos os alertas
          <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
        </Link>
      }
    >
      <div className="space-y-3">
        {alerts.map((alert) => (
          <AlertRow key={alert.id} alert={alert} />
        ))}
      </div>
    </DashboardPanel>
  );
}

function AlertRow({ alert }: { alert: AlertItem }) {
  const Icon = alert.icon;
  const tone = alertTone(alert.tone);

  return (
    <Link
      to={alert.to as never}
      params={alert.params as never}
      className={cn(
        "flex min-h-[60px] min-w-0 items-center gap-3 rounded-xl border px-3 py-3 transition-colors",
        tone.card,
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white",
          tone.icon,
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={2.1} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-[#071127]">{alert.title}</p>
        <p className="mt-0.5 truncate text-xs text-[#536682]">{alert.subtitle}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#173354]" strokeWidth={1.9} />
    </Link>
  );
}

function MetricsCard({ metrics }: { metrics: MetricItem[] }) {
  return (
    <Card className="rounded-[14px] border-[#dfe7f2] bg-white px-5 py-5 shadow-[0_8px_28px_rgba(15,23,42,0.035)]">
      <h2 className="mb-4 text-xs font-semibold uppercase text-[#173354]">
        O teu mandato em números
      </h2>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;

          return (
            <div
              key={metric.label}
              className={cn(
                "flex min-w-0 items-center gap-3",
                index > 0 && "xl:border-l xl:border-[#e4ebf4] xl:pl-6",
              )}
            >
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                  metric.iconBg,
                )}
              >
                <Icon className={cn("h-5 w-5", metric.iconText)} strokeWidth={1.9} />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-semibold leading-none text-[#071127]">{metric.value}</p>
                <p className="mt-1 truncate text-xs text-[#536682]">{metric.label}</p>
                <p className="mt-1 truncate text-xs font-medium text-[#16a765]">{metric.delta}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ActivityCard({ activity }: { activity: ActivityItem[] }) {
  return (
    <DashboardPanel
      title="Atividade recente"
      footer={
        <Link
          to="/historico"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#005fd6]"
        >
          Ver toda a atividade
          <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
        </Link>
      }
    >
      <div className="space-y-0">
        {activity.map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.id} className="relative border-l border-[#dfe7f2] pb-4 pl-7 last:pb-0">
              <div
                className={cn(
                  "absolute -left-3 top-0 flex h-6 w-6 items-center justify-center rounded-full",
                  item.iconBg,
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", item.iconText)} strokeWidth={1.9} />
              </div>
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-[#536682]">{item.when}</p>
                  <p className="mt-1 line-clamp-2 text-[13px] font-medium leading-5 text-[#071127]">
                    {item.text}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium",
                    item.badge,
                  )}
                >
                  {item.kind}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </DashboardPanel>
  );
}

function RecentDocumentsCard({ documentos }: { documentos: Documento[] }) {
  return (
    <DashboardPanel
      title="Documentos recentes"
      footer={
        <Link
          to="/biblioteca"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#005fd6]"
        >
          Ver todos os documentos
          <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
        </Link>
      }
    >
      <div className="space-y-3">
        {documentos.length === 0 ? (
          <EmptyRow
            icon={FileText}
            title="Sem documentos recentes"
            subtitle="Adiciona documentos à biblioteca."
          />
        ) : (
          documentos.map((documento) => (
            <Link
              key={documento.id}
              to="/biblioteca/documentos/$docId"
              params={{ docId: documento.id }}
              className="flex min-h-[42px] min-w-0 items-center gap-3 rounded-lg transition-colors hover:bg-[#f8fbff]"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#fff1f1] text-[#ef2f2f]">
                <FileText className="h-5 w-5" strokeWidth={1.9} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-[#071127]">
                  {documento.titulo}
                </p>
                <p className="mt-0.5 truncate text-xs text-[#536682]">
                  {documento.estado} · {formatarData(documento.data)}
                </p>
              </div>
              {documento.estado === "Por rever" && (
                <span className="rounded-full bg-[#fff4e8] px-2.5 py-1 text-[11px] font-medium text-[#e76800]">
                  Pendente
                </span>
              )}
            </Link>
          ))
        )}
      </div>
    </DashboardPanel>
  );
}

function QuickAccessCard({ proxima }: { proxima?: Assembleia }) {
  const actions = [
    { label: "Novo documento", to: "/biblioteca", icon: Plus },
    { label: "Nova sessão", to: "/sessoes", icon: Plus },
    { label: "Nova recomendação", to: "/assuntos", icon: Plus },
    {
      label: "Novo requerimento",
      to: proxima ? "/sessoes/$id/preparacao/documentos-a-criar" : "/sessoes",
      params: proxima ? { id: proxima.id } : undefined,
      icon: Plus,
    },
    { label: "Pesquisar tudo", to: "/biblioteca", icon: Search },
  ];

  return (
    <DashboardPanel title="Acessos rápidos">
      <div className="space-y-2">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <Link
              key={action.label}
              to={action.to as never}
              params={action.params as never}
              className="flex h-11 items-center justify-center gap-3 rounded-lg border border-[#dfe7f2] bg-white px-3 text-[13px] font-semibold text-[#071127] transition-colors hover:bg-[#f8fbff]"
            >
              <Icon className="h-4 w-4 text-[#173354]" strokeWidth={1.9} />
              <span className="truncate">{action.label}</span>
            </Link>
          );
        })}
      </div>
    </DashboardPanel>
  );
}

function DashboardPanel({
  title,
  action,
  footer,
  children,
}: {
  title: string;
  action?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="rounded-[14px] border-[#dfe7f2] bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.035)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase text-[#173354]">{title}</h2>
        {action}
      </div>
      {children}
      {footer && <div className="mt-4 pt-1">{footer}</div>}
    </Card>
  );
}

function EmptyRow({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex min-h-[58px] min-w-0 items-center gap-3 rounded-xl border border-[#dfe7f2] bg-[#fbfdff] px-3 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#536682]">
        <Icon className="h-4 w-4" strokeWidth={1.8} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold text-[#071127]">{title}</p>
        <p className="mt-0.5 truncate text-xs text-[#536682]">{subtitle}</p>
      </div>
    </div>
  );
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
  const futuras = assembleias
    .filter((assembleia) => assembleia.estado !== "concluida")
    .filter((assembleia) => new Date(`${assembleia.data}T${assembleia.hora || "00:00"}`) >= agora)
    .sort((a, b) => `${a.data}T${a.hora}`.localeCompare(`${b.data}T${b.hora}`));

  return (
    futuras[0] ??
    assembleias
      .slice()
      .sort((a, b) => `${b.data}T${b.hora}`.localeCompare(`${a.data}T${a.hora}`))[0]
  );
}

function calcularProgressoPreparacao({
  proxima,
  documentosDaProxima,
  pontosDaProxima,
  rascunhosDaProxima,
}: {
  proxima?: Assembleia;
  documentosDaProxima: Documento[];
  pontosDaProxima: PontoOrdemTrabalhos[];
  rascunhosDaProxima: DocumentoCriado[];
}) {
  if (!proxima) return 0;

  const checks = [
    Boolean(proxima),
    pontosDaProxima.length === 0 ||
      pontosDaProxima.some((ponto) => ponto.estado !== "Por preparar"),
    documentosDaProxima.length === 0 ||
      documentosDaProxima.every((documento) => documento.estado !== "Por rever"),
    rascunhosDaProxima.length === 0 ||
      rascunhosDaProxima.every((documento) => documento.estado !== "rascunho"),
    pontosDaProxima.length > 0 && pontosDaProxima.every((ponto) => ponto.estado === "Preparado"),
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function criarMissaoPrioritaria({
  proxima,
  assembleias,
  documentos,
  documentosPorRever,
  pontosPorPreparar,
  rascunhosAbertos,
  progress,
}: {
  proxima?: Assembleia;
  assembleias: Assembleia[];
  documentos: Documento[];
  documentosPorRever: Documento[];
  pontosPorPreparar: PontoOrdemTrabalhos[];
  rascunhosAbertos: DocumentoCriado[];
  progress: number;
}): PriorityMission {
  const diasProxima = proxima ? diasAte(proxima.data) : undefined;
  const sessaoEmPrazo =
    proxima && typeof diasProxima === "number" && diasProxima >= 0 && diasProxima <= 15;
  const intervencao = pontosPorPreparar[0];
  const iniciativaSemResposta = rascunhosAbertos.find(
    (documento) => documento.tipo === "Recomendação" || documento.tipo === "Requerimento",
  );
  const documentoRecente = obterDocumentoRecenteAposUltimaSessao(documentos, assembleias);

  if (documentosPorRever.length > 0) {
    return {
      title: "Analisar documentos",
      text: "Tens documentos recebidos que ainda precisam de revisão.",
      button: "Rever documentos",
      to: "/biblioteca",
      indicator: "now",
      progress: 80,
      meta: [
        {
          icon: FileText,
          text: `${documentosPorRever.length} ${documentosPorRever.length === 1 ? "documento por rever" : "documentos por rever"}`,
        },
      ],
    };
  }

  if (sessaoEmPrazo) {
    return {
      title: "Preparar sessão",
      text: "Há uma sessão próxima que precisa de preparação.",
      button: "Continuar preparação",
      to: "/sessoes/$id/preparacao",
      params: { id: proxima.id },
      dueDate: proxima.data,
      indicator: "deadline",
      progress,
      meta: [
        { icon: Calendar, text: formatarData(proxima.data) },
        { icon: Clock3, text: proxima.hora },
        { icon: MapPin, text: proxima.local || "Local por definir" },
      ],
    };
  }

  if (intervencao && proxima) {
    return {
      title: "Preparar intervenção",
      text: "Ainda existem pontos que podem precisar da tua intervenção.",
      button: "Preparar intervenção",
      to: "/sessoes/$id/preparacao/pontos/$pontoId",
      params: { id: proxima.id, pontoId: intervencao.id },
      indicator: "priority",
      progress: 65,
      meta: [
        { icon: Mic2, text: `Ponto ${intervencao.numero}` },
        { icon: FileText, text: intervencao.titulo },
      ],
    };
  }

  if (iniciativaSemResposta) {
    return {
      title: "Acompanhar resposta",
      text: "Há iniciativas que ainda aguardam resposta.",
      button: "Ver acompanhamento",
      to: proxima ? "/sessoes/$id/preparacao/documentos-a-criar" : "/assuntos",
      params: proxima ? { id: proxima.id } : undefined,
      indicator: "priority",
      progress: 55,
      meta: [
        { icon: FileCheck2, text: iniciativaSemResposta.tipo },
        { icon: FileText, text: iniciativaSemResposta.titulo },
      ],
    };
  }

  if (documentoRecente) {
    return {
      title: "Rever ata",
      text: "Existe documentação recente que merece revisão.",
      button: "Rever ata",
      to: "/biblioteca/documentos/$docId",
      params: { docId: documentoRecente.id },
      indicator: "now",
      progress: 50,
      meta: [
        { icon: FileText, text: documentoRecente.titulo },
        { icon: Calendar, text: formatarData(documentoRecente.data) },
      ],
    };
  }

  return {
    title: "Organizar mandato",
    text: "Cria ou atualiza sessões, documentos e assuntos para manter o teu mandato organizado.",
    button: "Começar",
    to: "/sessoes",
    indicator: "priority",
    progress: 30,
    meta: [
      { icon: Landmark, text: "Sessões" },
      { icon: Folder, text: "Documentos e assuntos" },
    ],
  };
}

function obterDocumentoRecenteAposUltimaSessao(documentos: Documento[], assembleias: Assembleia[]) {
  const ultimaSessao = assembleias
    .filter((assembleia) => assembleia.estado === "concluida")
    .sort((a, b) =>
      `${b.data}T${b.hora || "00:00"}`.localeCompare(`${a.data}T${a.hora || "00:00"}`),
    )[0];

  if (!ultimaSessao) {
    return documentos.find((documento) => documento.tipo === "Ata");
  }

  const dataUltimaSessao = new Date(
    `${ultimaSessao.data}T${ultimaSessao.hora || "00:00"}`,
  ).getTime();

  return documentos.find((documento) => {
    const dataDocumento = new Date(documento.createdAt || `${documento.data}T00:00:00`).getTime();
    return documento.tipo === "Ata" && dataDocumento >= dataUltimaSessao;
  });
}

function criarTarefas({
  proxima,
  documentosPorRever,
  pontosPorPreparar,
  rascunhosAbertos,
  dossiesAtivos,
}: {
  proxima?: Assembleia;
  documentosPorRever: Documento[];
  pontosPorPreparar: PontoOrdemTrabalhos[];
  rascunhosAbertos: DocumentoCriado[];
  dossiesAtivos: Dossie[];
}): TaskItem[] {
  if (!proxima) {
    return [
      {
        id: "criar-sessao",
        title: "Criar primeira sessão",
        subtitle: "Data, hora e local por definir",
        badge: "Importante",
        tone: "orange",
        icon: Landmark,
        to: "/sessoes",
      },
    ];
  }

  const tasks: TaskItem[] = [];

  if (documentosPorRever.length > 0) {
    tasks.push({
      id: "docs",
      title: "Rever documentos recebidos",
      subtitle: `${documentosPorRever.length} ${documentosPorRever.length === 1 ? "documento por analisar" : "documentos por analisar"}`,
      badge: documentosPorRever.length > 1 ? "Urgente" : "Importante",
      tone: documentosPorRever.length > 1 ? "red" : "orange",
      icon: FileText,
      to: "/sessoes/$id/preparacao/documentos",
      params: { id: proxima.id },
    });
  }

  pontosPorPreparar.slice(0, 2).forEach((ponto) => {
    tasks.push({
      id: ponto.id,
      title: `Preparar intervenção - Ponto ${ponto.numero}`,
      subtitle: ponto.titulo,
      badge: "Pendente",
      tone: "blue",
      icon: Mic2,
      to: "/sessoes/$id/preparacao/pontos/$pontoId",
      params: { id: proxima.id, pontoId: ponto.id },
    });
  });

  if (rascunhosAbertos.length > 0) {
    tasks.push({
      id: "rascunhos",
      title: "Verificar recomendações",
      subtitle: `${rascunhosAbertos.length} ${rascunhosAbertos.length === 1 ? "rascunho em aberto" : "rascunhos em aberto"}`,
      badge: "Informação",
      tone: "slate",
      icon: FileCheck2,
      to: "/sessoes/$id/preparacao/documentos-a-criar",
      params: { id: proxima.id },
    });
  }

  if (dossiesAtivos.length > 0) {
    tasks.push({
      id: "assuntos",
      title: "Verificar assuntos ativos",
      subtitle: `${dossiesAtivos.length} ${dossiesAtivos.length === 1 ? "tema em acompanhamento" : "temas em acompanhamento"}`,
      badge: "Informação",
      tone: "slate",
      icon: Folder,
      to: "/assuntos",
    });
  }

  if (tasks.length === 0) {
    tasks.push({
      id: "pronto",
      title: "Preparação em bom estado",
      subtitle: "Sem tarefas críticas em aberto",
      badge: "Pronto",
      tone: "green",
      icon: FileCheck2,
      to: "/sessoes/$id/preparacao",
      params: { id: proxima.id },
    });
  }

  return tasks.slice(0, 5);
}

function criarAlertas({
  proxima,
  documentosPorRever,
  rascunhosAbertos,
  dossiesAtivos,
}: {
  proxima?: Assembleia;
  documentosPorRever: Documento[];
  rascunhosAbertos: DocumentoCriado[];
  dossiesAtivos: Dossie[];
}): AlertItem[] {
  const alerts: AlertItem[] = [];

  if (rascunhosAbertos.length > 0 && proxima) {
    alerts.push({
      id: "rascunhos",
      title: "Incoerência detetada",
      subtitle: `${rascunhosAbertos.length} rascunho precisa de revisão`,
      tone: "red",
      icon: AlertCircle,
      to: "/sessoes/$id/preparacao/documentos-a-criar",
      params: { id: proxima.id },
    });
  }

  if (documentosPorRever.length > 0 && proxima) {
    alerts.push({
      id: "documentos",
      title: `${documentosPorRever.length} documentos novos`,
      subtitle: "Recebidos hoje",
      tone: "orange",
      icon: FileText,
      to: "/sessoes/$id/preparacao/documentos",
      params: { id: proxima.id },
    });
  }

  if (proxima) {
    alerts.push({
      id: "prazo",
      title: `Prazo em ${Math.max(diasAte(proxima.data), 0)} dias`,
      subtitle: "Preparação da próxima sessão",
      tone: "yellow",
      icon: Timer,
      to: "/sessoes/$id/preparacao",
      params: { id: proxima.id },
    });
  }

  if (dossiesAtivos.length > 0) {
    alerts.push({
      id: "assuntos",
      title: "Recomendação aprovada",
      subtitle: dossiesAtivos[0]?.titulo ?? "Assunto em acompanhamento",
      tone: "green",
      icon: Check,
      to: "/assuntos",
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      id: "empty-alerts",
      title: "Sem alertas críticos",
      subtitle: "O mandato está sem bloqueios imediatos",
      tone: "green",
      icon: Check,
      to: "/agenda",
    });
  }

  return alerts.slice(0, 4);
}

type MetricItem = {
  label: string;
  value: string;
  delta: string;
  icon: LucideIcon;
  iconBg: string;
  iconText: string;
};

function criarMetricas({
  ativas,
  documentos,
  rascunhosDaProxima,
  dossies,
}: {
  ativas: Assembleia[];
  documentos: Documento[];
  rascunhosDaProxima: DocumentoCriado[];
  dossies: Dossie[];
}): MetricItem[] {
  const intervencoes = rascunhosDaProxima.filter((documento) => documento.tipo === "Intervenção");
  const recomendacoes = rascunhosDaProxima.filter((documento) => documento.tipo === "Recomendação");
  const declaracoes = rascunhosDaProxima.filter(
    (documento) => documento.tipo === "Declaração de voto",
  );

  return [
    {
      label: "Sessões",
      value: String(ativas.length),
      delta: `${ativas.filter((assembleia) => assembleia.estado !== "concluida").length} ativas`,
      icon: Landmark,
      iconBg: "bg-[#e9f8ef]",
      iconText: "text-[#16a765]",
    },
    {
      label: "Intervenções",
      value: String(intervencoes.length),
      delta: `${rascunhosDaProxima.length} rascunhos`,
      icon: Mic2,
      iconBg: "bg-[#eaf4ff]",
      iconText: "text-[#0074db]",
    },
    {
      label: "Recomendações",
      value: String(recomendacoes.length),
      delta: `${recomendacoes.filter((doc) => doc.estado === "apresentado").length} aprovadas`,
      icon: FilePlus2,
      iconBg: "bg-[#fff1e4]",
      iconText: "text-[#f97316]",
    },
    {
      label: "Declarações de voto",
      value: String(declaracoes.length),
      delta: `${declaracoes.filter((doc) => doc.estado !== "rascunho").length} este mês`,
      icon: FileText,
      iconBg: "bg-[#f2ebff]",
      iconText: "text-[#7c3aed]",
    },
    {
      label: "Documentos",
      value: String(documentos.length),
      delta: `${documentos.filter((documento) => documento.estado === "Por rever").length} por rever`,
      icon: Folder,
      iconBg: "bg-[#e8f6f8]",
      iconText: "text-[#0f7785]",
    },
    {
      label: "Tempo poupado",
      value: `${Math.max(documentos.length * 2 + rascunhosDaProxima.length * 3, 0)}h`,
      delta: "+12h este mês",
      icon: Clock3,
      iconBg: "bg-[#fff7df]",
      iconText: "text-[#f5a400]",
    },
  ];
}

type ActivityItem = {
  id: string;
  when: string;
  text: string;
  kind: string;
  icon: LucideIcon;
  iconBg: string;
  iconText: string;
  badge: string;
  date: string;
};

function criarAtividade({
  documentos,
  rascunhosDaProxima,
  dossiesAtivos,
}: {
  documentos: Documento[];
  rascunhosDaProxima: DocumentoCriado[];
  dossiesAtivos: Dossie[];
}): ActivityItem[] {
  const items: ActivityItem[] = [
    ...documentos.slice(0, 3).map((documento) => ({
      id: `documento-${documento.id}`,
      date: documento.updatedAt ?? documento.createdAt,
      when: tempoRelativo(documento.updatedAt ?? documento.createdAt),
      text: `Adicionado documento "${documento.titulo}"`,
      kind: "Documento",
      icon: FileText,
      iconBg: "bg-[#eaf4ff]",
      iconText: "text-[#0074db]",
      badge: "bg-[#eaf4ff] text-[#005fd6]",
    })),
    ...rascunhosDaProxima.slice(0, 2).map((rascunho) => ({
      id: `rascunho-${rascunho.id}`,
      date: rascunho.updatedAt ?? rascunho.createdAt,
      when: tempoRelativo(rascunho.updatedAt ?? rascunho.createdAt),
      text: `Sugestão gerada: ${rascunho.titulo}`,
      kind: "Sugestão",
      icon: FilePlus2,
      iconBg: "bg-[#fff1e4]",
      iconText: "text-[#f97316]",
      badge: "bg-[#f2ebff] text-[#7c3aed]",
    })),
    ...dossiesAtivos.slice(0, 2).map((dossie) => ({
      id: `dossie-${dossie.id}`,
      date: dossie.updatedAt ?? dossie.createdAt,
      when: tempoRelativo(dossie.updatedAt ?? dossie.createdAt),
      text: `Assunto acompanhado: ${dossie.titulo}`,
      kind: "Análise",
      icon: Folder,
      iconBg: "bg-[#e9f8ef]",
      iconText: "text-[#16a765]",
      badge: "bg-[#e9f8ef] text-[#16824e]",
    })),
  ];

  const sorted = items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);

  if (sorted.length > 0) return sorted;

  return [
    {
      id: "empty",
      date: new Date().toISOString(),
      when: "Hoje",
      text: "Ainda não há atividade recente neste mandato.",
      kind: "Estado",
      icon: Check,
      iconBg: "bg-[#e9f8ef]",
      iconText: "text-[#16a765]",
      badge: "bg-[#e9f8ef] text-[#16824e]",
    },
  ];
}

function taskTone(tone: TaskTone) {
  const map = {
    orange: {
      iconBg: "bg-[#fff1e4]",
      iconText: "text-[#f97316]",
      badge: "bg-[#fff4e8] text-[#e76800]",
    },
    red: {
      iconBg: "bg-[#fff1f1]",
      iconText: "text-[#ef2f2f]",
      badge: "bg-[#fff1f1] text-[#ef2f2f]",
    },
    green: {
      iconBg: "bg-[#e9f8ef]",
      iconText: "text-[#16a765]",
      badge: "bg-[#e9f8ef] text-[#16824e]",
    },
    blue: {
      iconBg: "bg-[#eaf4ff]",
      iconText: "text-[#0074db]",
      badge: "bg-[#eaf4ff] text-[#005fd6]",
    },
    slate: {
      iconBg: "bg-[#eef3f8]",
      iconText: "text-[#173354]",
      badge: "bg-[#eef3f8] text-[#536682]",
    },
  };

  return map[tone];
}

function alertTone(tone: AlertTone) {
  const map = {
    red: {
      card: "border-[#f5d7d7] bg-[#fff5f4] hover:bg-[#fff1f1]",
      icon: "bg-[#ef2f2f]",
    },
    orange: {
      card: "border-[#f7e0ce] bg-[#fff8f1] hover:bg-[#fff4e8]",
      icon: "bg-[#f97316]",
    },
    yellow: {
      card: "border-[#f4e6bd] bg-[#fffaf0] hover:bg-[#fff7df]",
      icon: "bg-[#f5b400]",
    },
    green: {
      card: "border-[#d7eadf] bg-[#f3fbf6] hover:bg-[#e9f8ef]",
      icon: "bg-[#16a765]",
    },
  };

  return map[tone];
}

function diasAte(data: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${data}T00:00:00`);

  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

function tempoRelativo(dateLike?: string) {
  if (!dateLike) return "Hoje";

  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return "Hoje";

  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "Agora";
  if (minutes < 60)
    return `Hoje, ${date.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}`;
  if (hours < 24)
    return `Hoje, ${date.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}`;
  if (days === 1) return "Ontem";

  return `Há ${days} dias`;
}
