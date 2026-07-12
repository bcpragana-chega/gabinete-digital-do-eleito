import type { DocumentoCriado, EstadoDossie } from "@/lib/types";
import { hrefDocumentoCriado } from "@/lib/document-routes";

export type AcaoAssunto =
  | { tipo: "editar"; label: string }
  | { tipo: "navegar"; label: string; href: string };

export type EstadoUxAssunto = {
  titulo: string;
  descricao: string;
  acaoPrincipal: AcaoAssunto;
  acoesSecundarias: AcaoAssunto[];
  estadoResumido: string;
  recomendacoes: string[];
};

export function calcularEstadoUxAssunto(input: {
  assuntoId: string;
  objetivoPolitico?: string;
  resumo?: string;
  estado: EstadoDossie;
  totalNotas: number;
  totalEventos: number;
  totalDocumentosRelacionados: number;
  sessoesIds: string[];
  documentosCriados: DocumentoCriado[];
}): EstadoUxAssunto {
  const temObjetivo = Boolean(input.objetivoPolitico?.trim());
  const temContexto =
    Boolean(input.resumo?.trim()) ||
    input.totalNotas > 0 ||
    input.totalEventos > 0 ||
    input.totalDocumentosRelacionados > 0;
  const temSessao = input.sessoesIds.length > 0;
  const emRevisao = input.documentosCriados.find(
    (documento) => documento.estado === "rascunho" || documento.estado === "em revisão",
  );
  const finais = input.documentosCriados.filter((documento) =>
    ["pronto", "final", "apresentado"].includes(documento.estado),
  );
  const recomendacoes: string[] = [];

  if (!temObjetivo) recomendacoes.push("Definir o resultado político pretendido.");
  if (!temContexto) recomendacoes.push("Registar factos, notas ou documentos relevantes.");
  if (!temSessao) recomendacoes.push("Associar o assunto a uma sessão adequada.");
  if (temContexto && input.documentosCriados.length === 0) {
    recomendacoes.push("Preparar um documento para transformar o contexto em ação.");
  }

  const estadoResumido = [
    temObjetivo ? "objetivo definido" : "objetivo por definir",
    temContexto ? "contexto registado" : "contexto insuficiente",
    temSessao ? "sessão associada" : "sem sessão associada",
    input.documentosCriados.length > 0
      ? `${input.documentosCriados.length} documento(s) criado(s)`
      : "sem documentos criados",
  ].join(" · ");

  if (!temObjetivo) {
    return {
      titulo: "Definir o objetivo político",
      descricao:
        "Clarifique o resultado que pretende alcançar antes de avançar para ações e documentos.",
      acaoPrincipal: { tipo: "editar", label: "Completar objetivo" },
      acoesSecundarias: [
        { tipo: "navegar", label: "Adicionar contexto", href: "#contexto-assunto" },
      ],
      estadoResumido,
      recomendacoes: recomendacoes.slice(0, 3),
    };
  }

  if (!temContexto) {
    return {
      titulo: "Adicionar contexto ao assunto",
      descricao:
        "Registe informação suficiente para apoiar decisões, documentos e preparação de sessões.",
      acaoPrincipal: { tipo: "navegar", label: "Adicionar contexto", href: "#contexto-assunto" },
      acoesSecundarias: [],
      estadoResumido,
      recomendacoes: recomendacoes.slice(0, 3),
    };
  }

  if (!temSessao) {
    return {
      titulo: "Associar a uma sessão",
      descricao: "O assunto já tem objetivo e contexto, mas ainda não está ligado a uma sessão.",
      acaoPrincipal: { tipo: "navegar", label: "Escolher sessão", href: "#relacoes-assunto" },
      acoesSecundarias: [
        { tipo: "navegar", label: "Preparar documento", href: "#documentos-assunto" },
      ],
      estadoResumido,
      recomendacoes: recomendacoes.slice(0, 3),
    };
  }

  if (input.documentosCriados.length === 0) {
    return {
      titulo: "Preparar um documento",
      descricao: "O assunto já tem base suficiente para criar uma proposta, pedido ou intervenção.",
      acaoPrincipal: { tipo: "navegar", label: "Criar documento", href: "#documentos-assunto" },
      acoesSecundarias: [],
      estadoResumido,
      recomendacoes: recomendacoes.slice(0, 3),
    };
  }

  if (emRevisao) {
    return {
      titulo: "Continuar a revisão",
      descricao: `O documento “${emRevisao.titulo}” ainda precisa de revisão antes de ficar pronto.`,
      acaoPrincipal: {
        tipo: "navegar",
        label: "Abrir e rever",
        href: hrefDocumentoCriado(emRevisao.id),
      },
      acoesSecundarias: [{ tipo: "navegar", label: "Ver documentos", href: "#documentos-assunto" }],
      estadoResumido,
      recomendacoes: recomendacoes.slice(0, 3),
    };
  }

  return {
    titulo: finais.length > 0 ? "Rever o próximo seguimento" : "Atualizar o assunto",
    descricao:
      input.estado === "em acompanhamento"
        ? "Existem documentos preparados. Confirme o seguimento e atualize o assunto após a próxima ação."
        : "Reveja o estado do assunto e prepare a sessão associada quando necessário.",
    acaoPrincipal: { tipo: "navegar", label: "Rever atividade", href: "#atividade-assunto" },
    acoesSecundarias: input.sessoesIds[0]
      ? [
          {
            tipo: "navegar",
            label: "Preparar sessão",
            href: `/sessoes/${input.sessoesIds[0]}/preparacao`,
          },
        ]
      : [],
    estadoResumido,
    recomendacoes: recomendacoes.slice(0, 3),
  };
}

export type IntencaoDocumento = "proposta" | "informacoes" | "posicao" | "intervencao" | "outro";

export function tipoPorIntencao(intencao: IntencaoDocumento) {
  if (intencao === "proposta") return "Recomendação";
  if (intencao === "informacoes") return "Requerimento";
  if (intencao === "posicao") return "Moção";
  if (intencao === "intervencao") return "Intervenção";
  return "Outro documento";
}

export function sugerirTituloDocumento(input: {
  tipo: string;
  assuntoTitulo: string;
  objetivoPolitico?: string;
}) {
  const assunto = input.assuntoTitulo.trim();
  const objetivo = input.objetivoPolitico?.trim();
  const base = assunto || objetivo || "o assunto em análise";
  return `${input.tipo} sobre ${base}`;
}
