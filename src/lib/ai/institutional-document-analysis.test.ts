import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  analiseTemTextoSuficiente,
  normalizarAnaliseDocumentoInstitucional,
} from "./institutional-document-analysis";

const base = {
  tipoDocumento: "convocatoria",
  confiancaGlobal: 0.91,
  pontosOrdemTrabalhos: [],
  informacaoRelevante: [],
  camposIncertos: [],
  resumoCompreensao: "Convocatória para uma sessão.",
};

describe("análise institucional de documentos", () => {
  it("normaliza uma análise válida", () => {
    const result = normalizarAnaliseDocumentoInstitucional({
      ...base,
      sessao: { orgao: " Assembleia Municipal ", data: "2026-07-30", hora: "21:30" },
    });
    assert.equal(result.sessao?.orgao, "Assembleia Municipal");
    assert.equal(result.confiancaGlobal, 0.91);
  });

  it("não inventa campos ausentes", () => {
    const result = normalizarAnaliseDocumentoInstitucional(base);
    assert.equal(result.sessao, undefined);
  });

  it("aceita tipo desconhecido", () => {
    const result = normalizarAnaliseDocumentoInstitucional({ ...base, tipoDocumento: "qualquer" });
    assert.equal(result.tipoDocumento, "desconhecido");
  });

  it("preserva a ordem dos pontos e normaliza a numeração", () => {
    const result = normalizarAnaliseDocumentoInstitucional({
      ...base,
      pontosOrdemTrabalhos: [
        { titulo: "Segundo no PDF", confianca: 0.8 },
        { titulo: "Terceiro no PDF", confianca: 0.7 },
      ],
    });
    assert.deepEqual(
      result.pontosOrdemTrabalhos.map((p) => [p.numero, p.titulo]),
      [
        [1, "Segundo no PDF"],
        [2, "Terceiro no PDF"],
      ],
    );
  });

  it("rejeita pontos sem título", () => {
    assert.throws(() =>
      normalizarAnaliseDocumentoInstitucional({
        ...base,
        pontosOrdemTrabalhos: [{ titulo: "", confianca: 0.5 }],
      }),
    );
  });

  it("deteta texto insuficiente sem inventar", () => {
    const result = normalizarAnaliseDocumentoInstitucional({ ...base, resumoCompreensao: "" });
    assert.equal(analiseTemTextoSuficiente(result), false);
  });
});
