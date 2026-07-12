import type { TipoDocumentoCriado } from "@/lib/types";
import { calcularCustoEstimadoAi } from "@/lib/ai/pricing";
import type { UsoTokensAi } from "@/lib/ai/types";

export type OperacaoUsoAi =
  | "generate_document"
  | "analyze_document"
  | "summarize_document"
  | "extract_metadata"
  | "create_session"
  | (string & {});

export type EstadoUsoAi = "success" | "failed" | "partial";

export type FeatureUsoAi = string;

export type AiUsagePersistInput = {
  id?: string;
  createdAt?: string;
  userId: string;
  organizationId?: string;
  assuntoId?: string;
  documentoId?: string | null;
  provider: string;
  model: string;
  operation: OperacaoUsoAi;
  feature: FeatureUsoAi;
  documentType: TipoDocumentoCriado;
  usage?: UsoTokensAi;
  durationMs?: number;
  status: EstadoUsoAi;
  errorCode?: string;
};

export type AiUsageAuthenticatedContext = Readonly<{
  authenticatedUserId: string;
  authenticatedOrganizationId?: string;
}>;

export type AiUsageOperationalInput = Omit<AiUsagePersistInput, "userId" | "organizationId">;

export type AiUsagePersistido = AiUsagePersistInput & {
  id: string;
  createdAt: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostInput: number;
  estimatedCostOutput: number;
  estimatedCostTotal: number;
};

export function obterFeatureGeracaoDocumento(tipo: TipoDocumentoCriado): string {
  if (tipo === "Moção") return "generate_motion";
  if (tipo === "Recomendação") return "generate_recommendation";
  if (tipo === "Requerimento") return "generate_request";
  if (tipo === "Declaração de voto") return "generate_vote_declaration";
  if (tipo === "Intervenção") return "generate_intervention";
  return "generate_document";
}

function textoSeguro(valor: unknown) {
  return typeof valor === "string" ? valor.trim() : "";
}

function numeroSeguro(valor: unknown) {
  return typeof valor === "number" && Number.isFinite(valor) ? Math.trunc(valor) : 0;
}

export function normalizarUsoTokensAi(usage?: UsoTokensAi) {
  return {
    inputTokens: numeroSeguro(usage?.inputTokens),
    outputTokens: numeroSeguro(usage?.outputTokens),
    totalTokens: numeroSeguro(
      usage?.totalTokens ?? (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0),
    ),
  };
}

export function construirRegistroUsoAi(input: AiUsagePersistInput): AiUsagePersistido {
  const id = input.id?.trim() || crypto.randomUUID();
  const createdAt = input.createdAt?.trim() || new Date().toISOString();
  const usage = normalizarUsoTokensAi(input.usage);
  const custos = calcularCustoEstimadoAi({
    modelo: input.model,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
  });

  return {
    ...input,
    id,
    createdAt,
    userId: textoSeguro(input.userId),
    organizationId: textoSeguro(input.organizationId),
    assuntoId: textoSeguro(input.assuntoId),
    documentoId: textoSeguro(input.documentoId ?? undefined) || null,
    provider: textoSeguro(input.provider),
    model: textoSeguro(input.model),
    operation: textoSeguro(input.operation) as OperacaoUsoAi,
    feature: textoSeguro(input.feature),
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    totalTokens: usage.totalTokens,
    estimatedCostInput: custos.input,
    estimatedCostOutput: custos.output,
    estimatedCostTotal: custos.total,
  };
}