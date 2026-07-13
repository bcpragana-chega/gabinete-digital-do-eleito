import { z } from "zod";
import type { AnaliseDocumentoInstitucional } from "@/lib/types";

const textoOpcional = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((v) => v || undefined);
const confianca = z.number().finite().min(0).max(1);

export const analiseDocumentoInstitucionalSchema = z.object({
  tipoDocumento: z
    .enum([
      "convocatoria",
      "ordem_trabalhos",
      "ata",
      "documento_financeiro",
      "proposta",
      "regulamento",
      "outro",
      "desconhecido",
    ])
    .catch("desconhecido"),
  confiancaGlobal: confianca,
  sessao: z
    .object({
      orgao: textoOpcional,
      entidade: textoOpcional,
      tipo: z.enum(["ordinaria", "extraordinaria", "desconhecida"]).catch("desconhecida"),
      data: z
        .string()
        .trim()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .catch(undefined),
      hora: z
        .string()
        .trim()
        .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
        .optional()
        .catch(undefined),
      local: textoOpcional,
    })
    .optional(),
  pontosOrdemTrabalhos: z
    .array(
      z.object({
        numero: z.number().int().positive().optional(),
        titulo: z.string().trim().min(1).max(500),
        descricao: z
          .string()
          .trim()
          .max(4000)
          .optional()
          .transform((v) => v || undefined),
        confianca,
      }),
    )
    .max(100)
    .default([]),
  informacaoRelevante: z
    .array(
      z.object({
        titulo: z.string().trim().min(1).max(500),
        descricao: z.string().trim().min(1).max(4000),
        referenciaDocumento: textoOpcional,
      }),
    )
    .max(50)
    .default([]),
  camposIncertos: z
    .array(
      z.object({
        campo: z.string().trim().min(1).max(200),
        motivo: z.string().trim().min(1).max(1000),
      }),
    )
    .max(50)
    .default([]),
  resumoCompreensao: z.string().trim().max(4000).default(""),
});

export function normalizarAnaliseDocumentoInstitucional(
  value: unknown,
): AnaliseDocumentoInstitucional {
  const parsed = analiseDocumentoInstitucionalSchema.parse(value);
  return {
    ...parsed,
    pontosOrdemTrabalhos: parsed.pontosOrdemTrabalhos.map((ponto, index) => ({
      ...ponto,
      numero: ponto.numero ?? index + 1,
    })),
  };
}

export function analiseTemTextoSuficiente(analise: AnaliseDocumentoInstitucional) {
  return Boolean(
    analise.resumoCompreensao || analise.sessao?.orgao || analise.pontosOrdemTrabalhos.length,
  );
}

export const INSTITUTIONAL_DOCUMENT_ANALYSIS_VERSION = 1;
