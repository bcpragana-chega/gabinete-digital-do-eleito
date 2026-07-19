import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { ResultadoAjuda } from "@/lib/ai/product-help";

const mensagemSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(1000),
});

export const pedidoAjudaSchema = z.object({
  accessToken: z.string().min(1).max(8192),
  pathname: z.string().min(1).max(300),
  messages: z.array(mensagemSchema).min(1).max(8),
});

export const pedirAjudaTribuno = createServerFn({ method: "POST" })
  .validator((input) => pedidoAjudaSchema.parse(input))
  .handler(async ({ data }): Promise<ResultadoAjuda> => {
    const { tratarPedidoAjudaServer } = await import("@/lib/ai/product-help.server");
    return tratarPedidoAjudaServer(data);
  });
