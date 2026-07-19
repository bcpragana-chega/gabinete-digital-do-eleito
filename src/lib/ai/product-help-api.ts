import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { ResultadoAjuda } from "@/lib/ai/product-help";

const mensagemSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(1000),
});

const textoEstadoSchema = z.string().trim().min(1).max(160);

export const productHelpPageStateSchema = z
  .object({
    emptyState: z.boolean().optional(),
    primaryAction: textoEstadoSchema.optional(),
    currentStatus: textoEstadoSchema.optional(),
    nextStep: textoEstadoSchema.optional(),
    visibleWarnings: z.array(textoEstadoSchema).max(5).optional(),
    summaryFacts: z.array(textoEstadoSchema).max(6).optional(),
  })
  .strict();

export const pedidoAjudaSchema = z.object({
  accessToken: z.string().min(1).max(8192),
  pathname: z.string().min(1).max(300),
  messages: z.array(mensagemSchema).min(1).max(8),
  pageState: productHelpPageStateSchema.optional(),
});

export const pedirAjudaTribuno = createServerFn({ method: "POST" })
  .validator((input) => pedidoAjudaSchema.parse(input))
  .handler(async ({ data }): Promise<ResultadoAjuda> => {
    const { tratarPedidoAjudaServer } = await import("@/lib/ai/product-help.server");
    return tratarPedidoAjudaServer(data);
  });
