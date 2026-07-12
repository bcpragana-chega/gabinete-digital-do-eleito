import type { TipoDocumentoCriado } from "@/lib/types";
import type { PerfilInstitucionalContexto, SessaoContexto } from "@/lib/ai/types";

export type TipoOrgaoAutarquico =
  | "Assembleia de Freguesia"
  | "Junta de Freguesia"
  | "Assembleia Municipal"
  | "Câmara Municipal";

export type BaseJuridicaInstitucional = {
  diploma: string;
  tipoOrgao: TipoOrgaoAutarquico | "Não determinado";
  tipoDocumental: TipoDocumentoCriado;
  orgaoApresentacao: string;
  destinatario: string;
  competenciaOrgao: string[];
  competenciaDestinatario: string[];
  limitesLegais: string[];
  enquadramentoJuridico: string[];
};

type DadosBaseJuridica = {
  artigos: string[];
  natureza: string;
  competencias: string[];
  limites: string[];
  executivoCorrespondente?: TipoOrgaoAutarquico;
  deliberativoCorrespondente?: TipoOrgaoAutarquico;
};

const diplomaRjal =
  "Lei n.º 75/2013, de 12 de setembro, Regime Jurídico das Autarquias Locais, anexo I.";

const basePorOrgao: Record<TipoOrgaoAutarquico, DadosBaseJuridica> = {
  "Assembleia de Freguesia": {
    artigos: ["artigo 9.º"],
    natureza:
      "Órgão deliberativo da freguesia, com poderes de apreciação, deliberação e fiscalização da atividade da junta de freguesia.",
    competencias: [
      "Apreciar e fiscalizar a atividade da junta de freguesia, nos termos do artigo 9.º do anexo I da Lei n.º 75/2013.",
      "Deliberar sobre matérias da competência da assembleia de freguesia previstas no artigo 9.º.",
      "Pronunciar-se sobre assuntos de interesse para a freguesia quando a matéria se insira no âmbito autárquico.",
      "Apreciar instrumentos, relatórios, contas, regulamentos ou propostas submetidas pela junta, quando aplicável.",
    ],
    limites: [
      "Não atribuir à assembleia de freguesia poderes executivos próprios da junta de freguesia.",
      "Não formular deliberações que substituam atos administrativos ou decisões executivas da junta.",
      "Não invocar competências municipais quando a matéria pertença exclusivamente ao município.",
    ],
    executivoCorrespondente: "Junta de Freguesia",
  },
  "Junta de Freguesia": {
    artigos: ["artigo 16.º"],
    natureza:
      "Órgão executivo da freguesia, responsável pela execução das deliberações e pela gestão corrente das atribuições da freguesia.",
    competencias: [
      "Executar as deliberações da assembleia de freguesia e exercer as competências próprias da junta previstas no artigo 16.º do anexo I da Lei n.º 75/2013.",
      "Gerir serviços, equipamentos, recursos e património da freguesia no âmbito das respetivas atribuições.",
      "Preparar e submeter à assembleia de freguesia os instrumentos e propostas legalmente exigidos, quando aplicável.",
      "Praticar atos de administração ordinária relacionados com a freguesia.",
    ],
    limites: [
      "Não apresentar a junta de freguesia como órgão deliberativo.",
      "Não atribuir à junta competências reservadas à assembleia de freguesia.",
      "Não atribuir à junta competências próprias do município sem delegação ou enquadramento legal.",
    ],
    deliberativoCorrespondente: "Assembleia de Freguesia",
  },
  "Assembleia Municipal": {
    artigos: ["artigo 25.º"],
    natureza:
      "Órgão deliberativo do município, com poderes de apreciação, deliberação e fiscalização da atividade da câmara municipal.",
    competencias: [
      "Apreciar e fiscalizar a atividade da câmara municipal, nos termos do artigo 25.º do anexo I da Lei n.º 75/2013.",
      "Deliberar sobre matérias da competência da assembleia municipal previstas no artigo 25.º.",
      "Pronunciar-se sobre assuntos de interesse municipal quando a matéria se insira no âmbito das atribuições do município.",
      "Apreciar instrumentos de planeamento, orçamento, prestação de contas, regulamentos ou propostas submetidas pela câmara, quando aplicável.",
    ],
    limites: [
      "Não atribuir à assembleia municipal poderes executivos próprios da câmara municipal.",
      "Não formular deliberações que substituam atos administrativos ou decisões executivas da câmara.",
      "Não apresentar a assembleia municipal como entidade competente para executar diretamente obras, contratos ou atos de gestão corrente.",
    ],
    executivoCorrespondente: "Câmara Municipal",
  },
  "Câmara Municipal": {
    artigos: ["artigo 33.º"],
    natureza:
      "Órgão executivo do município, responsável pela execução das deliberações e pela gestão municipal no âmbito das competências previstas na lei.",
    competencias: [
      "Exercer as competências materiais previstas no artigo 33.º do anexo I da Lei n.º 75/2013.",
      "Executar as deliberações da assembleia municipal e assegurar a gestão municipal.",
      "Gerir equipamentos, obras, serviços municipais, património, contratos e procedimentos administrativos no âmbito das atribuições do município.",
      "Preparar e submeter à assembleia municipal os instrumentos e propostas legalmente exigidos, quando aplicável.",
    ],
    limites: [
      "Não apresentar a câmara municipal como órgão deliberativo do município.",
      "Não atribuir à câmara competências reservadas à assembleia municipal.",
      "Não invocar poderes fora das atribuições municipais ou sem suporte no contexto recebido.",
    ],
    deliberativoCorrespondente: "Assembleia Municipal",
  },
};

function textoSeguro(valor?: string) {
  return valor?.trim() || undefined;
}

function normalizarTexto(valor?: string) {
  return textoSeguro(valor)
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-PT");
}

export function identificarTipoOrgaoAutarquico(valor?: string): TipoOrgaoAutarquico | undefined {
  const normalizado = normalizarTexto(valor);
  if (!normalizado) return undefined;

  if (normalizado.includes("assembleia") && normalizado.includes("freguesia")) {
    return "Assembleia de Freguesia";
  }

  if (normalizado.includes("junta") && normalizado.includes("freguesia")) {
    return "Junta de Freguesia";
  }

  if (normalizado.includes("assembleia") && normalizado.includes("municip")) {
    return "Assembleia Municipal";
  }

  if (normalizado.includes("camara") && normalizado.includes("municip")) {
    return "Câmara Municipal";
  }

  return undefined;
}

function nomeOrgaoComTerritorio(tipoOrgao: TipoOrgaoAutarquico | undefined, territorio?: string) {
  if (!tipoOrgao) return undefined;
  const territorioLimpo = textoSeguro(territorio);
  return territorioLimpo ? `${tipoOrgao} de ${territorioLimpo}` : tipoOrgao;
}

function determinarDestinatario(
  tipoOrgao: TipoOrgaoAutarquico | undefined,
  tipoDocumental: TipoDocumentoCriado,
  territorio?: string,
) {
  if (!tipoOrgao) return "Órgão destinatário não determinado";

  const dados = basePorOrgao[tipoOrgao];
  if (tipoDocumental === "Moção" || tipoDocumental === "Declaração de voto") {
    return nomeOrgaoComTerritorio(tipoOrgao, territorio) ?? tipoOrgao;
  }

  const contraparte =
    dados.executivoCorrespondente ?? dados.deliberativoCorrespondente ?? tipoOrgao;
  return nomeOrgaoComTerritorio(contraparte, territorio) ?? contraparte;
}

function competenciasDestinatario(destinatario: string) {
  const tipoDestinatario = identificarTipoOrgaoAutarquico(destinatario);
  if (!tipoDestinatario) return [];
  return basePorOrgao[tipoDestinatario].competencias;
}

export function construirBaseJuridicaInstitucional(input: {
  perfil: PerfilInstitucionalContexto;
  sessao?: SessaoContexto;
  tipoDocumental: TipoDocumentoCriado;
}): BaseJuridicaInstitucional {
  const tipoOrgao =
    identificarTipoOrgaoAutarquico(input.sessao?.orgao) ??
    identificarTipoOrgaoAutarquico(input.perfil.orgao);
  const orgaoApresentacao =
    nomeOrgaoComTerritorio(tipoOrgao, input.perfil.territorio) ||
    textoSeguro(input.sessao?.orgao) ||
    textoSeguro(input.perfil.orgao) ||
    "Órgão não determinado";
  const destinatario = determinarDestinatario(
    tipoOrgao,
    input.tipoDocumental,
    input.perfil.territorio,
  );
  const dados = tipoOrgao ? basePorOrgao[tipoOrgao] : undefined;
  const enquadramentoJuridico = dados
    ? [dados.natureza, `Referência aplicável: ${diplomaRjal} ${dados.artigos.join(", ")}.`]
    : [
        "O tipo de órgão autárquico não foi determinado com segurança pelo contexto do Tribuno.",
        `Referência geral disponível: ${diplomaRjal}`,
      ];

  return {
    diploma: diplomaRjal,
    tipoOrgao: tipoOrgao ?? "Não determinado",
    tipoDocumental: input.tipoDocumental,
    orgaoApresentacao,
    destinatario,
    competenciaOrgao: dados?.competencias ?? [],
    competenciaDestinatario: competenciasDestinatario(destinatario),
    limitesLegais: dados?.limites ?? [
      "Não indicar competências concretas quando o órgão competente não esteja determinado no contexto.",
      "Não usar expressões genéricas como Assembleia Municipal/Freguesia, Câmara/Junta ou Presidente da Câmara/Presidente da Junta.",
      "Não inventar legislação, artigos ou competências.",
    ],
    enquadramentoJuridico,
  };
}
