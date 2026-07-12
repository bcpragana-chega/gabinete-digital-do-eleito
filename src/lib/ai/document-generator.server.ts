import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { construirContextoGeracaoDocumento } from "@/lib/ai/context-builder.server";
import { criarAiProvider } from "@/lib/ai/provider";
import { construirPromptDocumento } from "@/lib/ai/prompts/documents";
import { obterPromptSistemaTribuno } from "@/lib/ai/prompts/system";
import { obterFeatureGeracaoDocumento, type EstadoUsoAi } from "@/lib/ai/usage";
import { registrarUsoAi } from "@/lib/ai/usage.server";
import type {
  DocumentoCriadoSerializavel,
  JsonSerializable,
  ResultadoGeracaoDocumento,
} from "@/lib/ai/types";
import type { DocumentoCriado, TipoDocumentoCriado } from "@/lib/types";

const inputSchema = z.object({
  userId: z.string().min(1),
  assuntoId: z.string().min(1),
  sessaoId: z.string().min(1).optional(),
  tipo: z.custom<TipoDocumentoCriado>(),
  titulo: z.string().min(3),
  conteudoInicial: z.string().optional().default(""),
  documentosRelacionadosIds: z.array(z.string().min(1)).optional(),
  assuntoNotas: z.array(z.string()).optional(),
  assuntoTimeline: z.array(z.string()).optional(),
});

type DocumentoCriadoRow = {
  id: string;
  titulo: string;
  tipo: string;
  estado: string;
  conteudo: string | null;
  formato_conteudo: string;
  resumo: string | null;
  notas: string | null;
  tags: string[] | null;
  origem: string;
  origem_prompt: string | null;
  ia_modelo: string | null;
  ia_metadata: unknown | null;
  assunto_id: string | null;
  assembleia_id: string | null;
  ponto_id: string | null;
  documento_final_id: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  finalizado_em: string | null;
  apresentado_em: string | null;
};

function env(name: string) {
  return process.env[name]?.trim();
}

function textoSeguro(valor: unknown) {
  return typeof valor === "string" ? valor.trim() : "";
}

function organizacaoUsoSegura(valor: unknown) {
  const texto = textoSeguro(valor);
  if (!texto || texto === "Organização não indicada") return undefined;
  return texto;
}

function tipoParaRemoto(tipo: TipoDocumentoCriado) {
  if (tipo === "Moção") return "mocao";
  if (tipo === "Recomendação") return "recomendacao";
  if (tipo === "Requerimento") return "requerimento";
  if (tipo === "Declaração de voto") return "declaracao_voto";
  if (tipo === "Intervenção") return "intervencao";
  return "outro_documento";
}

function tipoDeRemoto(tipo: string): TipoDocumentoCriado {
  if (tipo === "mocao") return "Moção";
  if (tipo === "recomendacao") return "Recomendação";
  if (tipo === "requerimento") return "Requerimento";
  if (tipo === "declaracao_voto") return "Declaração de voto";
  if (tipo === "intervencao") return "Intervenção";
  return "Outro documento";
}

function estadoDeRemoto(estado: string): DocumentoCriado["estado"] {
  if (estado === "em_revisao") return "em revisão";
  if (
    estado === "rascunho" ||
    estado === "final" ||
    estado === "pronto" ||
    estado === "apresentado" ||
    estado === "arquivado"
  ) {
    return estado;
  }
  return "rascunho";
}

function mapearDocumentoCriado(row: DocumentoCriadoRow): DocumentoCriado {
  return {
    id: row.id,
    titulo: textoSeguro(row.titulo),
    tipo: tipoDeRemoto(textoSeguro(row.tipo)),
    estado: estadoDeRemoto(textoSeguro(row.estado)),
    conteudo: row.conteudo ?? "",
    formatoConteudo: textoSeguro(row.formato_conteudo) || "markdown",
    resumo: textoSeguro(row.resumo) || undefined,
    notas: textoSeguro(row.notas) || undefined,
    tags: row.tags ?? [],
    origem: textoSeguro(row.origem) || "ia",
    origemPrompt: textoSeguro(row.origem_prompt) || undefined,
    iaModelo: textoSeguro(row.ia_modelo) || undefined,
    iaMetadata: row.ia_metadata ?? undefined,
    assuntoId: row.assunto_id ?? undefined,
    assembleiaId: row.assembleia_id ?? undefined,
    pontoId: row.ponto_id ?? undefined,
    documentoFinalId: row.documento_final_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at ?? undefined,
    finalizadoEm: row.finalizado_em ?? undefined,
    apresentadoEm: row.apresentado_em ?? undefined,
  };
}

function valorSerializavel(valor: unknown): JsonSerializable | undefined {
  if (valor === undefined) return undefined;
  if (valor === null) return null;

  if (typeof valor === "string" || typeof valor === "number" || typeof valor === "boolean") {
    return valor;
  }

  if (Array.isArray(valor)) {
    return valor.map((item) => valorSerializavel(item) ?? null);
  }

  if (typeof valor === "object") {
    const serializavel: Record<string, JsonSerializable> = {};

    Object.entries(valor).forEach(([chave, item]) => {
      const proximo = valorSerializavel(item);
      if (proximo !== undefined) {
        serializavel[chave] = proximo;
      }
    });

    return serializavel;
  }

  return undefined;
}

function documentoSerializavel(documento: DocumentoCriado): DocumentoCriadoSerializavel {
  const { conteudoJson: conteudoJsonOriginal, iaMetadata: iaMetadataOriginal, ...base } = documento;
  const conteudoJson = valorSerializavel(conteudoJsonOriginal);
  const iaMetadata = valorSerializavel(iaMetadataOriginal);

  return {
    ...base,
    ...(conteudoJson !== undefined ? { conteudoJson } : {}),
    ...(iaMetadata !== undefined ? { iaMetadata } : {}),
  };
}

function normalizarErro(error: unknown): { code: string; message: string } {
  if (error instanceof Error) {
    if (error.name === "AI_TIMEOUT") {
      return {
        code: "AI_TIMEOUT",
        message: "A geração demorou demasiado tempo. Tente novamente.",
      };
    }

    if (error.name === "AI_CONFIG_MISSING") {
      return {
        code: "AI_CONFIG_MISSING",
        message:
          "A IA ainda não está configurada no backend. Defina OPENAI_API_KEY para ativar a geração.",
      };
    }

    if (
      error.name === "AI_CONFIG_MISSING_MODEL" ||
      error.name === "AI_CONFIG_MISSING_PROVIDER" ||
      error.name === "AI_PROVIDER_NOT_SUPPORTED"
    ) {
      return {
        code: error.name,
        message:
          "Configuração de IA inválida no backend. Verifique AI_PROVIDER, OPENAI_MODEL e OPENAI_API_KEY.",
      };
    }

    if (error.message.includes("ASSUNTO_NOT_FOUND")) {
      return {
        code: "ASSUNTO_NOT_FOUND",
        message: "Não foi possível encontrar o assunto para gerar o documento.",
      };
    }

    if (error.message.includes("SUPABASE_SERVER_CONFIG_MISSING")) {
      return {
        code: "SUPABASE_SERVER_CONFIG_MISSING",
        message:
          "Configuração de backend em falta. Defina SUPABASE_SERVICE_ROLE_KEY para construir contexto no servidor.",
      };
    }

    return {
      code: error.name || "AI_GENERATION_ERROR",
      message: error.message || "Não foi possível gerar o documento neste momento.",
    };
  }

  return {
    code: "AI_GENERATION_ERROR",
    message: "Não foi possível gerar o documento neste momento.",
  };
}

const CODIGOS_ERRO_CONFIG_AI = new Set([
  "AI_CONFIG_MISSING",
  "AI_CONFIG_MISSING_MODEL",
  "AI_CONFIG_MISSING_PROVIDER",
  "AI_PROVIDER_NOT_SUPPORTED",
]);

function estadoEnv(valor: string | undefined) {
  return valor && valor.trim() ? "SET" : "MISSING";
}

function diagnosticoSeguroConfiguracaoAi() {
  const provider = process.env.AI_PROVIDER;
  const model = process.env.OPENAI_MODEL;
  const apiKey = process.env.OPENAI_API_KEY;

  return {
    AI_PROVIDER: estadoEnv(provider),
    OPENAI_MODEL: estadoEnv(model),
    OPENAI_API_KEY: estadoEnv(apiKey),
    OPENAI_API_KEY_length: apiKey?.length ?? 0,
    NODE_ENV: process.env.NODE_ENV ?? "undefined",
    VERCEL_ENV: process.env.VERCEL_ENV ?? "undefined",
  };
}

function extrairTextoSeguro(valor: unknown) {
  return typeof valor === "string" ? valor.trim() : "";
}

function diagnosticarErroAi(error: unknown) {
  if (!(error instanceof Error)) {
    return {
      code: "AI_GENERATION_ERROR",
      message: "Erro desconhecido",
      status: undefined,
      responseId: undefined,
      operation: "generate_document",
      model: undefined,
      provider: undefined,
    };
  }

  const anyError = error as Error & {
    status?: unknown;
    responseId?: unknown;
    provider?: unknown;
    model?: unknown;
    operation?: unknown;
  };

  return {
    code: error.name || "AI_GENERATION_ERROR",
    message: error.message || "Erro desconhecido",
    status: typeof anyError.status === "number" ? anyError.status : undefined,
    responseId: extrairTextoSeguro(anyError.responseId),
    operation: extrairTextoSeguro(anyError.operation) || "generate_document",
    model: extrairTextoSeguro(anyError.model) || undefined,
    provider: extrairTextoSeguro(anyError.provider) || undefined,
  };
}

async function guardarDocumentoGeradoRemotamente(input: {
  userId: string;
  assuntoId: string;
  tipo: TipoDocumentoCriado;
  titulo: string;
  conteudo: string;
  modelo: string;
  provider: string;
  promptOrigem: string;
  metadata?: Record<string, unknown>;
}) {
  const supabaseUrl = env("SUPABASE_URL") ?? env("VITE_SUPABASE_URL");
  const serviceRole = env("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRole) {
    throw new Error(
      "SUPABASE_SERVER_CONFIG_MISSING: defina SUPABASE_URL/VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no backend.",
    );
  }

  const agora = new Date().toISOString();
  const id = crypto.randomUUID();

  const row = {
    id,
    user_id: input.userId,
    titulo: input.titulo,
    tipo: tipoParaRemoto(input.tipo),
    estado: "rascunho",
    conteudo: input.conteudo,
    formato_conteudo: "markdown",
    origem: "ia",
    origem_prompt: input.promptOrigem,
    ia_modelo: input.modelo,
    ia_metadata: {
      provider: input.provider,
      ...input.metadata,
    },
    assunto_id: input.assuntoId,
    created_at: agora,
    updated_at: agora,
  };

  const response = await fetch(
    `${supabaseUrl.replace(/\/$/, "")}/rest/v1/documentos_criados?select=*`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceRole,
        Authorization: `Bearer ${serviceRole}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify(row),
    },
  );

  if (!response.ok) {
    const erro = await response.text().catch(() => "Erro desconhecido.");
    throw new Error(`SUPABASE_INSERT_DOCUMENTO_CRIADO: ${erro}`);
  }

  const created = (await response.json()) as DocumentoCriadoRow[];
  if (!Array.isArray(created) || !created[0]) {
    throw new Error("SUPABASE_INSERT_EMPTY_RESPONSE");
  }

  return mapearDocumentoCriado(created[0]);
}

export const gerarDocumentoAssistido = createServerFn({ method: "POST" })
  .validator((input) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<ResultadoGeracaoDocumento> => {
    const inicio = Date.now();
    console.info("[Tribuno AI] Server function iniciada", {
      AI_PROVIDER: estadoEnv(process.env.AI_PROVIDER),
      OPENAI_MODEL: estadoEnv(process.env.OPENAI_MODEL),
      OPENAI_API_KEY: estadoEnv(process.env.OPENAI_API_KEY),
    });

    let respostaAi:
      | {
          texto: string;
          modelo: string;
          provider: string;
          usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
          metadata?: Record<string, unknown>;
        }
      | undefined;
    let documentoGerado: DocumentoCriado | undefined;
    let usoRegistrado = false;
    let contextoGeracao: Awaited<ReturnType<typeof construirContextoGeracaoDocumento>> | undefined;

    const registrarUso = (status: EstadoUsoAi, errorCode?: string) => {
      if (!respostaAi || usoRegistrado) return;
      usoRegistrado = true;

      void registrarUsoAi({
        userId: data.userId,
        organizationId: organizacaoUsoSegura(contextoGeracao?.perfil.organizacao),
        assuntoId: data.assuntoId,
        documentoId: documentoGerado?.id ?? null,
        provider: respostaAi.provider,
        model: respostaAi.modelo,
        operation: "generate_document",
        feature: obterFeatureGeracaoDocumento(data.tipo),
        documentType: data.tipo,
        usage: respostaAi.usage,
        durationMs: Date.now() - inicio,
        status,
        errorCode,
      });
    };

    try {
      contextoGeracao = await construirContextoGeracaoDocumento(data);
      const provider = criarAiProvider();
      const systemPrompt = obterPromptSistemaTribuno();
      const userPrompt = construirPromptDocumento(contextoGeracao);

      respostaAi = await provider.gerarDocumento({
        systemPrompt,
        userPrompt,
        timeoutMs: 70_000,
        maxOutputTokens: Number.parseInt(process.env.OPENAI_MAX_OUTPUT_TOKENS ?? "", 10),
      });

      try {
        documentoGerado = await guardarDocumentoGeradoRemotamente({
          userId: data.userId,
          assuntoId: data.assuntoId,
          tipo: data.tipo,
          titulo: data.titulo,
          conteudo: respostaAi.texto,
          modelo: respostaAi.modelo,
          provider: respostaAi.provider,
          promptOrigem: data.conteudoInicial,
          metadata: {
            ...respostaAi.metadata,
            documentosRelacionados: contextoGeracao.documentosRelacionados.length,
            anexosTextuais: contextoGeracao.anexosTextuais.length,
            assunto: contextoGeracao.assunto.titulo,
            sessaoId: contextoGeracao.sessao?.id,
            notasAssunto: contextoGeracao.assunto.notas.length,
            timelineAssunto: contextoGeracao.assunto.timeline.length,
            baseJuridica: {
              diploma: contextoGeracao.baseJuridica.diploma,
              tipoOrgao: contextoGeracao.baseJuridica.tipoOrgao,
              tipoDocumental: contextoGeracao.baseJuridica.tipoDocumental,
              orgaoApresentacao: contextoGeracao.baseJuridica.orgaoApresentacao,
              destinatario: contextoGeracao.baseJuridica.destinatario,
            },
          },
        });
        registrarUso("success");
      } catch (error) {
        registrarUso(
          "partial",
          error instanceof Error && error.name !== "Error"
            ? error.name
            : "SUPABASE_INSERT_DOCUMENTO_CRIADO",
        );
        throw error;
      }

      return {
        ok: true,
        documento: documentoSerializavel(documentoGerado),
      };
    } catch (error) {
      const diagnosticoErro = diagnosticarErroAi(error);

      console.error("[Tribuno AI] Erro na geração", {
        code: diagnosticoErro.code,
        message: diagnosticoErro.message,
        status: diagnosticoErro.status,
        responseId: diagnosticoErro.responseId || undefined,
        operation: diagnosticoErro.operation,
        model: diagnosticoErro.model,
        provider: diagnosticoErro.provider,
      });

      if (respostaAi && !usoRegistrado) {
        registrarUso("failed", error instanceof Error ? error.name : "AI_GENERATION_ERROR");
      }

      if (error instanceof Error && CODIGOS_ERRO_CONFIG_AI.has(error.name)) {
        console.error("[Tribuno AI] Diagnóstico seguro de configuração", {
          code: error.name,
          ...diagnosticoSeguroConfiguracaoAi(),
        });
      }

      const normalizado = normalizarErro(error);

      return {
        ok: false,
        code: normalizado.code,
        message: normalizado.message,
      };
    }
  });
