import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  ClipboardList,
  Gauge,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/common/StatusBadge";
import {
  listarDocumentosACriarDaAssembleia,
  subscreverDocumentosACriar,
} from "@/lib/documentos-a-criar-store";
import { useDocumentosDaAssembleia } from "@/lib/documentos-store";
import { obterEstrategiaDaAssembleia } from "@/lib/estrategia-store";
import {
  carregarPontosRemotosSeDisponivel,
  obterPontosDaAssembleia,
  type PontoOrdemTrabalhos,
} from "@/lib/pontos-store";
import { obterPreparacaoDaAssembleia } from "@/lib/preparacao-store";

type GuidanceStep = {
  id: string;
  label: string;
  done: boolean;
  description: string;
  href?: string;
  cta?: string;
};

type MissingItem = {
  id: string;
  message: string;
  href: string;
  cta: string;
};

type NextAction = {
  title: string;
  description: string;
  button: string;
  href: string;
};

export function PreparationGuidancePanel({
  assembleiaId,
  className,
}: {
  assembleiaId: string;
  className?: string;
}) {
  const documentos = useDocumentosDaAssembleia(assembleiaId);
  const [pontosVersion, setPontosVersion] = useState(0);
  const [rascunhosVersion, setRascunhosVersion] = useState(0);
  const [localVersion, setLocalVersion] = useState(0);

  const pontos = useMemo(
    () => obterPontosDaAssembleia(assembleiaId),
    [assembleiaId, pontosVersion, localVersion],
  );
  const rascunhos = useMemo(
    () => listarDocumentosACriarDaAssembleia(assembleiaId),
    [assembleiaId, rascunhosVersion, localVersion],
  );
  const estrategia = useMemo(
    () => obterEstrategiaDaAssembleia(assembleiaId),
    [assembleiaId, localVersion],
  );
  const preparacao = useMemo(
    () => obterPreparacaoDaAssembleia(assembleiaId),
    [assembleiaId, localVersion],
  );

  useEffect(() => {
    const syncLocal = () => setLocalVersion((v) => v + 1);
    const syncPontos = () => setPontosVersion((v) => v + 1);
    const syncRascunhos = () => setRascunhosVersion((v) => v + 1);

    void carregarPontosRemotosSeDisponivel().finally(syncPontos);
    const unsubRascunhos = subscreverDocumentosACriar(syncRascunhos);

    window.addEventListener("tribuno:pontos", syncPontos);
    window.addEventListener("storage", syncLocal);

    return () => {
      unsubRascunhos();
      window.removeEventListener("tribuno:pontos", syncPontos);
      window.removeEventListener("storage", syncLocal);
    };
  }, []);

  const state = useMemo(
    () => criarEstadoPreparacao({ assembleiaId, documentos, pontos, rascunhos, estrategia, preparacao }),
    [assembleiaId, documentos, pontos, rascunhos, estrategia, preparacao],
  );

  return (
    <section className={className}>
      <Card className="rounded-2xl border border-border bg-card p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
              Assistente de preparação
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Resposta rápida para três perguntas: quão preparado está, o que falta e o que fazer já a seguir.
            </p>
          </div>

          <StatusBadge tone={state.readinessTone} dot={false}>
            {state.readinessLabel}
          </StatusBadge>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-background/70 p-4 lg:col-span-1">
            <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Gauge className="h-3.5 w-3.5" />
              1. Quão preparado estou?
            </p>

            <div className="mt-4 flex items-center gap-4">
              <div
                className="relative grid h-20 w-20 place-items-center rounded-full"
                style={{
                  background: `conic-gradient(${state.progressColor} ${state.score * 3.6}deg, hsl(var(--muted)) 0deg)`,
                }}
              >
                <div className="grid h-14 w-14 place-items-center rounded-full bg-card text-lg font-semibold text-foreground">
                  {state.score}%
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-foreground">{state.readinessLabel}</p>
                <p className="text-xs text-muted-foreground">
                  {state.scoreDescription}
                </p>
              </div>
            </div>

            <div className="mt-4 h-2.5 rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${state.score}%`, backgroundColor: state.progressColor }}
              />
            </div>

            <p className="mt-2 text-xs text-muted-foreground">Preparação: {state.score}%</p>
          </div>

          <div className="rounded-xl border border-border bg-background/70 p-4 lg:col-span-2">
            <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <ClipboardList className="h-3.5 w-3.5" />
              2. O que ainda falta?
            </p>

            {state.isComplete ? (
              <div className="mt-3 rounded-xl border border-status-concluida/30 bg-status-concluida/10 p-4">
                <h3 className="text-sm font-semibold text-foreground">Session preparation complete.</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Everything required for this session has been prepared.
                </p>
                <p className="mt-2 text-sm font-medium text-foreground">Preparation score: 100%</p>
              </div>
            ) : (
              <>
                <ol className="mt-3 grid gap-2">
                  {state.steps.map((step) => (
                    <li
                      key={step.id}
                      className={[
                        "flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2",
                        step.done
                          ? "border-status-concluida/30 bg-status-concluida/10"
                          : "border-status-alerta/30 bg-status-alerta/10",
                      ].join(" ")}
                    >
                      <div>
                        <p className="inline-flex items-center gap-2 text-sm text-foreground">
                          {step.done ? (
                            <CheckCircle2 className="h-4 w-4 text-status-concluida" />
                          ) : (
                            <CircleDashed className="h-4 w-4 text-status-alerta" />
                          )}
                          {step.label}
                        </p>
                        <p className="ml-6 mt-0.5 text-xs text-muted-foreground">{step.description}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <StatusBadge tone={step.done ? "success" : "warning"}>
                          {step.done ? "Concluído" : "Em falta"}
                        </StatusBadge>

                        {!step.done && step.href && step.cta && (
                          <Button asChild variant="secondary" size="sm">
                            <Link to={step.href}>{step.cta}</Link>
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>

                {state.missingItems.length > 0 && (
                  <div className="mt-3 grid gap-2">
                    {state.missingItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-status-alerta/30 bg-status-alerta/10 px-3 py-2"
                      >
                        <p className="inline-flex items-center gap-2 text-sm text-foreground">
                          <AlertTriangle className="h-4 w-4 text-status-alerta" />
                          {item.message}
                        </p>
                        <Button asChild variant="secondary" size="sm">
                          <Link to={item.href}>{item.cta}</Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            3. O que devo fazer a seguir?
          </p>
          <h3 className="mt-2 text-sm font-semibold text-foreground">{state.nextAction.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{state.nextAction.description}</p>
          <Button asChild size="sm" className="mt-3">
            <Link to={state.nextAction.href}>
              {state.nextAction.button}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>

          {state.score === 100 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Excelente — preparação completa. Faça apenas uma revisão final antes da sessão.
            </p>
          )}
        </div>
      </Card>
    </section>
  );
}

function criarEstadoPreparacao({
  assembleiaId,
  documentos,
  pontos,
  rascunhos,
  estrategia,
  preparacao,
}: {
  assembleiaId: string;
  documentos: Array<{ estado: string }>;
  pontos: PontoOrdemTrabalhos[];
  rascunhos: Array<unknown>;
  estrategia: {
    objetivoPolitico: string;
    mensagemPrincipal: string;
    naoFazer: string;
    adversariosPrevisiveis: string;
    notasLivres: string;
  };
  preparacao: {
    prioridades: Array<unknown>;
    perguntas: Array<unknown>;
  };
}) {
  const documentsUploaded = documentos.length > 0;
  const documentsReviewed = documentsUploaded
    ? documentos.every((documento) => documento.estado !== "Por rever")
    : false;
  const pointsAdded = pontos.length > 0;
  const strategyCompleted = [
    estrategia.objetivoPolitico,
    estrategia.mensagemPrincipal,
    estrategia.naoFazer,
    estrategia.adversariosPrevisiveis,
    estrategia.notasLivres,
  ].some((item) => item.trim().length > 0);
  const questionsPrepared = preparacao.perguntas.length > 0 || pontos.some((ponto) => ponto.perguntas.length > 0);
  const draftsCreated = rascunhos.length > 0;
  const finalReview =
    documentsUploaded &&
    documentsReviewed &&
    strategyCompleted &&
    questionsPrepared &&
    draftsCreated;

  const steps: GuidanceStep[] = [
    {
      id: "session-created",
      label: "✓ Sessão criada",
      description: "A sessão está disponível para preparação.",
      done: true,
    },
    {
      id: "strategy-completed",
      label: "✓ Estratégia concluída",
      description: "Defina objetivo político e mensagem principal da sessão.",
      done: strategyCompleted,
      href: `/sessoes/${assembleiaId}/preparacao/estrategia`,
      cta: "Preparar estratégia",
    },
    {
      id: "documents-reviewed",
      label: "☐ Documentos analisados",
      description: "Confirme que os documentos carregados já foram analisados.",
      done: documentsReviewed,
      href: `/sessoes/${assembleiaId}/preparacao/documentos`,
      cta: "Analisar documentos",
    },
    {
      id: "draft-documents",
      label: "☐ Rascunhos criados",
      description: "Crie minutas de moções, requerimentos ou intervenções.",
      done: draftsCreated,
      href: `/sessoes/${assembleiaId}/preparacao/documentos-a-criar`,
      cta: "Criar rascunhos",
    },
    {
      id: "questions-prepared",
      label: "☐ Intervenção preparada",
      description: "Prepare perguntas/intervenções nos pontos relevantes.",
      done: questionsPrepared,
      href: `/sessoes/${assembleiaId}/preparacao/pontos`,
      cta: "Preparar intervenção",
    },
    {
      id: "final-review",
      label: "☐ Revisão final",
      description: "Confirme que tudo está pronto para a sessão.",
      done: finalReview,
    },
  ];

  const completedCount = steps.filter((step) => step.done).length;
  const score = Math.round((completedCount / steps.length) * 100);

  const readinessLabel =
    score === 100
      ? "Ready"
      : score >= 80
        ? "Almost ready"
        : score >= 40
          ? "In progress"
          : "Needs attention";
  const readinessTone =
    score === 100 ? "success" : score >= 80 ? "info" : score >= 40 ? "warning" : "danger";
  const progressColor =
    score === 100
      ? "hsl(var(--status-concluida))"
      : score >= 80
        ? "hsl(var(--status-analise))"
        : score >= 40
          ? "hsl(var(--status-alerta))"
          : "hsl(var(--destructive))";

  const missingItems: MissingItem[] = [];
  if (!documentsUploaded) {
    missingItems.push({
      id: "missing-documents-upload",
      message: "No documents have been uploaded yet.",
      href: `/sessoes/${assembleiaId}/preparacao/documentos`,
      cta: "Upload session documents",
    });
  }
  if (!documentsReviewed) {
    missingItems.push({
      id: "missing-documents-reviewed",
      message: "Uploaded documents still need review.",
      href: `/sessoes/${assembleiaId}/preparacao/documentos`,
      cta: "Review uploaded documents",
    });
  }
  if (!strategyCompleted) {
    missingItems.push({
      id: "missing-strategy",
      message: "Strategy has not been completed.",
      href: `/sessoes/${assembleiaId}/preparacao/estrategia`,
      cta: "Prepare strategy",
    });
  }
  if (!questionsPrepared) {
    missingItems.push({
      id: "missing-intervention",
      message: "Intervention is still missing.",
      href: `/sessoes/${assembleiaId}/preparacao/pontos`,
      cta: "Prepare intervention",
    });
  }
  if (!draftsCreated) {
    missingItems.push({
      id: "missing-drafts",
      message: "Draft documents are still missing.",
      href: `/sessoes/${assembleiaId}/preparacao/documentos-a-criar`,
      cta: "Create draft documents",
    });
  }
  if (!pointsAdded) {
    missingItems.push({
      id: "missing-points",
      message: "Session points have not been structured yet.",
      href: `/sessoes/${assembleiaId}/preparacao/pontos`,
      cta: "Open points",
    });
  }

  const isComplete = score === 100;
  const scoreDescription =
    isComplete
      ? "Todos os requisitos essenciais estão completos."
      : `${completedCount} de ${steps.length} passos concluídos.`;

  const nextAction = escolherProximaAcao({
    assembleiaId,
    documentsUploaded,
    documentsReviewed,
    pointsAdded,
    strategyCompleted,
    questionsPrepared,
    draftsCreated,
  });

  return {
    steps,
    completedCount,
    score,
    readinessLabel,
    readinessTone,
    progressColor,
    missingItems,
    isComplete,
    scoreDescription,
    nextAction,
  };
}

function escolherProximaAcao({
  assembleiaId,
  documentsUploaded,
  documentsReviewed,
  pointsAdded,
  strategyCompleted,
  questionsPrepared,
  draftsCreated,
}: {
  assembleiaId: string;
  documentsUploaded: boolean;
  documentsReviewed: boolean;
  pointsAdded: boolean;
  strategyCompleted: boolean;
  questionsPrepared: boolean;
  draftsCreated: boolean;
}): NextAction {
  if (!documentsUploaded) {
    return {
      title: "Upload session documents",
      description: "Start by uploading the base documents for this session.",
      button: "Upload session documents",
      href: `/sessoes/${assembleiaId}/preparacao/documentos`,
    };
  }

  if (!documentsReviewed) {
    return {
      title: "Review uploaded documents",
      description: "Mark each document so nothing critical remains unreviewed.",
      button: "Review uploaded documents",
      href: `/sessoes/${assembleiaId}/preparacao/documentos`,
    };
  }

  if (!pointsAdded) {
    return {
      title: "Prepare intervention",
      description: "Create session points so you can prepare interventions with structure.",
      button: "Prepare intervention",
      href: `/sessoes/${assembleiaId}/preparacao/pontos`,
    };
  }

  if (!strategyCompleted) {
    return {
      title: "Prepare strategy",
      description: "Define objective and key political message before the session.",
      button: "Prepare strategy",
      href: `/sessoes/${assembleiaId}/preparacao/estrategia`,
    };
  }

  if (!questionsPrepared) {
    return {
      title: "Prepare intervention",
      description: "Register key questions and talking points for the most relevant items.",
      button: "Prepare intervention",
      href: `/sessoes/${assembleiaId}/preparacao/pontos`,
    };
  }

  if (!draftsCreated) {
    return {
      title: "Create draft documents",
      description: "Create the necessary draft documents before the session starts.",
      button: "Create draft documents",
      href: `/sessoes/${assembleiaId}/preparacao/documentos-a-criar`,
    };
  }

  return {
    title: "Session preparation complete",
    description: "Everything required is ready. Do a final confidence check.",
    button: "Review session",
    href: `/sessoes/${assembleiaId}`,
  };
}