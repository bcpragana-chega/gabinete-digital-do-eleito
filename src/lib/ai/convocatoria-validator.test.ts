import assert from "node:assert/strict";
import test from "node:test";
import type { ResolvedInstitutionalContext } from "@/lib/ai/institutional-context";
import type { ConvocatoriaExtractionResult } from "@/lib/ai/convocatoria-types";
import {
  CONVOCATORIA_MAX_FILE_SIZE,
  construirPreviewConvocatoria,
  detectarDuplicadoConvocatoria,
  normalizarPontosConvocatoria,
  validarExtracaoConvocatoria,
  validarFicheiroConvocatoria,
} from "@/lib/ai/convocatoria-validator";
import type { Assembleia } from "@/lib/types";

function context(level: "PARISH" | "MUNICIPALITY"): ResolvedInstitutionalContext {
  const parish = level === "PARISH";
  return {
    electedOfficial: {
      id: "user-1",
      name: "Benjamin Pragana",
      role: parish ? "PARISH_ASSEMBLY_MEMBER" : "MUNICIPAL_ASSEMBLY_MEMBER",
      institutionalTitle: parish
        ? "Membro da Assembleia de Freguesia"
        : "Membro da Assembleia Municipal",
    },
    territory: {
      level,
      municipalityName: "Lagoa",
      parishName: parish ? "Porches" : undefined,
    },
    institution: {
      deliberativeBody: {
        type: parish ? "PARISH_ASSEMBLY" : "MUNICIPAL_ASSEMBLY",
        officialName: parish ? "Assembleia de Freguesia de Porches" : "Assembleia Municipal de Lagoa",
      },
      executiveBody: {
        type: parish ? "PARISH_EXECUTIVE" : "MUNICIPAL_EXECUTIVE",
        officialName: parish ? "Junta de Freguesia de Porches" : "Câmara Municipal de Lagoa",
      },
    },
    legal: {
      status: "VALID",
      recipient: {
        type: "DELIBERATIVE_BODY",
        officialName: parish ? "Assembleia de Freguesia de Porches" : "Assembleia Municipal de Lagoa",
      },
      competenceGroup: "CONSULTATIVE",
      articles: [],
      confidence: "HIGH",
    },
    validation: {
      valid: true,
      errors: [],
      warnings: [],
    },
  };
}

function extraction(
  partial?: Omit<Partial<ConvocatoriaExtractionResult>, "session"> & {
    session?: Partial<ConvocatoriaExtractionResult["session"]>;
  },
): ConvocatoriaExtractionResult {
  const base: ConvocatoriaExtractionResult = {
    documentClassification: {
      isConvocatoria: true,
      confidence: 0.92,
    },
    session: {
      bodyName: "Assembleia de Freguesia de Porches",
      bodyType: "PARISH_ASSEMBLY",
      sessionType: "ORDINARY",
      sessionTitle: "Sessão ordinária da Assembleia de Freguesia de Porches",
      date: "2026-07-30",
      time: "21:30",
      location: "Centro Cultural D. Dinis",
    },
    agendaItems: [
      { order: 1, title: "Período antes da ordem do dia" },
      { order: 2, title: "Aprovação da ata" },
    ],
    observations: [],
    fieldConfidence: {},
  };

  return {
    ...base,
    ...partial,
    session: {
      ...base.session,
      ...partial?.session,
    },
  };
}

test("aceita PDF e rejeita tipos ou tamanhos incompatíveis", () => {
  assert.equal(validarFicheiroConvocatoria({ type: "application/pdf", size: 1000 }), undefined);
  assert.equal(validarFicheiroConvocatoria({ type: "text/plain", size: 1000 })?.code, "INVALID_FILE_TYPE");
  assert.equal(
    validarFicheiroConvocatoria({ type: "application/pdf", size: CONVOCATORIA_MAX_FILE_SIZE + 1 })?.code,
    "FILE_TOO_LARGE",
  );
});

test("valida convocatória de assembleia de freguesia compatível", () => {
  const result = validarExtracaoConvocatoria(extraction(), context("PARISH"));
  assert.equal(result, undefined);
  const preview = construirPreviewConvocatoria(extraction(), context("PARISH"));
  assert.equal(preview.orgao, "Assembleia de Freguesia de Porches");
  assert.equal(preview.tipoSessao, "Ordinária");
  assert.equal(preview.pontos.length, 2);
});

test("valida convocatória de assembleia municipal compatível", () => {
  const result = validarExtracaoConvocatoria(
    extraction({
      session: {
        bodyName: "Assembleia Municipal de Lagoa",
        bodyType: "MUNICIPAL_ASSEMBLY",
        sessionTitle: "Sessão extraordinária da Assembleia Municipal de Lagoa",
        sessionType: "EXTRAORDINARY",
      },
    }),
    context("MUNICIPALITY"),
  );
  assert.equal(result, undefined);
});

test("rejeita documento que não é convocatória", () => {
  const result = validarExtracaoConvocatoria(
    extraction({ documentClassification: { isConvocatoria: false, confidence: 0.2 } }),
    context("PARISH"),
  );
  assert.equal(result?.code, "DOCUMENT_NOT_CONVOCATORIA");
});

test("rejeita órgão incompatível e combinação impossível", () => {
  assert.equal(
    validarExtracaoConvocatoria(
      extraction({ session: { bodyName: "Câmara Municipal de Porches", bodyType: "MUNICIPAL_EXECUTIVE" } }),
      context("PARISH"),
    )?.code,
    "INSTITUTIONAL_BODY_MISMATCH",
  );
});

test("rejeita dados mínimos em falta", () => {
  assert.equal(
    validarExtracaoConvocatoria(extraction({ session: { date: undefined } }), context("PARISH"))?.code,
    "MISSING_REQUIRED_SESSION_DATA",
  );
});

test("normaliza ordem de trabalhos e remove ruído", () => {
  const pontos = normalizarPontosConvocatoria([
    { order: 3, title: "Informação do presidente da Junta" },
    { order: 1, title: "Contactos" },
    { order: 2, title: "Aprovação da ata", originalText: "2. Aprovação da ata" },
  ]);
  assert.deepEqual(
    pontos.map((ponto) => `${ponto.order}:${ponto.title}`),
    ["1:Aprovação da ata", "2:Informação do presidente da Junta"],
  );
});

test("deteta possível sessão duplicada", () => {
  const assembleias: Assembleia[] = [
    {
      id: "asm-1",
      nome: "Sessão ordinária da Assembleia de Freguesia de Porches",
      tipo: "Ordinária",
      orgao: "Assembleia de Freguesia de Porches",
      data: "2026-07-30",
      hora: "21:30",
      local: "Centro Cultural D. Dinis",
      estado: "preparacao",
    },
  ];
  const duplicate = detectarDuplicadoConvocatoria(
    {
      titulo: "Sessão ordinária da Assembleia de Freguesia de Porches",
      orgao: "Assembleia de Freguesia de Porches",
      data: "2026-07-30",
      hora: "21:30",
    },
    assembleias,
  );
  assert.equal(duplicate?.id, "asm-1");
});
