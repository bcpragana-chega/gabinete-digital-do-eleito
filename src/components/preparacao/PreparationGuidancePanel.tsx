import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ClipboardList, ListChecks, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProductHelpPageState } from "@/components/help/ProductHelpPageState";
import { Card } from "@/components/ui/card";
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
import { useAssembleia } from "@/lib/assembleias-store";
import { useDossiesAssociadosAAssembleia } from "@/lib/dossie-assembleias-store";
import { calcularFluxoSessao } from "@/lib/session-flow";

type GuidanceStep = {
  id: string;
  label: string;
  done: boolean;
  description: string;
  href?: string;
  cta?: string;
  classification: "essential" | "recommended";
};

type MissingItem = {
  id: string;
  message: string;
  href: string;
  cta: string;
  classification: "essential" | "recommended";
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
  const assembleia = useAssembleia(assembleiaId);
  const assuntos = useDossiesAssociadosAAssembleia(assembleiaId);
  const [pontosVersion, setPontosVersion] = useState(0);
  const [rascunhosVersion, setRascunhosVersion] = useState(0);
  const [localVersion, setLocalVersion] = useState(0);
  const [checklistAberta, setChecklistAberta] = useState(false);

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

  const state = useMemo(() => {
    if (!assembleia)
      return criarEstadoPreparacao({
        assembleiaId,
        documentos,
        pontos,
        rascunhos,
        estrategia,
        preparacao,
      });
    const flow = calcularFluxoSessao({
      sessao: assembleia,
      documentos,
      pontos,
      assuntosCount: assuntos.length,
      documentosPoliticosCount: rascunhos.length,
    });
    return criarEstadoDoFluxoPreparacao({
      assembleiaId,
      preparacaoEstado: assembleia.preparacaoEstado,
      flow,
    });
  }, [
    assembleia,
    assembleiaId,
    assuntos.length,
    documentos,
    pontos,
    rascunhos,
    estrategia,
    preparacao,
  ]);

  useProductHelpPageState({
    emptyState: documentos.length === 0 && pontos.length === 0 && rascunhos.length === 0,
    primaryAction: state.nextAction.button,
    currentStatus: state.readinessLabel,
    nextStep: state.nextAction.description,
    visibleWarnings: state.isComplete
      ? undefined
      : state.missingItems.slice(0, 3).map((item) => item.message),
    summaryFacts: [
      `${pontos.length} pontos da sessão`,
      `${documentos.length} documentos associados`,
      state.missingEssential.length === 0
        ? "Preparação essencial concluída"
        : `${state.missingEssential.length} pendências essenciais`,
    ],
  });

  return (
    <section className={className}>
      <Card className="w-full max-w-full overflow-hidden rounded-xl border border-border/80 bg-card p-2">
        <div className="space-y-0.5">
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-display text-xs font-semibold tracking-tight text-foreground/90">
              Assistente de preparação
            </h2>
          </div>
        </div>

        <div className="mt-2 space-y-1.5">
          <div className="space-y-1 border-b border-border/60 pb-1.5">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Estado
            </p>
            <p className="text-sm font-semibold leading-snug text-foreground">
              {state.readinessLabel}
            </p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {state.statusDescription}
            </p>
            {state.canConfirm && (
              <Button asChild size="sm" variant="secondary" className="h-7 px-2.5 text-[11px]">
                <Link to="/sessoes/$id" params={{ id: assembleiaId }} hash="verificacao-final">
                  Confirmar preparação
                </Link>
              </Button>
            )}
          </div>

          <div className="space-y-1 border-b border-border/60 pb-1.5">
            <p className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              <Sparkles className="h-3 w-3" />
              Próxima ação
            </p>
            <h3 className="text-sm font-semibold leading-snug text-foreground">
              {state.nextAction.title}
            </h3>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {state.nextAction.description}
            </p>

            <Button asChild size="sm" className="h-7 w-full justify-center px-2.5 text-[11px]">
              <Link to={state.nextAction.href}>
                {state.nextAction.button}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          <div className="space-y-1 border-b border-border/60 pb-1.5">
            <p className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              <ListChecks className="h-3 w-3" />
              Pendências principais
            </p>

            {state.isComplete ? (
              <p className="text-[11px] leading-relaxed text-foreground">
                A sessão está preparada. Pode continuar a editar os seus elementos até ao início.
              </p>
            ) : state.missingItems.length > 0 ? (
              <>
                {state.missingEssential.length === 0 && (
                  <p className="text-[11px] leading-relaxed text-foreground">
                    A preparação essencial está concluída.
                  </p>
                )}
                <ul className="space-y-1">
                  {state.missingItems.slice(0, 3).map((item) => (
                    <li key={item.id} className="space-y-1 rounded-md bg-muted/35 p-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 text-[11px] leading-relaxed text-foreground">
                          {item.message}
                        </p>
                        <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {item.classification === "essential" ? "Essencial" : "Recomendado"}
                        </span>
                      </div>
                      <Button
                        asChild
                        variant="secondary"
                        size="sm"
                        className="h-6 px-2 text-[10px] whitespace-nowrap"
                      >
                        <Link to={item.href}>{item.cta}</Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-[11px] leading-relaxed text-foreground">
                A preparação essencial está concluída e não existem melhorias pendentes.
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-7 w-full justify-center text-[11px]"
              aria-expanded={checklistAberta}
              aria-controls={`checklist-preparacao-${assembleiaId}`}
              onClick={() => setChecklistAberta((aberta) => !aberta)}
            >
              <ClipboardList className="h-3 w-3" />
              {checklistAberta ? "Ocultar checklist completa" : "Ver checklist completa"}
            </Button>

            {checklistAberta && (
              <ol id={`checklist-preparacao-${assembleiaId}`} className="space-y-1 pt-1">
                {state.steps.map((step) => (
                  <li
                    key={step.id}
                    className="grid grid-cols-[12px_minmax(0,1fr)_auto] items-center gap-1.5 text-[11px] leading-none text-foreground"
                  >
                    <span
                      className={step.done ? "text-status-concluida" : "text-muted-foreground"}
                      aria-hidden
                    >
                      {step.done ? "✓" : "○"}
                    </span>
                    <span className="space-y-1">
                      <span className="block">{step.label}</span>
                      <span className="block text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {step.classification === "essential" ? "Essencial" : "Recomendado"}
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground">
                        {step.done ? "Concluído" : "Em falta"}
                      </span>
                      {step.href && step.cta && (
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="h-6 px-1.5 text-[10px]"
                        >
                          <Link to={step.href}>{step.done ? "Rever" : step.cta}</Link>
                        </Button>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </Card>
    </section>
  );
}

export function criarEstadoDoFluxoPreparacao({
  assembleiaId,
  preparacaoEstado,
  flow,
}: {
  assembleiaId: string;
  preparacaoEstado?: "em_preparacao" | "pronta";
  flow: ReturnType<typeof calcularFluxoSessao>;
}) {
  const steps: GuidanceStep[] = flow.steps.map((step) => ({
    ...step,
    description: step.missing ?? step.label,
    cta: step.action,
    href: `/sessoes/${assembleiaId}${step.href}`,
    classification: step.requirement === "required" ? "essential" : "recommended",
  }));
  const missingEssential = flow.missingRequired.map((step) => ({
    id: step.id,
    message: step.missing ?? step.label,
    href: `/sessoes/${assembleiaId}${step.href}`,
    cta: step.action,
    classification: "essential" as const,
  }));
  const missingRecommended = flow.missingOptional.map((step) => ({
    id: step.id,
    message: step.missing ?? step.label,
    href: `/sessoes/${assembleiaId}${step.href}`,
    cta: step.action,
    classification: "recommended" as const,
  }));
  const isComplete = preparacaoEstado === "pronta";
  const readinessLabel = isComplete
    ? "Pronta para a sessão"
    : missingEssential.length > 0
      ? "Preparação incompleta"
      : "Pronta para revisão";
  const statusDescription = isComplete
    ? "A preparação foi confirmada pelo eleito. Os elementos da sessão continuam editáveis."
    : missingEssential.length > 0
      ? "Resolva as pendências essenciais antes de confirmar a preparação."
      : "A preparação essencial está concluída. O eleito pode rever e confirmar a sessão.";

  const nextAction: NextAction = isComplete
    ? {
        title: "Preparação confirmada",
        description: "A sessão está pronta; pode continuar a rever ou editar os seus elementos.",
        button: "Continuar a editar",
        href: `/sessoes/${assembleiaId}`,
      }
    : {
        title: flow.nextAction.label,
        description: flow.nextAction.missing ?? "Reveja a preparação da sessão.",
        button: flow.nextAction.action,
        href: `/sessoes/${assembleiaId}${flow.nextAction.href}`,
      };

  return {
    steps,
    missingItems: [...missingEssential, ...missingRecommended],
    missingEssential,
    isComplete,
    canConfirm: !isComplete && missingEssential.length === 0,
    readinessLabel,
    statusDescription,
    nextAction,
  };
}

export function criarEstadoPreparacao({
  assembleiaId,
  documentos,
  pontos,
  rascunhos,
  estrategia,
  preparacao,
}: {
  assembleiaId: string;
  documentos: Array<{ estado: string; archivedAt?: string }>;
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
  const documentosAtivos = documentos.filter((documento) => !documento.archivedAt);
  const documentsUploaded = documentosAtivos.length > 0;
  const documentsReviewed = documentsUploaded
    ? documentosAtivos.every((documento) => documento.estado === "Revisto")
    : false;
  const pointsAdded = pontos.length > 0;
  const strategyCompleted = [
    estrategia.objetivoPolitico,
    estrategia.mensagemPrincipal,
    estrategia.naoFazer,
    estrategia.adversariosPrevisiveis,
    estrategia.notasLivres,
  ].some((item) => item.trim().length > 0);
  const questionsPrepared =
    preparacao.perguntas.length > 0 || pontos.some((ponto) => ponto.perguntas.length > 0);
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
      classification: "essential",
    },
    {
      id: "strategy-completed",
      label: "Estratégia concluída",
      description: "Defina objetivo político e mensagem principal da sessão.",
      done: strategyCompleted,
      href: `/sessoes/${assembleiaId}/preparacao/estrategia`,
      cta: "Preparar estratégia",
      classification: "recommended",
    },
    {
      id: "documents-reviewed",
      label: "Documentos revistos",
      description: "Confirme que os documentos carregados já foram revistos.",
      done: documentsReviewed,
      href: `/sessoes/${assembleiaId}/preparacao/documentos`,
      cta: documentsUploaded ? "Analisar documentos" : "Carregar documentos",
      classification: "essential",
    },
    {
      id: "draft-documents",
      label: "Rascunhos criados",
      description: "Crie minutas de moções, requerimentos ou intervenções.",
      done: draftsCreated,
      href: `/sessoes/${assembleiaId}/preparacao/documentos-a-criar`,
      cta: "Criar rascunhos",
      classification: "recommended",
    },
    {
      id: "questions-prepared",
      label: "Intervenção preparada",
      description: "Prepare perguntas/intervenções nos pontos relevantes.",
      done: questionsPrepared,
      href: `/sessoes/${assembleiaId}/preparacao/pontos`,
      cta: "Preparar intervenção",
      classification: "recommended",
    },
    {
      id: "final-review",
      label: "Revisão final",
      description: "Confirme que tudo está pronto para a sessão.",
      done: finalReview,
      classification: "recommended",
    },
  ];

  const missingItems: MissingItem[] = [];
  if (!documentsUploaded) {
    missingItems.push({
      id: "missing-documents-upload",
      message: "Nenhum documento foi carregado.",
      href: `/sessoes/${assembleiaId}/preparacao/documentos`,
      cta: "Carregar documentos",
      classification: "essential",
    });
  }
  if (!documentsReviewed) {
    if (documentsUploaded) {
      missingItems.push({
        id: "missing-documents-reviewed",
        message: "Os documentos carregados ainda não foram revistos.",
        href: `/sessoes/${assembleiaId}/preparacao/documentos`,
        cta: "Analisar documentos",
        classification: "essential",
      });
    }
  }
  if (!strategyCompleted) {
    missingItems.push({
      id: "missing-strategy",
      message: "A estratégia ainda não foi concluída.",
      href: `/sessoes/${assembleiaId}/preparacao/estrategia`,
      cta: "Preparar estratégia",
      classification: "recommended",
    });
  }
  if (!questionsPrepared) {
    if (pointsAdded) {
      missingItems.push({
        id: "missing-intervention",
        message: "Ainda falta preparar a intervenção.",
        href: `/sessoes/${assembleiaId}/preparacao/pontos`,
        cta: "Preparar intervenção",
        classification: "recommended",
      });
    }
  }
  if (!draftsCreated) {
    missingItems.push({
      id: "missing-drafts",
      message: "Ainda não existem rascunhos.",
      href: `/sessoes/${assembleiaId}/preparacao/documentos-a-criar`,
      cta: "Criar rascunhos",
      classification: "recommended",
    });
  }
  if (!pointsAdded) {
    missingItems.push({
      id: "missing-points",
      message: "Os pontos da sessão ainda não estão estruturados.",
      href: `/sessoes/${assembleiaId}/preparacao/pontos`,
      cta: "Abrir pontos",
      classification: "essential",
    });
  }

  const missingEssential = missingItems.filter((item) => item.classification === "essential");
  missingItems.sort((a, b) =>
    a.classification === b.classification ? 0 : a.classification === "essential" ? -1 : 1,
  );
  const isComplete = false;
  const readinessLabel =
    missingEssential.length > 0 ? "Preparação incompleta" : "Pronta para revisão";
  const statusDescription =
    missingEssential.length > 0
      ? "Resolva as pendências essenciais antes de confirmar a preparação."
      : "A preparação essencial está concluída. O eleito pode rever e confirmar a sessão.";

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
    readinessLabel,
    missingItems,
    missingEssential,
    isComplete,
    canConfirm: missingEssential.length === 0,
    statusDescription,
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
      description:
        "Confirme o estado de cada documento para não deixar matéria crítica por analisar.",
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
