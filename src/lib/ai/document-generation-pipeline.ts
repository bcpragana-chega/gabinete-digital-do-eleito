import type { TipoDocumentoCriado } from "@/lib/types";

export const GENERATION_PIPELINE = Object.freeze({
  version: "document-flow-beta-v2",
  prompt: "documents-substantive-v2",
  contextBuilder: "institutional-context-v2",
  compositor: "institutional-document-v2",
});

const secoesObrigatorias: Partial<Record<TipoDocumentoCriado, string[]>> = {
  Moção: ["ENQUADRAMENTO", "CONSIDERANDOS", "DELIBERAÇÃO / PROPOSTA"],
  Recomendação: ["ENQUADRAMENTO", "PROBLEMA IDENTIFICADO", "FUNDAMENTAÇÃO", "RECOMENDAÇÕES"],
  Requerimento: ["DESTINATÁRIO", "ENQUADRAMENTO", "FUNDAMENTAÇÃO", "PEDIDOS / PERGUNTAS"],
  "Declaração de voto": [
    "IDENTIFICAÇÃO DA VOTAÇÃO",
    "SENTIDO DE VOTO",
    "FUNDAMENTAÇÃO",
    "CONCLUSÃO",
  ],
};

function normalizarTitulo(valor: string) {
  return valor
    .replace(/^#{1,6}\s*/, "")
    .replace(/:$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleUpperCase("pt-PT");
}

function conteudoDasSecoes(texto: string) {
  const secoes = new Map<string, string[]>();
  let atual: string | undefined;

  texto.split(/\r?\n/).forEach((linha) => {
    const titulo = normalizarTitulo(linha);
    if (
      [
        "ENQUADRAMENTO",
        "CONSIDERANDOS",
        "FUNDAMENTACAO",
        "PROPOSTA / DELIBERACAO",
        "DELIBERACAO / PROPOSTA",
        "DESTINATARIO",
        "PEDIDOS / PERGUNTAS",
        "PROBLEMA IDENTIFICADO",
        "RECOMENDACOES",
        "RECOMENDACAO",
        "REQUERIMENTO",
        "CONTEXTO",
        "DECLARACAO",
        "IDENTIFICACAO DA VOTACAO",
        "SENTIDO DE VOTO",
        "CONCLUSAO",
      ].includes(titulo)
    ) {
      atual = titulo;
      if (!secoes.has(atual)) secoes.set(atual, []);
      return;
    }
    if (atual) secoes.get(atual)?.push(linha);
  });

  return secoes;
}

const aliasesCompatibilidade: Record<string, string[]> = {
  CONSIDERANDOS: ["FUNDAMENTACAO"],
  "DELIBERACAO / PROPOSTA": ["PROPOSTA / DELIBERACAO"],
  DESTINATARIO: ["ENQUADRAMENTO"],
  "PEDIDOS / PERGUNTAS": ["REQUERIMENTO"],
  "PROBLEMA IDENTIFICADO": ["ENQUADRAMENTO"],
  RECOMENDACOES: ["RECOMENDACAO"],
  "IDENTIFICACAO DA VOTACAO": ["CONTEXTO"],
  "SENTIDO DE VOTO": ["DECLARACAO"],
  CONCLUSAO: ["DECLARACAO"],
};

export function validarConteudoSubstantivoGerado(tipo: TipoDocumentoCriado, conteudo: string) {
  const erros: string[] = [];
  const texto = conteudo.trim();
  const primeiraLinha = texto.split(/\r?\n/)[0]?.trim() ?? "";

  if (!texto) erros.push("O modelo não devolveu conteúdo substantivo.");
  if (/^(?:#+\s*)?chega!?$/i.test(primeiraLinha)) erros.push("Identidade partidária no cabeçalho.");
  if (/texto\s+por\s+preencher\.?/i.test(texto)) erros.push("Placeholder de conteúdo.");
  if (/\[data\]|_{3,}\s+de\s+_{3,}/i.test(texto)) erros.push("Placeholder de data.");
  if (/^(?:proponente|assinatura|grupo político|grupo politico)\s*:?/im.test(texto)) {
    erros.push("Rodapé institucional dentro do conteúdo substantivo.");
  }
  if (/^[\p{L} .'-]+,\s*\d{1,2}\s+de\s+[\p{L}]+\s+de\s+\d{4}\s*$/imu.test(texto)) {
    erros.push("Local e data dentro do conteúdo substantivo.");
  }

  const obrigatorias = secoesObrigatorias[tipo] ?? [];
  if (obrigatorias.length > 0) {
    const secoes = conteudoDasSecoes(texto);
    obrigatorias.forEach((secao) => {
      const chave = normalizarTitulo(secao);
      const alternativas = [chave, ...(aliasesCompatibilidade[chave] ?? [])];
      const valor = alternativas
        .map((alternativa) => secoes.get(alternativa)?.join("\n").trim())
        .find(Boolean);
      if (!valor) erros.push(`A secção ${secao} está ausente ou vazia.`);
    });
  }

  return { valido: erros.length === 0, erros };
}

export async function persistirRespostaGeracaoCanonica<T>(
  input: {
    tipo: TipoDocumentoCriado;
    conteudo: string;
    metadata: Record<string, unknown>;
  },
  persistir: (dados: { conteudo: string; metadata: Record<string, unknown> }) => Promise<T>,
) {
  const validacao = validarConteudoSubstantivoGerado(input.tipo, input.conteudo);
  if (!validacao.valido) {
    const error = new Error("AI_INVALID_DOCUMENT_CONTENT");
    error.name = "AI_INVALID_DOCUMENT_CONTENT";
    throw error;
  }

  return persistir({
    conteudo: input.conteudo.trim(),
    metadata: { ...input.metadata, generationPipeline: GENERATION_PIPELINE },
  });
}
