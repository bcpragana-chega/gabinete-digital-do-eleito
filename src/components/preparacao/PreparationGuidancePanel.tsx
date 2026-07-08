import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Circle, CircleDashed, ArrowRight } from "lucide-react";
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
};

type ActionableAlert = {
  id: string;
  title: string;
  button: string;
  href: string;
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
              Checklist de preparação
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Veja o que está concluído, o que falta e a próxima ação recomendada.
            </p>
          </div>

          <StatusBadge tone={state.readinessTone} dot={false}>
            {state.readinessLabel}
          </StatusBadge>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <ol className="space-y-2">
            {state.steps.map((step) => (
              <li
                key={step.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/70 px-3 py-2"
              >
                <div className="inline-flex items-center gap-2 text-sm">
                  {step.done ? (
                    <CheckCircle2 className="h-4 w-4 text-status-concluida" />
                  ) : (
                    <CircleDashed className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={step.done ? "text-foreground" : "text-muted-foreground"}>
                    {step.label}
                  </span>
                </div>
                <Circle
                  className={step.done ? "h-2.5 w-2.5 fill-status-concluida text-status-concluida" : "h-2.5 w-2.5 text-muted-foreground/50"}
                />
              </li>
            ))}
          </ol>

          <div className="rounded-xl border border-border bg-background/70 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Score de preparação
            </p>
            <p className="mt-2 text-3xl font-semibold text-foreground">{state.score}%</p>
            <div className="mt-3 h-2.5 rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${state.score}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{state.completedCount} de {state.steps.length} passos concluídos</p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-border bg-background/70 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Próxima ação recomendada
          </p>
          <h3 className="mt-2 text-sm font-semibold text-foreground">{state.nextAction.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{state.nextAction.description}</p>
          <Button asChild size="sm" className="mt-3">
            <Link to={state.nextAction.href}>
              {state.nextAction.button}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {state.alerts.length > 0 ? (
          <div className="mt-5 grid gap-2">
            {state.alerts.map((alerta) => (
              <div
                key={alerta.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-status-alerta/30 bg-status-alerta/10 px-3 py-2"
              >
                <p className="inline-flex items-center gap-2 text-sm text-foreground">
                  <AlertTriangle className="h-4 w-4 text-status-alerta" />
                  {alerta.title}
                </p>
                <Button asChild variant="secondary" size="sm">
                  <Link to={alerta.href}>
                    {alerta.button}
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-status-concluida/30 bg-status-concluida/10 p-4">
            <h3 className="text-sm font-semibold text-foreground">Preparação da sessão concluída.</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {documentos.length} documentos, {pontos.length} pontos e {rascunhos.length} rascunhos preparados.
            </p>
          </div>
        )}
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
    { id: "session-created", label: "Sessão criada", done: true },
    { id: "documents-uploaded", label: "Documentos carregados", done: documentsUploaded },
    { id: "documents-reviewed", label: "Documentos analisados", done: documentsReviewed },
    { id: "points-added", label: "Pontos adicionados", done: pointsAdded },
    { id: "strategy-completed", label: "Estratégia preenchida", done: strategyCompleted },
    { id: "questions-prepared", label: "Intervenções preparadas", done: questionsPrepared },
    { id: "priorities-defined", label: "Prioridades definidas", done: prioritiesDefined },
    { id: "draft-documents", label: "Rascunhos criados", done: draftsCreated },
    {
      id: "preparation-completed",
      label: "Preparação concluída",
      done:
        documentsUploaded &&
        documentsReviewed &&
        pointsAdded &&
        strategyCompleted &&
        questionsPrepared &&
        prioritiesDefined &&
        draftsCreated,
    },
  ];

  const completedCount = steps.filter((step) => step.done).length;
  const score = Math.round((completedCount / steps.length) * 100);

  const readinessLabel =
    score === 100 ? "Pronto" : score >= 67 ? "Quase pronto" : "Precisa de atenção";
  const readinessTone = score === 100 ? "success" : score >= 67 ? "info" : "warning";

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

  const alerts: ActionableAlert[] = [];
  if (!documentsUploaded) {
    alerts.push({
      id: "missing-docs",
      title: "Ainda não existem documentos carregados.",
      button: "Carregar documentos",
      href: `/sessoes/${assembleiaId}/preparacao/documentos`,
    });
  }
  if (!strategyCompleted) {
    alerts.push({
      id: "missing-strategy",
      title: "A estratégia da sessão ainda não está definida.",
      button: "Abrir estratégia",
      href: `/sessoes/${assembleiaId}/preparacao/estrategia`,
    });
  }
  if (!pointsAdded) {
    alerts.push({
      id: "missing-points",
      title: "Ainda não existem pontos da ordem de trabalhos.",
      button: "Adicionar ponto",
      href: `/sessoes/${assembleiaId}/preparacao/pontos`,
    });
  }
  if (!questionsPrepared) {
    alerts.push({
      id: "missing-questions",
      title: "Ainda não existem perguntas/intervenções preparadas.",
      button: "Preparar intervenção",
      href: `/sessoes/${assembleiaId}/preparacao/pontos`,
    });
  }
  if (!draftsCreated) {
    alerts.push({
      id: "missing-drafts",
      title: "Ainda não existem rascunhos de documentos.",
      button: "Criar rascunhos",
      href: `/sessoes/${assembleiaId}/preparacao/documentos-a-criar`,
    });
  }

  return {
    steps,
    completedCount,
    score,
    readinessLabel,
    readinessTone,
    nextAction,
    alerts,
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