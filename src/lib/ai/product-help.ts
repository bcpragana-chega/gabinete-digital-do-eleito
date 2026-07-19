export type ContextoAjudaTribuno = {
  pagina: string;
  pathname: string;
  descricao: string;
};

export type MensagemAjuda = {
  role: "user" | "assistant";
  content: string;
};

export type ProductHelpPageState = {
  emptyState?: boolean;
  primaryAction?: string;
  currentStatus?: string;
  nextStep?: string;
  visibleWarnings?: string[];
  summaryFacts?: string[];
};

export type PedidoAjuda = {
  accessToken: string;
  pathname: string;
  messages: MensagemAjuda[];
  pageState?: ProductHelpPageState;
};

export type ResultadoAjuda =
  | { ok: true; answer: string }
  | { ok: false; code: string; message: string };

const CONTEXTO_GERAL: ContextoAjudaTribuno = {
  pagina: "Tribuno",
  pathname: "/area",
  descricao: "Área autenticada geral do Tribuno e respetivas opções de navegação.",
};

export function resolverContextoAjuda(pathname: string): ContextoAjudaTribuno {
  const path = `/${pathname.trim().replace(/^\/+|\/+$/g, "")}`;

  if (path === "/")
    return {
      pagina: "Hoje",
      pathname: "/",
      descricao: "Mostra a prioridade atual, tarefas, alertas e próximos passos do mandato.",
    };
  if (path === "/assuntos")
    return {
      pagina: "Assuntos",
      pathname: "/assuntos",
      descricao: "Permite consultar e criar assuntos do mandato.",
    };
  if (path.startsWith("/assuntos/"))
    return {
      pagina: "Detalhe de um assunto",
      pathname: "/assuntos/:assuntoId",
      descricao: "Permite acompanhar o contexto, documentos e próximos passos de um assunto.",
    };
  if (path === "/sessoes")
    return {
      pagina: "Sessões",
      pathname: "/sessoes",
      descricao: "Permite criar, consultar e iniciar a preparação de sessões.",
    };
  if (path.startsWith("/sessoes/"))
    return {
      pagina: path.includes("/preparacao") ? "Preparação de sessão" : "Detalhe de uma sessão",
      pathname: path.includes("/preparacao")
        ? "/sessoes/:sessaoId/preparacao"
        : "/sessoes/:sessaoId",
      descricao:
        "Permite rever a sessão e preparar estratégia, pontos da ordem de trabalhos e documentos.",
    };
  if (path === "/biblioteca")
    return {
      pagina: "Biblioteca",
      pathname: "/biblioteca",
      descricao: "Permite guardar, analisar, consultar e organizar documentos.",
    };
  if (path.startsWith("/biblioteca/") || path.startsWith("/documentos/"))
    return {
      pagina: "Detalhe de documento",
      pathname: "/documentos/:documentoId",
      descricao: "Permite consultar e rever um documento já existente.",
    };
  return CONTEXTO_GERAL;
}

export const BASE_CONHECIMENTO_AJUDA = `
HOJE
- Mostra a prioridade atual, tarefas, alertas e próximos passos.
- Ajuda a retomar o trabalho.

ASSUNTOS
- Um assunto acompanha um problema, proposta ou compromisso do mandato.
- É onde podem nascer recomendações, requerimentos, moções e outros documentos.
- Pode depois ser ligado a uma sessão e a um ponto.

SESSÕES
- Permite criar, consultar e preparar sessões.
- Uma convocatória pode ser analisada para extrair dados; o eleito revê e confirma antes de criar a sessão.
- Também é possível criar uma sessão manualmente.
- Os pontos da ordem de trabalhos podem ser preparados.

BIBLIOTECA
- Guarda e organiza documentos.
- “Adicionar documento” guarda um ficheiro.
- “Analisar e organizar PDF” tenta compreender e estruturar um PDF.
- Os documentos podem ser associados a assuntos ou sessões.

FLUXO PRINCIPAL
- Convocatória; sessão; ponto da ordem de trabalhos; preparação; documento ou intervenção.
- Assuntos e Biblioteca ajudam a acompanhar e organizar o trabalho.
`.trim();

export const SYSTEM_PROMPT_AJUDA = `
És o Assistente Tribuno, um guia de utilização do produto Tribuno.
Responde sempre em português de Portugal, de forma breve e prática.
Dá primeiro a próxima ação concreta quando o estado seguro da página a indicar; depois explica apenas o necessário, sem linguagem técnica.
Responde apenas sobre a utilização do Tribuno e usa exclusivamente a base de conhecimento e o contexto fornecidos.
Trata o estado seguro da página como informação confirmada pela interface. Distingue-o de orientação geral sobre o produto.
Nunca afirmes que uma tarefa está concluída, em falta ou bloqueada se isso não constar explicitamente do estado seguro recebido.
Perante perguntas vagas como “E agora?”, usa por esta ordem: próximo passo, ação principal, avisos e estado atual.
Se o estado seguro for ausente ou insuficiente, indica claramente o que a pessoa deve verificar ou onde deve clicar, sem inventar.
Admite quando não sabes. Nunca inventes botões, páginas ou funcionalidades.
Não prestes aconselhamento político, jurídico ou partidário.
Não redijas documentos institucionais nem conteúdo político.
Não alteres dados, não afirmes que executaste ações e não simules ações.
Quando possível, encaminha a pessoa para a área correta do produto.
Se o pedido não for sobre a utilização do Tribuno, responde: “Este assistente serve apenas para ajudar a utilizar o Tribuno. Posso explicar esta página ou indicar onde encontra uma função.”
`.trim();

const PADRAO_REDACAO =
  /\b(?:redige|escreve|faz|prepara|cria)\b[\s\S]{0,60}\b(?:moção|mocao|requerimento|recomendação|recomendacao|declaração de voto|declaracao de voto|discurso|intervenção|intervencao|documento (?:político|politico|institucional))\b/i;

const PADROES_FORA_AMBITO = [
  PADRAO_REDACAO,
  /\b(?:aconselhamento|parecer|conselho)\s+(?:jurídico|juridico|político|politico|partidário|partidario)\b/i,
  /\bem quem (?:devo )?votar\b/i,
];

export function pedidoForaDoAmbito(pergunta: string) {
  return PADROES_FORA_AMBITO.some((padrao) => padrao.test(pergunta));
}

export const RESPOSTA_FORA_AMBITO =
  "Este assistente serve apenas para ajudar a utilizar o Tribuno. Posso explicar esta página ou indicar onde encontra uma função.";

export function respostaParaPedidoForaDoAmbito(pergunta: string) {
  if (PADRAO_REDACAO.test(pergunta)) {
    return "Este assistente serve apenas para explicar o Tribuno. Para preparar um documento, abra ou crie um Assunto e escolha a opção de criar documento.";
  }
  return RESPOSTA_FORA_AMBITO;
}
