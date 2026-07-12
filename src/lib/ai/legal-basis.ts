import type { PerfilInstitucionalContexto, SessaoContexto } from "@/lib/ai/types";
import type { TipoDocumentoCriado } from "@/lib/types";

export type TipoOrgaoAutarquico =
  | "Assembleia de Freguesia"
  | "Junta de Freguesia"
  | "Assembleia Municipal"
  | "Câmara Municipal";

export type NivelConfiancaJuridica = "alto" | "medio" | "baixo";
export const LEGAL_BASIS_VERSION = "1" as const;
export type LegalBasisVersion = typeof LEGAL_BASIS_VERSION;

export type DiplomaJuridico = {
  numero: string;
  titulo: string;
  fonteOficial: string;
  versaoConsultada: string;
};

export type ArtigoAplicavel = {
  diploma: string;
  artigo: string;
  numero?: string;
  alinea?: string;
  finalidade: string;
};

export type CompetenciasPorPapel = {
  deliberativas: string[];
  fiscalizacao: string[];
  executivas: string[];
  consultivasRecomendatorias: string[];
};

export type BaseJuridicaInstitucional = {
  diploma: string;
  diplomas: DiplomaJuridico[];
  tipoOrgao: TipoOrgaoAutarquico | "Não determinado";
  tipoDocumental: TipoDocumentoCriado;
  orgaoApresentacao: string;
  destinatario: string;
  destinatarioTipo?: TipoOrgaoAutarquico;
  destinatarioInstitucionalHabitual: string;
  competenciasPorPapel: CompetenciasPorPapel;
  competenciaOrgao: string[];
  competenciaDestinatario: string[];
  limitesLegais: string[];
  enquadramentoJuridico: string[];
  artigosAplicaveis: ArtigoAplicavel[];
  normasLei16999Utilizadas: ArtigoAplicavel[];
  nivelConfianca: NivelConfiancaJuridica;
  valido: boolean;
  motivoInvalido?: string;
};

type DadosOrgao = {
  natureza: string;
  executivoCorrespondente?: TipoOrgaoAutarquico;
  deliberativoCorrespondente?: TipoOrgaoAutarquico;
  competenciasPorPapel: CompetenciasPorPapel;
  limites: string[];
  artigosBase: ArtigoAplicavel[];
};

const fonteCrp =
  "https://diariodarepublica.pt/dr/legislacao-consolidada/decreto-aprovacao-constituicao/1976-34520775";
const fonteLei75 = "https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2013-56366098";
const fonteLei169 = "https://diariodarepublica.pt/dr/legislacao-consolidada/lei/1999-34538675";

const diplomaCrp: DiplomaJuridico = {
  numero: "Constituição da República Portuguesa",
  titulo: "Constituição da República Portuguesa - poder local",
  fonteOficial: fonteCrp,
  versaoConsultada: "Versão consolidada consultada no Diário da República Eletrónico.",
};

const diplomaLei75: DiplomaJuridico = {
  numero: "Lei n.º 75/2013",
  titulo: "Regime Jurídico das Autarquias Locais",
  fonteOficial: fonteLei75,
  versaoConsultada: "Redação consolidada consultada no Diário da República Eletrónico.",
};

const diplomaLei169: DiplomaJuridico = {
  numero: "Lei n.º 169/99",
  titulo: "Quadro de competências e regime jurídico de funcionamento dos órgãos autárquicos",
  fonteOficial: fonteLei169,
  versaoConsultada:
    "Redação consolidada consultada no Diário da República Eletrónico; usada apenas em matérias de funcionamento não revogadas.",
};

const diplomaRjal =
  "Lei n.º 75/2013, de 12 de setembro, Regime Jurídico das Autarquias Locais, anexo I.";

const artigosConstitucionaisGerais: ArtigoAplicavel[] = [
  {
    diploma: "Constituição da República Portuguesa",
    artigo: "235.º",
    finalidade: "Enquadramento constitucional da autonomia das autarquias locais",
  },
  {
    diploma: "Constituição da República Portuguesa",
    artigo: "236.º",
    finalidade: "Categorias constitucionais de autarquias locais",
  },
  {
    diploma: "Constituição da República Portuguesa",
    artigo: "239.º",
    finalidade: "Órgãos deliberativos e executivos das autarquias locais",
  },
  {
    diploma: "Constituição da República Portuguesa",
    artigo: "241.º",
    finalidade: "Poder regulamentar das autarquias locais",
  },
];

const basePorOrgao: Record<TipoOrgaoAutarquico, DadosOrgao> = {
  "Assembleia de Freguesia": {
    natureza:
      "Órgão deliberativo da freguesia, com poderes de apreciação, deliberação e fiscalização da atividade da junta de freguesia.",
    competenciasPorPapel: {
      deliberativas: [
        "Deliberar sobre matérias da competência da assembleia de freguesia, no âmbito da freguesia.",
        "Apreciar instrumentos, regulamentos, opções, relatórios, contas ou propostas submetidas pela junta de freguesia, quando aplicável.",
      ],
      fiscalizacao: [
        "Apreciar e fiscalizar a atividade da junta de freguesia.",
        "Solicitar informação necessária ao acompanhamento da atividade da freguesia.",
      ],
      executivas: [],
      consultivasRecomendatorias: [
        "Pronunciar-se sobre assuntos de interesse para a freguesia.",
        "Aprovar recomendações ou posições institucionais sem lhes atribuir força executiva automática.",
      ],
    },
    limites: [
      "Não atribuir à assembleia de freguesia poderes executivos próprios da junta de freguesia.",
      "Não formular deliberações que substituam atos administrativos ou decisões executivas da junta.",
      "Não invocar competências municipais quando a matéria pertença exclusivamente ao município.",
      "Nunca tratar a Câmara Municipal como executivo da freguesia.",
    ],
    executivoCorrespondente: "Junta de Freguesia",
    artigosBase: [
      ...artigosConstitucionaisGerais,
      {
        diploma: "Constituição da República Portuguesa",
        artigo: "245.º",
        finalidade: "Assembleia de Freguesia como órgão deliberativo da freguesia",
      },
      {
        diploma: "Lei n.º 75/2013",
        artigo: "9.º",
        finalidade: "Competências de apreciação e fiscalização da Assembleia de Freguesia",
      },
      {
        diploma: "Lei n.º 75/2013",
        artigo: "10.º",
        finalidade: "Competências de funcionamento da Assembleia de Freguesia",
      },
    ],
  },
  "Junta de Freguesia": {
    natureza:
      "Órgão executivo colegial da freguesia, responsável pela execução das deliberações e pela gestão corrente das atribuições da freguesia.",
    competenciasPorPapel: {
      deliberativas: [],
      fiscalizacao: [],
      executivas: [
        "Executar as deliberações da assembleia de freguesia.",
        "Exercer as competências materiais da junta de freguesia no âmbito das atribuições da freguesia.",
        "Gerir serviços, equipamentos, recursos e património da freguesia.",
      ],
      consultivasRecomendatorias: [
        "Submeter propostas, informações ou instrumentos à assembleia de freguesia quando a lei o determine.",
      ],
    },
    limites: [
      "Não apresentar a junta de freguesia como órgão deliberativo.",
      "Não atribuir à junta competências reservadas à assembleia de freguesia.",
      "Não atribuir à junta competências próprias do município sem delegação, contrato interadministrativo ou outro enquadramento legal confirmado.",
      "Nunca tratar a Junta de Freguesia como executivo municipal.",
    ],
    deliberativoCorrespondente: "Assembleia de Freguesia",
    artigosBase: [
      ...artigosConstitucionaisGerais,
      {
        diploma: "Constituição da República Portuguesa",
        artigo: "246.º",
        finalidade: "Junta de Freguesia como órgão executivo colegial da freguesia",
      },
      {
        diploma: "Lei n.º 75/2013",
        artigo: "16.º",
        finalidade: "Competências materiais da Junta de Freguesia",
      },
    ],
  },
  "Assembleia Municipal": {
    natureza:
      "Órgão deliberativo do município, com poderes de apreciação, deliberação e fiscalização da atividade da câmara municipal.",
    competenciasPorPapel: {
      deliberativas: [
        "Deliberar sobre matérias da competência da assembleia municipal.",
        "Apreciar instrumentos de planeamento, orçamento, prestação de contas, regulamentos, taxas ou propostas submetidas pela câmara municipal, quando aplicável.",
      ],
      fiscalizacao: [
        "Apreciar e fiscalizar a atividade da câmara municipal.",
        "Solicitar informação necessária ao acompanhamento da atividade municipal.",
      ],
      executivas: [],
      consultivasRecomendatorias: [
        "Pronunciar-se sobre assuntos de interesse municipal.",
        "Aprovar recomendações, votos ou posições institucionais sem lhes atribuir força executiva automática.",
      ],
    },
    limites: [
      "Não atribuir à assembleia municipal poderes executivos próprios da câmara municipal.",
      "Não formular deliberações que substituam atos administrativos ou decisões executivas da câmara.",
      "Não apresentar a assembleia municipal como entidade competente para executar diretamente obras, contratos ou atos de gestão corrente.",
      "Nunca tratar a Junta de Freguesia como executivo municipal.",
    ],
    executivoCorrespondente: "Câmara Municipal",
    artigosBase: [
      ...artigosConstitucionaisGerais,
      {
        diploma: "Constituição da República Portuguesa",
        artigo: "250.º",
        finalidade: "Órgãos representativos do município",
      },
      {
        diploma: "Constituição da República Portuguesa",
        artigo: "251.º",
        finalidade: "Assembleia Municipal como órgão deliberativo do município",
      },
      {
        diploma: "Lei n.º 75/2013",
        artigo: "25.º",
        finalidade: "Competências de apreciação e fiscalização da Assembleia Municipal",
      },
      {
        diploma: "Lei n.º 75/2013",
        artigo: "26.º",
        finalidade: "Competências de funcionamento da Assembleia Municipal",
      },
    ],
  },
  "Câmara Municipal": {
    natureza:
      "Órgão executivo colegial do município, responsável pela gestão municipal e pela execução das deliberações da assembleia municipal.",
    competenciasPorPapel: {
      deliberativas: [],
      fiscalizacao: [],
      executivas: [
        "Exercer as competências materiais da câmara municipal no âmbito das atribuições municipais.",
        "Executar as deliberações da assembleia municipal.",
        "Gerir equipamentos, obras, serviços municipais, património, contratos e procedimentos administrativos no âmbito do município.",
      ],
      consultivasRecomendatorias: [
        "Preparar e submeter à assembleia municipal instrumentos, propostas e informações legalmente exigidos.",
      ],
    },
    limites: [
      "Não apresentar a câmara municipal como órgão deliberativo do município.",
      "Não atribuir à câmara competências reservadas à assembleia municipal.",
      "Não invocar poderes fora das atribuições municipais ou sem suporte no contexto recebido.",
      "Nunca tratar a Câmara Municipal como executivo de uma freguesia.",
    ],
    deliberativoCorrespondente: "Assembleia Municipal",
    artigosBase: [
      ...artigosConstitucionaisGerais,
      {
        diploma: "Constituição da República Portuguesa",
        artigo: "250.º",
        finalidade: "Órgãos representativos do município",
      },
      {
        diploma: "Constituição da República Portuguesa",
        artigo: "252.º",
        finalidade: "Câmara Municipal como órgão executivo colegial do município",
      },
      {
        diploma: "Lei n.º 75/2013",
        artigo: "32.º",
        finalidade: "Composição da Câmara Municipal",
      },
      {
        diploma: "Lei n.º 75/2013",
        artigo: "33.º",
        finalidade: "Competências materiais da Câmara Municipal",
      },
    ],
  },
};

const artigosPorTipoDocumental: Partial<Record<TipoDocumentoCriado, ArtigoAplicavel[]>> = {
  Moção: [
    {
      diploma: "Constituição da República Portuguesa",
      artigo: "239.º",
      finalidade:
        "Enquadramento da atuação dos órgãos autárquicos em deliberações, votos e posições institucionais",
    },
  ],
  Recomendação: [
    {
      diploma: "Lei n.º 75/2013",
      artigo: "25.º",
      finalidade:
        "Referência apenas quando o órgão de apresentação é a Assembleia Municipal e a recomendação decorre de apreciação ou fiscalização municipal",
    },
    {
      diploma: "Lei n.º 75/2013",
      artigo: "9.º",
      finalidade:
        "Referência apenas quando o órgão de apresentação é a Assembleia de Freguesia e a recomendação decorre de apreciação ou fiscalização da freguesia",
    },
  ],
  Requerimento: [
    {
      diploma: "Lei n.º 75/2013",
      artigo: "25.º",
      finalidade:
        "Referência apenas quando o requerimento é apresentado na Assembleia Municipal no âmbito de apreciação ou fiscalização",
    },
    {
      diploma: "Lei n.º 75/2013",
      artigo: "9.º",
      finalidade:
        "Referência apenas quando o requerimento é apresentado na Assembleia de Freguesia no âmbito de apreciação ou fiscalização",
    },
  ],
  "Declaração de voto": [
    {
      diploma: "Constituição da República Portuguesa",
      artigo: "239.º",
      finalidade:
        "Enquadramento geral da participação em órgão autárquico; não cria competência executiva",
    },
  ],
};

const normasLei169Funcionamento: Partial<Record<TipoOrgaoAutarquico, ArtigoAplicavel[]>> = {
  "Assembleia de Freguesia": [],
  "Junta de Freguesia": [],
  "Assembleia Municipal": [],
  "Câmara Municipal": [],
};

const mensagemValidacaoJuridica =
  "Não foi possível validar o enquadramento jurídico deste documento. Reveja os dados institucionais.";

function textoSeguro(valor?: string) {
  return valor?.trim() || undefined;
}

function normalizarTexto(valor?: string) {
  return textoSeguro(valor)
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-PT");
}

function artigosIguais(a: ArtigoAplicavel, b: ArtigoAplicavel) {
  return (
    a.diploma === b.diploma &&
    a.artigo === b.artigo &&
    a.numero === b.numero &&
    a.alinea === b.alinea &&
    a.finalidade === b.finalidade
  );
}

function artigosUnicos(artigos: ArtigoAplicavel[]) {
  return artigos.filter(
    (artigo, index, lista) => lista.findIndex((item) => artigosIguais(item, artigo)) === index,
  );
}

function todosValores<T>(...listas: T[][]) {
  return listas.flat().filter(Boolean);
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

function territorioParaOrgao(
  tipoOrgao: TipoOrgaoAutarquico | undefined,
  perfil: PerfilInstitucionalContexto,
) {
  if (tipoOrgao === "Assembleia de Freguesia" || tipoOrgao === "Junta de Freguesia") {
    return textoSeguro(perfil.freguesia) || textoSeguro(perfil.territorio);
  }

  if (tipoOrgao === "Assembleia Municipal" || tipoOrgao === "Câmara Municipal") {
    return textoSeguro(perfil.municipio) || textoSeguro(perfil.territorio);
  }

  return textoSeguro(perfil.territorio);
}

function determinarDestinatarioTipo(
  tipoOrgao: TipoOrgaoAutarquico | undefined,
  tipoDocumental: TipoDocumentoCriado,
) {
  if (!tipoOrgao) return undefined;
  const dados = basePorOrgao[tipoOrgao];

  if (tipoDocumental === "Moção" || tipoDocumental === "Declaração de voto") return tipoOrgao;
  if (tipoDocumental === "Recomendação" || tipoDocumental === "Requerimento") {
    return dados.executivoCorrespondente ?? dados.deliberativoCorrespondente ?? tipoOrgao;
  }

  return dados.executivoCorrespondente ?? dados.deliberativoCorrespondente ?? tipoOrgao;
}

function determinarDestinatario(
  tipoOrgao: TipoOrgaoAutarquico | undefined,
  tipoDocumental: TipoDocumentoCriado,
  territorio?: string,
) {
  const destinatarioTipo = determinarDestinatarioTipo(tipoOrgao, tipoDocumental);
  if (!destinatarioTipo) return "Órgão destinatário não determinado";
  return nomeOrgaoComTerritorio(destinatarioTipo, territorio) ?? destinatarioTipo;
}

function competenciasOrgao(tipoOrgao: TipoOrgaoAutarquico | undefined) {
  if (!tipoOrgao) return [];
  const competencias = basePorOrgao[tipoOrgao].competenciasPorPapel;
  return todosValores(
    competencias.deliberativas,
    competencias.fiscalizacao,
    competencias.executivas,
    competencias.consultivasRecomendatorias,
  );
}

function competenciasDestinatario(destinatarioTipo: TipoOrgaoAutarquico | undefined) {
  return competenciasOrgao(destinatarioTipo);
}

function artigosParaTipoDocumental(
  tipoOrgao: TipoOrgaoAutarquico | undefined,
  tipoDocumental: TipoDocumentoCriado,
) {
  if (!tipoOrgao) return [];

  const artigos = artigosPorTipoDocumental[tipoDocumental] ?? [];
  return artigos.filter((artigo) => {
    if (artigo.artigo === "25.º") return tipoOrgao === "Assembleia Municipal";
    if (artigo.artigo === "9.º") return tipoOrgao === "Assembleia de Freguesia";
    return true;
  });
}

function validarCoerenciaBase(input: {
  perfilTipoOrgao?: TipoOrgaoAutarquico;
  sessaoTipoOrgao?: TipoOrgaoAutarquico;
  tipoOrgao?: TipoOrgaoAutarquico;
  destinatarioTipo?: TipoOrgaoAutarquico;
}) {
  if (
    input.perfilTipoOrgao &&
    input.sessaoTipoOrgao &&
    input.perfilTipoOrgao !== input.sessaoTipoOrgao
  ) {
    return { valido: false, motivo: mensagemValidacaoJuridica };
  }

  if (!input.tipoOrgao) return { valido: false, motivo: mensagemValidacaoJuridica };
  if (!input.destinatarioTipo) return { valido: false, motivo: mensagemValidacaoJuridica };

  if (
    input.tipoOrgao === "Assembleia de Freguesia" &&
    input.destinatarioTipo === "Câmara Municipal"
  ) {
    return { valido: false, motivo: mensagemValidacaoJuridica };
  }

  if (
    input.tipoOrgao === "Assembleia Municipal" &&
    input.destinatarioTipo === "Junta de Freguesia"
  ) {
    return { valido: false, motivo: mensagemValidacaoJuridica };
  }

  if (input.tipoOrgao === "Junta de Freguesia" && input.destinatarioTipo === "Câmara Municipal") {
    return { valido: false, motivo: mensagemValidacaoJuridica };
  }

  if (input.tipoOrgao === "Câmara Municipal" && input.destinatarioTipo === "Junta de Freguesia") {
    return { valido: false, motivo: mensagemValidacaoJuridica };
  }

  return { valido: true, motivo: undefined };
}

function nivelConfianca(tipoOrgao: TipoOrgaoAutarquico | undefined, valido: boolean) {
  if (!valido) return "baixo";
  if (!tipoOrgao) return "baixo";
  return "alto";
}

export function construirBaseJuridicaInstitucional(input: {
  perfil: PerfilInstitucionalContexto;
  sessao?: SessaoContexto;
  tipoDocumental: TipoDocumentoCriado;
}): BaseJuridicaInstitucional {
  const perfilTipoOrgao = identificarTipoOrgaoAutarquico(input.perfil.orgao);
  const sessaoTipoOrgao = identificarTipoOrgaoAutarquico(input.sessao?.orgao);
  const tipoOrgao = sessaoTipoOrgao ?? perfilTipoOrgao;
  const destinatarioTipo = determinarDestinatarioTipo(tipoOrgao, input.tipoDocumental);
  const territorio = territorioParaOrgao(tipoOrgao, input.perfil);
  const orgaoApresentacao =
    nomeOrgaoComTerritorio(tipoOrgao, territorio) ||
    textoSeguro(input.sessao?.orgao) ||
    textoSeguro(input.perfil.orgao) ||
    "Órgão não determinado";
  const destinatario = determinarDestinatario(tipoOrgao, input.tipoDocumental, territorio);
  const dados = tipoOrgao ? basePorOrgao[tipoOrgao] : undefined;
  const destinatarioDados = destinatarioTipo ? basePorOrgao[destinatarioTipo] : undefined;
  const validacao = validarCoerenciaBase({
    perfilTipoOrgao,
    sessaoTipoOrgao,
    tipoOrgao,
    destinatarioTipo,
  });
  const artigosAplicaveis = artigosUnicos([
    ...(dados?.artigosBase ?? []),
    ...artigosParaTipoDocumental(tipoOrgao, input.tipoDocumental),
  ]);
  const normasLei16999Utilizadas = artigosUnicos(
    tipoOrgao ? (normasLei169Funcionamento[tipoOrgao] ?? []) : [],
  );
  const diplomas = artigosAplicaveis.some((artigo) => artigo.diploma === "Lei n.º 169/99")
    ? [diplomaCrp, diplomaLei75, diplomaLei169]
    : [diplomaCrp, diplomaLei75];

  return {
    diploma: diplomaRjal,
    diplomas,
    tipoOrgao: tipoOrgao ?? "Não determinado",
    tipoDocumental: input.tipoDocumental,
    orgaoApresentacao,
    destinatario,
    destinatarioTipo,
    destinatarioInstitucionalHabitual: destinatario,
    competenciasPorPapel: dados?.competenciasPorPapel ?? {
      deliberativas: [],
      fiscalizacao: [],
      executivas: [],
      consultivasRecomendatorias: [],
    },
    competenciaOrgao: competenciasOrgao(tipoOrgao),
    competenciaDestinatario: competenciasDestinatario(destinatarioTipo),
    limitesLegais: dados?.limites ?? [
      "Não indicar competências concretas quando o órgão competente não esteja determinado no contexto.",
      "Não usar expressões genéricas como Assembleia Municipal/Freguesia, Câmara/Junta ou Presidente da Câmara/Presidente da Junta.",
      "Não inventar legislação, artigos ou competências.",
    ],
    enquadramentoJuridico: dados
      ? [
          dados.natureza,
          ...(destinatarioDados && destinatarioTipo !== tipoOrgao
            ? [`Destinatário institucional: ${destinatarioDados.natureza}`]
            : []),
        ]
      : ["O tipo de órgão autárquico não foi determinado com segurança pelo contexto do Tribuno."],
    artigosAplicaveis,
    normasLei16999Utilizadas,
    nivelConfianca: nivelConfianca(tipoOrgao, validacao.valido),
    valido: validacao.valido,
    motivoInvalido: validacao.motivo,
  };
}

export const mapaFinalArtigoFinalidadeV1 = [
  ...artigosConstitucionaisGerais,
  ...Object.values(basePorOrgao).flatMap((dados) => dados.artigosBase),
  ...Object.values(artigosPorTipoDocumental).flatMap((artigos) => artigos ?? []),
].filter(
  (artigo, index, lista) =>
    lista.findIndex(
      (item) =>
        item.diploma === artigo.diploma &&
        item.artigo === artigo.artigo &&
        item.finalidade === artigo.finalidade,
    ) === index,
);
