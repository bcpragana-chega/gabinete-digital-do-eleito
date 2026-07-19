import type { AiProvider, PedidoGeracaoAi, RespostaGeracaoAi, UsoTokensAi } from "@/lib/ai/types";

type OpenAiResponsesPayload = {
  model: string;
  instructions?: string;
  reasoning?: {
    effort?: "minimal" | "low" | "medium" | "high" | "xhigh";
  };
  input: Array<{
    role: "user";
    content: Array<{ type: "input_text"; text: string }>;
  }>;
  temperature?: number;
  max_output_tokens?: number;
};

type OpenAiResponseOutputContent = {
  type?: string;
  text?: unknown;
  content?: unknown;
  refusal?: unknown;
};

type OpenAiResponseOutputItem = {
  type?: string;
  content?: unknown;
};

type OpenAiResponseBody = {
  id?: unknown;
  status?: unknown;
  output_text?: unknown;
  output?: unknown;
  usage?: unknown;
  error?: unknown;
  incomplete_details?: {
    reason?: unknown;
  };
};

type AiErrorContext = {
  status?: number;
  responseId?: string;
  provider?: string;
  model?: string;
  operation?: string;
};

function isPlainObject(valor: unknown): valor is Record<string, unknown> {
  return Boolean(valor) && typeof valor === "object" && !Array.isArray(valor);
}

function normalizarTexto(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

function modeloSuportaReasoning(modelo: string) {
  return /^gpt-5([.-]|$)/i.test(modelo.trim());
}

function extrairTextoDeConteudo(content: unknown): string[] {
  if (!Array.isArray(content)) return [];

  return content.flatMap((item) => {
    if (typeof item === "string") {
      return item.trim() ? [item.trim()] : [];
    }

    if (!isPlainObject(item)) return [];

    const bloco = item as OpenAiResponseOutputContent;
    const texto = normalizarTexto(bloco.text);

    if (bloco.type === "output_text" || bloco.type === "text") {
      return texto ? [texto] : [];
    }

    if (texto) return [texto];

    return extrairTextoDeConteudo(bloco.content);
  });
}

function extrairTextoRespostaOpenAi(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";

  const raw = payload as OpenAiResponseBody;

  const textoTopLevel = normalizarTexto(raw.output_text);
  if (textoTopLevel) {
    return textoTopLevel;
  }

  const output = Array.isArray(raw.output) ? (raw.output as OpenAiResponseOutputItem[]) : [];
  const textos = output.flatMap((item) => {
    if (!isPlainObject(item)) return [];

    return extrairTextoDeConteudo((item as OpenAiResponseOutputItem).content);
  });

  return textos.join("\n").trim();
}

function extrairTiposOutput(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") return [];

  const raw = payload as OpenAiResponseBody;
  if (!Array.isArray(raw.output)) return [];

  return raw.output
    .map((item) => {
      if (!isPlainObject(item)) return "unknown";
      return typeof item.type === "string" ? item.type : "unknown";
    })
    .filter((tipo, index, lista) => lista.indexOf(tipo) === index);
}

function diagnosticoRespostaOpenAi(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return {
      responseId: undefined,
      status: undefined,
      hasOutputText: false,
      outputTextLength: 0,
      outputItemTypes: [] as string[],
      incompleteReason: undefined as string | undefined,
    };
  }

  const raw = payload as OpenAiResponseBody;
  const outputText = normalizarTexto(raw.output_text);
  const incompleteReason =
    raw.status === "incomplete" && raw.incomplete_details
      ? normalizarTexto(raw.incomplete_details.reason)
      : "";

  return {
    responseId: typeof raw.id === "string" ? raw.id : undefined,
    status: typeof raw.status === "string" ? raw.status : undefined,
    hasOutputText: Boolean(outputText),
    outputTextLength: outputText.length,
    outputItemTypes: extrairTiposOutput(payload),
    incompleteReason: incompleteReason || undefined,
  };
}

function logRespostaOpenAiDiagnostico(payload: unknown) {
  if (process.env.NODE_ENV === "production") return;

  const diagnostico = diagnosticoRespostaOpenAi(payload);
  console.info("[Tribuno AI] Diagnóstico resposta OpenAI", diagnostico);

  if (diagnostico.status === "incomplete") {
    console.warn("[Tribuno AI] Resposta OpenAI incompleta", {
      responseId: diagnostico.responseId,
      incompleteReason: diagnostico.incompleteReason,
      outputTextLength: diagnostico.outputTextLength,
      outputItemTypes: diagnostico.outputItemTypes,
    });
  }
}

function erroComCodigo(code: string, message: string, context?: AiErrorContext) {
  const error = new Error(message);
  error.name = code;
  Object.assign(error, context);
  return error;
}

function modeloSuportaTemperature(modelo: string) {
  return !/^gpt-5([.-]|$)/i.test(modelo.trim());
}

function construirInstructionsParaDocumento(systemPrompt: string) {
  return `${systemPrompt}\n\nInstrução obrigatória: Produz obrigatoriamente texto final do documento. Não devolvas apenas raciocínio.`;
}

export class OpenAiProvider implements AiProvider {
  readonly name = "openai";

  private readonly apiKey: string;
  private readonly model: string;
  private readonly maxOutputTokens: number;

  private resolverMaxOutputTokens(input?: number) {
    const fallback = 8192;
    const value = input ?? Number.parseInt(process.env.OPENAI_MAX_OUTPUT_TOKENS ?? "", 10);

    if (!Number.isFinite(value)) return fallback;

    return Math.max(4096, Math.min(16384, Math.trunc(value)));
  }

  constructor(input?: { apiKey?: string; model?: string }) {
    this.apiKey = input?.apiKey ?? process.env.OPENAI_API_KEY ?? "";
    this.model = (input?.model ?? process.env.OPENAI_MODEL ?? "gpt-5-mini").trim();
    this.maxOutputTokens = this.resolverMaxOutputTokens();
  }

  async gerarDocumento(input: PedidoGeracaoAi): Promise<RespostaGeracaoAi> {
    return this.executarResposta(
      {
        ...input,
        systemPrompt: construirInstructionsParaDocumento(input.systemPrompt),
        maxOutputTokens: this.resolverMaxOutputTokens(
          input.maxOutputTokens ?? this.maxOutputTokens,
        ),
      },
      "generate_document",
    );
  }

  async gerarResposta(input: PedidoGeracaoAi): Promise<RespostaGeracaoAi> {
    const maxOutputTokens = Math.max(128, Math.min(1024, input.maxOutputTokens ?? 500));
    return this.executarResposta({ ...input, maxOutputTokens }, "product_help");
  }

  private async executarResposta(
    input: PedidoGeracaoAi,
    operation: "generate_document" | "product_help",
  ): Promise<RespostaGeracaoAi> {
    if (!this.apiKey) {
      throw erroComCodigo(
        "AI_CONFIG_MISSING",
        "OPENAI_API_KEY não configurada no backend. Defina a variável de ambiente para ativar a geração.",
      );
    }

    if (!this.model) {
      throw erroComCodigo(
        "AI_CONFIG_MISSING_MODEL",
        "OPENAI_MODEL está vazio no backend. Defina um modelo válido.",
      );
    }

    const controller = new AbortController();
    const timeout = globalThis.setTimeout(() => controller.abort(), input.timeoutMs ?? 60_000);

    try {
      const maxOutputTokens = input.maxOutputTokens ?? this.maxOutputTokens;
      const payload: OpenAiResponsesPayload = {
        model: this.model,
        instructions: input.systemPrompt,
        input: [
          {
            role: "user",
            content: [{ type: "input_text", text: input.userPrompt }],
          },
        ],
        max_output_tokens: maxOutputTokens,
      };

      if (modeloSuportaReasoning(this.model)) {
        payload.reasoning = { effort: "minimal" };
      }

      if (modeloSuportaTemperature(this.model)) {
        payload.temperature = 0.25;
      }

      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const body = (await response.json().catch(() => undefined)) as unknown;
      const diagnostico = diagnosticoRespostaOpenAi(body);

      if (!response.ok) {
        logRespostaOpenAiDiagnostico(body);
        const message =
          typeof body === "object" && body && "error" in body
            ? (() => {
                const errorBody = (body as OpenAiResponseBody).error;
                if (isPlainObject(errorBody) && typeof errorBody.message === "string") {
                  return errorBody.message;
                }
                return JSON.stringify(errorBody);
              })()
            : `OpenAI devolveu HTTP ${response.status}.`;
        throw erroComCodigo("AI_PROVIDER_ERROR", message, {
          status: response.status,
          responseId: diagnostico.responseId,
          provider: this.name,
          model: this.model,
          operation,
        });
      }

      logRespostaOpenAiDiagnostico(body);

      if (diagnostico.status === "incomplete") {
        console.warn("[Tribuno AI] Resposta OpenAI marcada como incomplete", {
          responseId: diagnostico.responseId,
          incompleteReason: diagnostico.incompleteReason,
          model: this.model,
          provider: this.name,
          operation,
          maxOutputTokens,
        });
      }

      const texto = extrairTextoRespostaOpenAi(body);
      if (!texto) {
        throw erroComCodigo(
          "AI_EMPTY_RESPONSE",
          `A IA não devolveu conteúdo textual. Diagnóstico: responseId=${diagnostico.responseId ?? "n/a"}, status=${diagnostico.status ?? "n/a"}, hasOutputText=${diagnostico.hasOutputText}, outputTextLength=${diagnostico.outputTextLength}, outputItemTypes=${diagnostico.outputItemTypes.join(",") || "none"}${diagnostico.incompleteReason ? `, incompleteReason=${diagnostico.incompleteReason}` : ""}.`,
          {
            status: response.status,
            responseId: diagnostico.responseId,
            provider: this.name,
            model: this.model,
            operation,
          },
        );
      }

      const usage =
        typeof body === "object" && body && "usage" in body
          ? (body as { usage?: Record<string, unknown> }).usage
          : undefined;

      const usoTokens: UsoTokensAi | undefined =
        usage && typeof usage === "object"
          ? {
              inputTokens: typeof usage.input_tokens === "number" ? usage.input_tokens : undefined,
              outputTokens:
                typeof usage.output_tokens === "number" ? usage.output_tokens : undefined,
              totalTokens: typeof usage.total_tokens === "number" ? usage.total_tokens : undefined,
            }
          : undefined;

      if (usage && typeof usage === "object") {
        console.info("[Tribuno AI] Uso OpenAI", {
          provider: this.name,
          model: this.model,
          inputTokens: usoTokens?.inputTokens,
          outputTokens: usoTokens?.outputTokens,
          totalTokens: usoTokens?.totalTokens,
        });
      }

      return {
        texto,
        modelo: this.model,
        provider: this.name,
        usage: usoTokens,
        metadata: {
          responseId:
            typeof body === "object" && body && "id" in body
              ? (body as { id?: unknown }).id
              : undefined,
          usage,
        },
      };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw erroComCodigo("AI_TIMEOUT", "A geração excedeu o tempo limite configurado.", {
          provider: this.name,
          model: this.model,
          operation,
        });
      }

      throw error;
    } finally {
      globalThis.clearTimeout(timeout);
    }
  }
}
