import {
  construirRegistroUsoAi,
  type AiUsageAuthenticatedContext,
  type AiUsageOperationalInput,
} from "@/lib/ai/usage";

function env(name: string) {
  return process.env[name]?.trim();
}

function valorSeguro(valor: unknown) {
  return typeof valor === "string" ? valor.trim() : "";
}

function numeroSeguro(valor: unknown) {
  return typeof valor === "number" && Number.isFinite(valor) ? Math.trunc(valor) : null;
}

export async function registrarUsoAi(
  authContext: AiUsageAuthenticatedContext,
  input: AiUsageOperationalInput,
) {
  const supabaseUrl = env("SUPABASE_URL") ?? env("VITE_SUPABASE_URL");
  const serviceRole = env("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRole) {
    console.warn("[Tribuno AI] Monitorização ignorada: configuração Supabase em falta.", {
      supabaseUrl: Boolean(supabaseUrl),
      serviceRole: Boolean(serviceRole),
    });
    return;
  }

  const registro = construirRegistroUsoAi({
    ...input,
    userId: authContext.authenticatedUserId,
    organizationId: authContext.authenticatedOrganizationId,
  });

  const row = {
    id: registro.id,
    created_at: registro.createdAt,
    user_id: registro.userId,
    organization_id: registro.organizationId || null,
    assunto_id: registro.assuntoId || null,
    documento_id: registro.documentoId || null,
    provider: registro.provider,
    model: registro.model,
    operation: registro.operation,
    feature: registro.feature,
    document_type: registro.documentType,
    input_tokens: numeroSeguro(registro.inputTokens),
    output_tokens: numeroSeguro(registro.outputTokens),
    total_tokens: numeroSeguro(registro.totalTokens),
    estimated_cost_input: registro.estimatedCostInput,
    estimated_cost_output: registro.estimatedCostOutput,
    estimated_cost_total: registro.estimatedCostTotal,
    duration_ms: numeroSeguro(registro.durationMs),
    status: registro.status,
    error_code: valorSeguro(registro.errorCode) || null,
  };

  try {
    const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/ai_usage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceRole,
        Authorization: `Bearer ${serviceRole}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify(row),
    });

    if (!response.ok) {
      const erro = await response.text().catch(() => "Erro desconhecido.");
      throw new Error(`SUPABASE_INSERT_AI_USAGE: ${erro}`);
    }
  } catch (error) {
    console.warn("[Tribuno AI] Falha ao registar utilização de IA.", {
      code: error instanceof Error ? error.name : undefined,
      message: error instanceof Error ? error.message : "Erro desconhecido",
      operation: registro.operation,
      feature: registro.feature,
      model: registro.model,
    });
  }
}