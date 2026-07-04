import type { CargoEleito, OrgaoEleito, PerfilEleito } from "@/lib/auth-store";

export type ContextoInstitucional = {
  nomeOrgao: string;
  designacaoCargo: string;
  tipoSessao: string;
  tipoSessaoPlural: string;
  pontos: string;
  documentosRelevantes: string[];
  terminologia: {
    sessoes: string;
    assuntos: string;
    biblioteca: string;
  };
};

const contextoPadrao: ContextoInstitucional = {
  nomeOrgao: "Órgão autárquico",
  designacaoCargo: "Cargo por definir",
  tipoSessao: "Sessão",
  tipoSessaoPlural: "Sessões",
  pontos: "Pontos da Ordem de Trabalhos",
  documentosRelevantes: ["Moções", "Recomendações", "Requerimentos", "Declarações de voto"],
  terminologia: {
    sessoes: "Sessões",
    assuntos: "Assuntos",
    biblioteca: "Biblioteca",
  },
};

export function obterContextoInstitucional(
  perfil?: Pick<PerfilEleito, "orgao" | "cargo">,
): ContextoInstitucional {
  if (!perfil) return contextoPadrao;

  if (perfil.orgao === "Assembleia de Freguesia") {
    return {
      ...contextoPadrao,
      nomeOrgao: "Assembleia de Freguesia",
      designacaoCargo: perfil.cargo,
      tipoSessao: "Assembleia de Freguesia",
      tipoSessaoPlural: "Assembleias de Freguesia",
      documentosRelevantes: ["Recomendações", "Moções", "Requerimentos"],
    };
  }

  if (perfil.orgao === "Assembleia Municipal") {
    return {
      ...contextoPadrao,
      nomeOrgao: "Assembleia Municipal",
      designacaoCargo: perfil.cargo || "Deputado Municipal",
      tipoSessao: "Assembleia Municipal",
      tipoSessaoPlural: "Assembleias Municipais",
      documentosRelevantes: ["Propostas", "Requerimentos", "Moções", "Declarações de voto"],
    };
  }

  if (perfil.orgao === "Câmara Municipal") {
    return {
      ...contextoPadrao,
      nomeOrgao: "Câmara Municipal",
      designacaoCargo: perfil.cargo || "Vereador",
      tipoSessao: "Reunião de Câmara",
      tipoSessaoPlural: "Reuniões de Câmara",
      pontos: "Pontos da reunião",
      documentosRelevantes: ["Propostas", "Declarações de voto", "Requerimentos"],
    };
  }

  if (perfil.orgao === "Junta de Freguesia") {
    return {
      ...contextoPadrao,
      nomeOrgao: "Junta de Freguesia",
      designacaoCargo: perfil.cargo,
      tipoSessao: "Reunião de Junta",
      tipoSessaoPlural: "Reuniões de Junta",
      pontos: "Pontos da reunião",
      documentosRelevantes: ["Propostas", "Informações", "Despachos"],
    };
  }

  return {
    ...contextoPadrao,
    nomeOrgao: perfil.orgao,
    designacaoCargo: perfil.cargo as CargoEleito,
  };
}
