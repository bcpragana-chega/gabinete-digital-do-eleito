import type { AiProvider, PedidoGeracaoAi, RespostaGeracaoAi } from "@/lib/ai/types";

type OpenAiResponsesPayload = {
  model: string;
  input: Array<{
    role: "system" | "user";
    content: Array<{ type: "input_text"; text: string }>;
  }>;
  temperature?: number;
  max_output_tokens?: number;
};

function extrairTextoRespostaOpenAi(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";

  const raw = payload as {
    output_text?: unknown;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };

  if (typeof raw.output_text === "string" && raw.output_text.trim()) {
    return raw.output_text.trim();
  }

  const textos = (raw.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "output_text" || item.type === "text")
    .map((item) => (typeof item.text === "string" ? item.text : ""))
    .filter(Boolean);

  return textos.join("\n").trim();
}

function erroComCodigo(code: string, message: string) {
  const error = new Error(message);
  error.name = code;
  return error;
}

export class OpenAiProvider implements AiProvider {
  readonly name = "openai";

  private readonly apiKey: string;
  private readonly model: string;
  private readonly maxOutputTokens: number;

  private resolverMaxOutputTokens(input?: number) {
    const fallback = 1200;
    const value = input ?? Number.parseInt(process.env.OPENAI_MAX_OUTPUT_TOKENS ?? "", 10);

    if (!Number.isFinite(value)) return fallback;

    return Math.max(256, Math.min(4096, Math.trunc(value)));
  }

  constructor(input?: { apiKey?: string; model?: string }) {
    this.apiKey = input?.apiKey ?? process.env.OPENAI_API_KEY ?? "";
    this.model = (input?.model ?? process.env.OPENAI_MODEL ?? "gpt-5-mini").trim();
    this.maxOutputTokens = this.resolverMaxOutputTokens();
  }

  async gerarDocumento(input: PedidoGeracaoAi): Promise<RespostaGeracaoAi> {
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
      const payload: OpenAiResponsesPayload = {
        model: this.model,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: input.systemPrompt }],
          },
          {
            role: "user",
            content: [{ type: "input_text", text: input.userPrompt }],
          },
        ],
        temperature: 0.25,
        max_output_tokens: this.resolverMaxOutputTokens(input.maxOutputTokens ?? this.maxOutputTokens),
      };

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

      if (!response.ok) {
        const message =
          typeof body === "object" && body && "error" in body
            ? JSON.stringify((body as { error?: unknown }).error)
            : `OpenAI devolveu HTTP ${response.status}.`;
        throw erroComCodigo("AI_PROVIDER_ERROR", message);
      }

      const texto = extrairTextoRespostaOpenAi(body);
      if (!texto) {
        throw erroComCodigo(
          "AI_EMPTY_RESPONSE",
          "A IA não devolveu conteúdo textual para o documento.",
        );
      }

      const usage =
        typeof body === "object" && body && "usage" in body
          ? (body as { usage?: Record<string, unknown> }).usage
          : undefined;

      if (usage && typeof usage === "object") {
        const inputTokens =
          typeof usage.input_tokens === "number" ? usage.input_tokens : undefined;
        const outputTokens =
          typeof usage.output_tokens === "number" ? usage.output_tokens : undefined;
        const totalTokens =
          typeof usage.total_tokens === "number" ? usage.total_tokens : undefined;

        console.info("[Tribuno AI] Uso OpenAI", {
          provider: this.name,
          model: this.model,
          inputTokens,
          outputTokens,
          totalTokens,
        });
      }

      return {
        texto,
        modelo: this.model,
        provider: this.name,
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
        throw erroComCodigo("AI_TIMEOUT", "A geração excedeu o tempo limite configurado.");
      }

      throw error;
    } finally {
      globalThis.clearTimeout(timeout);
    }
  }
}
