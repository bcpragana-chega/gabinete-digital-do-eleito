import type { AiProvider } from "@/lib/ai/types";
import { OpenAiProvider } from "@/lib/ai/openai";

function erroComCodigo(code: string, message: string) {
  const error = new Error(message);
  error.name = code;
  return error;
}

export function criarAiProvider(): AiProvider {
  const providerRaw = process.env.AI_PROVIDER?.trim();
  if (!providerRaw) {
    throw erroComCodigo(
      "AI_CONFIG_MISSING_PROVIDER",
      "AI_PROVIDER não configurado no backend. Configure, por exemplo, AI_PROVIDER=openai.",
    );
  }

  const provider = providerRaw.toLowerCase();

  if (provider === "openai") {
    return new OpenAiProvider();
  }

  throw erroComCodigo(
    "AI_PROVIDER_NOT_SUPPORTED",
    `Provider de IA não suportado: ${provider}.`,
  );
}
