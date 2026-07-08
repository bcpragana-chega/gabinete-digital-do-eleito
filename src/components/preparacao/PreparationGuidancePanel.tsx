import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
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
  href: string;
  cta: string;
  description: string;
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
                  {state.completedCount} de {state.steps.length} passos concluídos
                </p>
              </div>
            </div>

            <div className="mt-4 h-2.5 rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${state.score}%`, backgroundColor: state.progressColor }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background/70 p-4 lg:col-span-2">
            <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <ClipboardList className="h-3.5 w-3.5" />
              2. O que ainda falta?
            </p>

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
                    {!step.done && (
                      <Button asChild variant="secondary" size="sm">
                        <Link to={step.href}>{step.cta}</Link>
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ol>
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
  const prioritiesDefined = preparacao.prioridades.length > 0;
  const draftsCreated = rascunhos.length > 0;

  const steps: GuidanceStep[] = [
    {
      id: "documents-uploaded",
      label: "Documentos carregados",
      description: "Garanta que convocatória, propostas e anexos estão disponíveis.",
      done: documentsUploaded,
      href: `/sessoes/${assembleiaId}/preparacao/documentos`,
      cta: "Abrir documentos",
    },
    {
      id: "documents-reviewed",
      label: "Documentos analisados",
      description: "Confirme que nenhum documento crítico ficou por analisar.",
      done: documentsReviewed,
      href: `/sessoes/${assembleiaId}/preparacao/documentos`,
      cta: "Analisar documentos",
    },
    {
      id: "points-added",
      label: "Pontos adicionados",
      description: "Registe os pontos da ordem de trabalhos para estruturar a sessão.",
      done: pointsAdded,
      href: `/sessoes/${assembleiaId}/preparacao/pontos`,
      cta: "Abrir pontos",
    },
    {
      id: "strategy-completed",
      label: "Estratégia preenchida",
      description: "Defina objetivo político e mensagem principal da sessão.",
      done: strategyCompleted,
      href: `/sessoes/${assembleiaId}/preparacao/estrategia`,
      cta: "Abrir estratégia",
    },
    {
      id: "questions-prepared",
      label: "Intervenções preparadas",
      description: "Prepare perguntas/intervenções nos pontos relevantes.",
      done: questionsPrepared,
      href: `/sessoes/${assembleiaId}/preparacao/pontos`,
      cta: "Preparar intervenção",
    },
    {
      id: "priorities-defined",
      label: "Prioridades definidas",
      description: "Estabeleça prioridades políticas para orientar a intervenção.",
      done: prioritiesDefined,
      href: `/sessoes/${assembleiaId}/preparacao/pontos`,
      cta: "Definir prioridades",
    },
    {
      id: "draft-documents",
      label: "Rascunhos criados",
      description: "Crie minutas de moções, requerimentos e declarações, quando necessário.",
      done: draftsCreated,
      href: `/sessoes/${assembleiaId}/preparacao/documentos-a-criar`,
      cta: "Abrir rascunhos",
    },
  ];

  const completedCount = steps.filter((step) => step.done).length;
  const score = Math.round((completedCount / steps.length) * 100);

  const readinessLabel =
    score === 100 ? "Pronto" : score >= 67 ? "Quase pronto" : "Precisa de atenção";
  const readinessTone = score === 100 ? "success" : score >= 67 ? "info" : "warning";
  const progressColor = score === 100 ? "hsl(var(--status-concluida))" : score >= 67 ? "hsl(var(--status-analise))" : "hsl(var(--status-alerta))";

  const nextAction = escolherProximaAcao({
    assembleiaId,
    documentsUploaded,
    documentsReviewed,
    pointsAdded,
    strategyCompleted,
    questionsPrepared,
    prioritiesDefined,
    draftsCreated,
  });

  return {
    steps,
    completedCount,
    score,
    readinessLabel,
    readinessTone,
    progressColor,
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
  prioritiesDefined,
  draftsCreated,
}: {
  assembleiaId: string;
  documentsUploaded: boolean;
  documentsReviewed: boolean;
  pointsAdded: boolean;
  strategyCompleted: boolean;
  questionsPrepared: boolean;
  prioritiesDefined: boolean;
  draftsCreated: boolean;
}): NextAction {
  if (!documentsUploaded) {
    return {
      title: "Carregue os documentos da sessão.",
      description: "Comece por reunir os documentos base para orientar toda a preparação.",
      button: "Carregar documentos",
      href: `/sessoes/${assembleiaId}/preparacao/documentos`,
    };
  }

  if (!documentsReviewed) {
    return {
      title: "Analise os documentos carregados.",
      description: "Confirme o estado dos documentos para evitar material crítico por analisar.",
      button: "Analisar documentos",
      href: `/sessoes/${assembleiaId}/preparacao/documentos`,
    };
  }

  if (!pointsAdded) {
    return {
      title: "Adicione os pontos da ordem de trabalhos.",
      description: "Os pontos estruturam intervenções, perguntas e rascunhos de documentos.",
      button: "Adicionar pontos",
      href: `/sessoes/${assembleiaId}/preparacao/pontos`,
    };
  }

  if (!strategyCompleted) {
    return {
      title: "Defina a estratégia da sessão.",
      description: "Registe objetivo e mensagem principal para alinhar as decisões de preparação.",
      button: "Abrir estratégia",
      href: `/sessoes/${assembleiaId}/preparacao/estrategia`,
    };
  }

  if (!questionsPrepared) {
    return {
      title: "Prepare a sua intervenção.",
      description: "Registe perguntas-chave antes de fechar prioridades e rascunhos.",
      button: "Preparar intervenção",
      href: `/sessoes/${assembleiaId}/preparacao/pontos`,
    };
  }

  if (!prioritiesDefined) {
    return {
      title: "Defina as prioridades de preparação.",
      description: "Priorize os temas para clarificar o que é mais importante na sessão.",
      button: "Abrir pontos",
      href: `/sessoes/${assembleiaId}/preparacao/pontos`,
    };
  }

  if (!draftsCreated) {
    return {
      title: "Crie os rascunhos necessários.",
      description: "Crie minutas de moções, requerimentos e intervenções antes da sessão.",
      button: "Abrir rascunhos",
      href: `/sessoes/${assembleiaId}/preparacao/documentos-a-criar`,
    };
  }

  return {
    title: "Preparação da sessão concluída.",
    description: "Todos os passos essenciais estão completos. Faça apenas a revisão final.",
    button: "Rever sessão",
    href: `/sessoes/${assembleiaId}`,
  };
}