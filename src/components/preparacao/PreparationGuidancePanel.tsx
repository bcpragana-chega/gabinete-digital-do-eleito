import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ClipboardList,
  ListChecks,
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
      <Card className="w-full max-w-full overflow-hidden rounded-xl border border-border/80 bg-card p-2.5">
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-display text-xs font-semibold tracking-tight text-foreground">
              Assistente de preparação
            </h2>
            <StatusBadge tone={state.readinessTone} dot={false} className="shrink-0 text-[11px]">
              {state.readinessLabel}
            </StatusBadge>
          </div>

          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Estado, próxima ação e pendências.
          </p>
        </div>

        <div className="mt-2.5 space-y-2">
          <div className="space-y-1.5 border-b border-border/70 pb-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Estado
            </p>
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 text-sm font-semibold leading-none text-foreground">{state.readinessLabel}</p>
              <p className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs font-semibold leading-none text-foreground">
                {state.score}%
              </p>
            </div>
            <p className="text-[11px] leading-none text-muted-foreground">{state.scoreDescription}</p>
            <div className="h-1 rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${state.score}%`, backgroundColor: state.progressColor }}
              />
            </div>
          </div>

          <div className="space-y-1.5 border-b border-border/70 pb-2">
            <p className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              <Sparkles className="h-3 w-3" />
              Próxima ação recomendada
            </p>
            <h3 className="text-sm font-semibold leading-snug text-foreground">{state.nextAction.title}</h3>
            <p className="text-[11px] leading-relaxed text-muted-foreground">{state.nextAction.description}</p>

            <Button asChild size="sm" className="h-7 w-full justify-center px-2.5 text-[11px]">
              <Link to={state.nextAction.href}>
                {state.nextAction.button}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          <div className="space-y-1.5 border-b border-border/70 pb-2">
            <p className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              <ClipboardList className="h-3 w-3" />
              Checklist de preparação
            </p>

            <ol className="space-y-1">
              {state.steps.map((step) => (
                <li key={step.id} className="flex items-center gap-1.5 text-xs leading-snug text-foreground">
                  <span
                    className={[
                      "shrink-0 text-sm font-semibold leading-none",
                      step.done ? "text-status-concluida" : "text-muted-foreground",
                    ].join(" ")}
                    aria-hidden
                  >
                    {step.done ? "✓" : "○"}
                  </span>
                  <span className="truncate">{step.label}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="space-y-1.5">
            <p className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              <ListChecks className="h-3 w-3" />
              Ainda falta
            </p>

            {state.isComplete ? (
              <p className="text-[11px] leading-relaxed text-foreground">
                Preparação concluída. Faça apenas uma revisão final de confiança antes da sessão.
              </p>
            ) : state.missingItems.length > 0 ? (
              <ul className="space-y-1">
                {state.missingItems.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-2">
                    <p className="min-w-0 text-[11px] leading-relaxed text-foreground">• {item.message}</p>
                    <Button
                      asChild
                      variant="secondary"
                      size="sm"
                      className="h-6 shrink-0 px-2 text-[10px]"
                    >
                      <Link to={item.href}>{item.cta}</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Não existem pendências críticas neste momento.
              </p>
            )}
          </div>
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
      label: "Sessão criada",
      description: "A sessão está disponível para preparação.",
      done: true,
    },
    {
      id: "strategy-completed",
      label: "Estratégia concluída",
      description: "Defina objetivo político e mensagem principal da sessão.",
      done: strategyCompleted,
      href: `/sessoes/${assembleiaId}/preparacao/estrategia`,
      cta: "Preparar estratégia",
    },
    {
      id: "documents-reviewed",
      label: "Documentos analisados",
      description: "Confirme que os documentos carregados já foram analisados.",
      done: documentsReviewed,
      href: `/sessoes/${assembleiaId}/preparacao/documentos`,
      cta: documentsUploaded ? "Analisar documentos" : "Carregar documentos",
    },
    {
      id: "draft-documents",
      label: "Rascunhos criados",
      description: "Crie minutas de moções, requerimentos ou intervenções.",
      done: draftsCreated,
      href: `/sessoes/${assembleiaId}/preparacao/documentos-a-criar`,
      cta: "Criar rascunhos",
    },
    {
      id: "questions-prepared",
      label: "Intervenção preparada",
      description: "Prepare perguntas/intervenções nos pontos relevantes.",
      done: questionsPrepared,
      href: `/sessoes/${assembleiaId}/preparacao/pontos`,
      cta: "Preparar intervenção",
    },
    {
      id: "final-review",
      label: "Revisão final",
      description: "Confirme que tudo está pronto para a sessão.",
      done: finalReview,
    },
  ];

  const completedCount = steps.filter((step) => step.done).length;
  const score = Math.round((completedCount / steps.length) * 100);

  const readinessLabel =
    score === 100
      ? "Pronto"
      : score >= 80
        ? "Quase concluído"
        : score >= 40
          ? "Em preparação"
          : "Necessita de atenção";
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
      message: "Nenhum documento foi carregado.",
      href: `/sessoes/${assembleiaId}/preparacao/documentos`,
      cta: "Carregar documentos",
    });
  }
  if (!documentsReviewed) {
    if (documentsUploaded) {
      missingItems.push({
        id: "missing-documents-reviewed",
        message: "Os documentos carregados ainda não foram analisados.",
        href: `/sessoes/${assembleiaId}/preparacao/documentos`,
        cta: "Analisar documentos",
      });
    }
  }
  if (!strategyCompleted) {
    missingItems.push({
      id: "missing-strategy",
      message: "A estratégia ainda não foi concluída.",
      href: `/sessoes/${assembleiaId}/preparacao/estrategia`,
      cta: "Preparar estratégia",
    });
  }
  if (!questionsPrepared) {
    if (pointsAdded) {
      missingItems.push({
        id: "missing-intervention",
        message: "Ainda falta preparar a intervenção.",
        href: `/sessoes/${assembleiaId}/preparacao/pontos`,
        cta: "Preparar intervenção",
      });
    }
  }
  if (!draftsCreated) {
    missingItems.push({
      id: "missing-drafts",
      message: "Ainda não existem rascunhos.",
      href: `/sessoes/${assembleiaId}/preparacao/documentos-a-criar`,
      cta: "Criar rascunhos",
    });
  }
  if (!pointsAdded) {
    missingItems.push({
      id: "missing-points",
      message: "Os pontos da sessão ainda não estão estruturados.",
      href: `/sessoes/${assembleiaId}/preparacao/pontos`,
      cta: "Abrir pontos",
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
      title: "Carregar documentos da sessão",
      description: "Comece por reunir os documentos base para orientar toda a preparação.",
      button: "Carregar documentos",
      href: `/sessoes/${assembleiaId}/preparacao/documentos`,
    };
  }

  if (!documentsReviewed) {
    return {
      title: "Analisar documentos carregados",
      description: "Confirme o estado de cada documento para não deixar matéria crítica por analisar.",
      button: "Analisar documentos",
      href: `/sessoes/${assembleiaId}/preparacao/documentos`,
    };
  }

  if (!pointsAdded) {
    return {
      title: "Estruturar pontos da sessão",
      description: "Adicione os pontos da ordem de trabalhos para orientar a preparação.",
      button: "Abrir pontos",
      href: `/sessoes/${assembleiaId}/preparacao/pontos`,
    };
  }

  if (!strategyCompleted) {
    return {
      title: "Preparar estratégia",
      description: "Defina objetivo político e mensagem principal antes da sessão.",
      button: "Preparar estratégia",
      href: `/sessoes/${assembleiaId}/preparacao/estrategia`,
    };
  }

  if (!questionsPrepared) {
    return {
      title: "Preparar intervenção",
      description: "Registe perguntas e linhas de intervenção para os pontos mais relevantes.",
      button: "Preparar intervenção",
      href: `/sessoes/${assembleiaId}/preparacao/pontos`,
    };
  }

  if (!draftsCreated) {
    return {
      title: "Criar rascunhos",
      description: "Crie os rascunhos necessários antes do início da sessão.",
      button: "Criar rascunhos",
      href: `/sessoes/${assembleiaId}/preparacao/documentos-a-criar`,
    };
  }

  return {
    title: "Preparação da sessão concluída",
    description: "Tudo o que é necessário está pronto. Faça apenas a revisão final.",
    button: "Rever sessão",
    href: `/sessoes/${assembleiaId}`,
  };
}