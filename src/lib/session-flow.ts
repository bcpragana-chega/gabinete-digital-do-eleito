import type { Assembleia, Documento } from "@/lib/types";
import type { PontoOrdemTrabalhos } from "@/lib/pontos-store";

export type SessionFlowRequirement = "required" | "optional";

export type SessionFlowStep = {
  id: string;
  label: string;
  requirement: SessionFlowRequirement;
  done: boolean;
  href: string;
  action: string;
  missing?: string;
};

export type SessionFlowState = {
  steps: SessionFlowStep[];
  currentStep: number;
  progress: number;
  missingRequired: SessionFlowStep[];
  missingOptional: SessionFlowStep[];
  nextAction: SessionFlowStep;
  canMarkReady: boolean;
};

export function documentoRevisto(documento: Pick<Documento, "estado">) {
  return documento.estado !== "Por rever";
}

export function calcularFluxoSessao(input: {
  sessao: Assembleia;
  documentos: Array<Pick<Documento, "estado">>;
  pontos: Array<
    Pick<PontoOrdemTrabalhos, "estado" | "posicaoPolitica" | "linhaIntervencao" | "sentidoVoto">
  >;
  assuntosCount: number;
  documentosPoliticosCount: number;
}): SessionFlowState {
  const { sessao, documentos, pontos, assuntosCount, documentosPoliticosCount } = input;
  const pontosPreparados =
    pontos.length > 0 &&
    pontos.every((ponto) =>
      Boolean(
        ponto.posicaoPolitica?.trim() &&
        ponto.linhaIntervencao.trim() &&
        ponto.sentidoVoto !== "Por decidir" &&
        (ponto.estado === "Preparado" || ponto.estado === "Concluído"),
      ),
    );
  const documentosRevistos = documentos.length === 0 || documentos.every(documentoRevisto);

  const steps: SessionFlowStep[] = [
    {
      id: "dados",
      label: "Confirmar dados",
      requirement: "required",
      done: Boolean(sessao.dadosConfirmadosEm),
      href: `#dados`,
      action: "Confirmar dados",
      missing: "Confirme os dados da sessão.",
    },
    {
      id: "documentos",
      label: "Rever documentos",
      requirement: "required",
      done: documentosRevistos,
      href: `#documentos`,
      action: documentos.length ? "Rever documentos" : "Adicionar documentos",
      missing: "Existem documentos por rever.",
    },
    {
      id: "pontos",
      label: "Preparar pontos",
      requirement: "required",
      done: pontosPreparados,
      href: `#pontos`,
      action: "Preparar pontos",
      missing: pontos.length
        ? "Complete posição, intervenção, voto e estado dos pontos."
        : "Adicione a ordem de trabalhos.",
    },
    {
      id: "assuntos",
      label: "Associar Assuntos",
      requirement: "optional",
      done: assuntosCount > 0,
      href: `#assuntos`,
      action: "Associar Assuntos",
      missing: "Ainda não existem Assuntos associados.",
    },
    {
      id: "politicos",
      label: "Reunir documentos políticos",
      requirement: "optional",
      done: documentosPoliticosCount > 0,
      href: `#documentos-politicos`,
      action: "Rever documentos políticos",
      missing: "Não existem documentos políticos associados.",
    },
    {
      id: "revisao",
      label: "Confirmar revisão final",
      requirement: "required",
      done: Boolean(sessao.revisaoFinalConfirmadaEm),
      href: `#verificacao-final`,
      action: "Confirmar revisão final",
      missing: "A revisão final ainda não foi confirmada.",
    },
  ];
  const required = steps.filter((step) => step.requirement === "required");
  const missingRequired = required.filter((step) => !step.done);
  const missingOptional = steps.filter((step) => step.requirement === "optional" && !step.done);
  const nextAction = missingRequired[0] ?? missingOptional[0] ?? steps[steps.length - 1];
  const completedRequired = required.length - missingRequired.length;

  return {
    steps,
    currentStep: Math.min(steps.findIndex((step) => !step.done) + 1 || steps.length, steps.length),
    progress: Math.round((completedRequired / required.length) * 100),
    missingRequired,
    missingOptional,
    nextAction,
    canMarkReady: missingRequired.length === 0,
  };
}
