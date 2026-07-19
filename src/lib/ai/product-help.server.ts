import { criarAiProvider } from "@/lib/ai/provider";
import {
  BASE_CONHECIMENTO_AJUDA,
  pedidoForaDoAmbito,
  respostaParaPedidoForaDoAmbito,
  resolverContextoAjuda,
  SYSTEM_PROMPT_AJUDA,
  type MensagemAjuda,
  type PedidoAjuda,
  type ProductHelpPageState,
  type ResultadoAjuda,
} from "@/lib/ai/product-help";

type DependenciasAjuda = {
  autenticar: (accessToken: string) => Promise<string | undefined>;
  responder: (input: {
    systemPrompt: string;
    userPrompt: string;
    maxOutputTokens: number;
  }) => Promise<string>;
};

function env(name: string) {
  return process.env[name]?.trim();
}

async function autenticarPedidoAjuda(accessToken: string) {
  const supabaseUrl = env("SUPABASE_URL") ?? env("VITE_SUPABASE_URL");
  const serviceRole = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRole) throw new Error("SUPABASE_SERVER_CONFIG_MISSING");

  const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/user`, {
    headers: {
      apikey: serviceRole,
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  if (!response.ok) return undefined;
  const user = (await response.json()) as { id?: unknown };
  return typeof user.id === "string" && user.id.trim() ? user.id : undefined;
}

function linhasEstadoPagina(pageState?: ProductHelpPageState) {
  if (!pageState) return ["Estado adicional: não fornecido por esta página."];

  const linhas = [
    pageState.emptyState === undefined
      ? undefined
      : `Estado vazio: ${pageState.emptyState ? "sim" : "não"}`,
    pageState.primaryAction ? `Ação principal visível: ${pageState.primaryAction}` : undefined,
    pageState.currentStatus ? `Estado atual: ${pageState.currentStatus}` : undefined,
    pageState.nextStep ? `Próximo passo confirmado: ${pageState.nextStep}` : undefined,
    ...(pageState.visibleWarnings ?? []).map((warning) => `Aviso visível: ${warning}`),
    ...(pageState.summaryFacts ?? []).map((fact) => `Facto resumido: ${fact}`),
  ].filter((linha): linha is string => Boolean(linha));

  return linhas.length > 0 ? linhas : ["Estado adicional: não fornecido por esta página."];
}

export function construirPromptAjuda(
  pathname: string,
  messages: MensagemAjuda[],
  pageState?: ProductHelpPageState,
) {
  const contexto = resolverContextoAjuda(pathname);
  const historico = messages
    .slice(-8)
    .map(
      (message) => `${message.role === "user" ? "UTILIZADOR" : "ASSISTENTE"}: ${message.content}`,
    )
    .join("\n");

  return [
    "CONTEXTO CONTROLADO DA PÁGINA",
    `Página: ${contexto.pagina}`,
    `Pathname normalizado: ${contexto.pathname}`,
    `Funções disponíveis: ${contexto.descricao}`,
    "",
    "ESTADO SEGURO CONFIRMADO PELA INTERFACE",
    ...linhasEstadoPagina(pageState),
    "",
    "BASE DE CONHECIMENTO CONTROLADA",
    BASE_CONHECIMENTO_AJUDA,
    "",
    "CONVERSA LIMITADA",
    historico,
  ].join("\n");
}

export async function executarPedidoAjuda(
  input: PedidoAjuda,
  deps: DependenciasAjuda,
): Promise<ResultadoAjuda> {
  const userId = await deps.autenticar(input.accessToken);
  if (!userId)
    return {
      ok: false,
      code: "AUTH_REQUIRED",
      message: "A sua sessão expirou. Inicie sessão novamente.",
    };

  const ultimaPergunta = [...input.messages].reverse().find((message) => message.role === "user");
  if (!ultimaPergunta)
    return { ok: false, code: "INVALID_INPUT", message: "Escreva uma pergunta sobre o Tribuno." };

  if (pedidoForaDoAmbito(ultimaPergunta.content)) {
    return { ok: true, answer: respostaParaPedidoForaDoAmbito(ultimaPergunta.content) };
  }

  const answer = (
    await deps.responder({
      systemPrompt: SYSTEM_PROMPT_AJUDA,
      userPrompt: construirPromptAjuda(input.pathname, input.messages, input.pageState),
      maxOutputTokens: 500,
    })
  )
    .trim()
    .slice(0, 1200);

  if (!answer)
    return {
      ok: false,
      code: "EMPTY_RESPONSE",
      message: "Não foi possível obter uma resposta. Tente novamente.",
    };
  return { ok: true, answer };
}

export function registarResultadoAjuda(input: {
  status: "success" | "error";
  durationMs: number;
  messageCount: number;
  errorCode?: string;
}) {
  console.info("[Tribuno Ajuda] Pedido concluído", {
    operation: "product_help",
    status: input.status,
    durationMs: input.durationMs,
    messageCount: input.messageCount,
    errorCode: input.errorCode,
  });
}

export async function tratarPedidoAjudaServer(data: PedidoAjuda): Promise<ResultadoAjuda> {
  const inicio = Date.now();
  try {
    const result = await executarPedidoAjuda(data, {
      autenticar: autenticarPedidoAjuda,
      responder: async (input) => {
        const provider = criarAiProvider();
        const resposta = await provider.gerarResposta({ ...input, timeoutMs: 30_000 });
        return resposta.texto;
      },
    });
    registarResultadoAjuda({
      status: result.ok ? "success" : "error",
      durationMs: Date.now() - inicio,
      messageCount: data.messages.length,
      errorCode: result.ok ? undefined : result.code,
    });
    return result;
  } catch (error) {
    const code = error instanceof Error ? error.name : "HELP_FAILED";
    registarResultadoAjuda({
      status: "error",
      durationMs: Date.now() - inicio,
      messageCount: data.messages.length,
      errorCode: code,
    });
    return {
      ok: false,
      code,
      message: "Não foi possível contactar o assistente. Tente novamente.",
    };
  }
}
