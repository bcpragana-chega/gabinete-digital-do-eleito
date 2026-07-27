import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DOCUMENT_MODEL_VERSION,
  isCanonicalDocument,
  normalizeDocument,
  serializeDocumentToMarkdown,
} from "@/lib/document-model";
import type { ContextoDocumentoInstitucional } from "@/lib/documentos-institucionais";
import type { DocumentoCriado, TipoDocumentoCriado } from "@/lib/types";

const context: ContextoDocumentoInstitucional = {
  assembleia: {
    nome: "Sessão ordinária",
    tipo: "ordinaria",
    orgao: "Assembleia Municipal",
    data: "2026-07-30",
    local: "Lagoa",
  },
  assunto: "Mobilidade",
  perfil: {
    nomeInstitucional: "Maria Silva",
    cargo: "Deputado Municipal",
    orgao: "Assembleia Municipal",
    organizacao: "",
    territorio: "Lagoa",
    municipio: "Lagoa",
    freguesia: "",
    updatedAt: "2026-07-01T10:00:00Z",
  },
};

function legacy(tipo: TipoDocumentoCriado, conteudo: string): DocumentoCriado {
  return {
    id: tipo,
    tipo,
    titulo: `Título de ${tipo}`,
    conteudo,
    estado: "rascunho",
    createdAt: "2026-07-01T10:00:00Z",
  };
}

describe("modelo documental canónico V1", () => {
  const cases: Array<[TipoDocumentoCriado, string, string[]]> = [
    [
      "Moção",
      "## ENQUADRAMENTO\n\nFactos.\n\n## FUNDAMENTAÇÃO\n\nConsiderando que há um problema.\n\n## PROPOSTA / DELIBERAÇÃO\n\n1. Deliberar.",
      ["ENQUADRAMENTO", "CONSIDERANDOS", "DELIBERAÇÃO / PROPOSTA"],
    ],
    [
      "Requerimento",
      "## ENQUADRAMENTO\n\nFactos.\n\n## FUNDAMENTAÇÃO\n\nFundamentos.\n\n## REQUERIMENTO\n\n1. Pergunta concreta?",
      ["DESTINATÁRIO", "ENQUADRAMENTO", "FUNDAMENTAÇÃO", "PEDIDOS / PERGUNTAS"],
    ],
    [
      "Recomendação",
      "## ENQUADRAMENTO\n\nFactos.\n\n## FUNDAMENTAÇÃO\n\nFundamentos.\n\n## RECOMENDAÇÃO\n\n- Medida concreta.",
      ["ENQUADRAMENTO", "PROBLEMA IDENTIFICADO", "FUNDAMENTAÇÃO", "RECOMENDAÇÕES"],
    ],
    [
      "Declaração de voto",
      "## CONTEXTO\n\nProposta votada.\n\n## FUNDAMENTAÇÃO\n\nRazões.\n\n## DECLARAÇÃO\n\nVoto favorável.",
      ["IDENTIFICAÇÃO DA VOTAÇÃO", "SENTIDO DE VOTO", "FUNDAMENTAÇÃO", "CONCLUSÃO"],
    ],
    [
      "Outro documento",
      "## NOTA INSTITUCIONAL\n\nTexto livre.\n\n## ANEXO\n\n- Elemento.",
      ["NOTA INSTITUCIONAL", "ANEXO"],
    ],
  ];

  for (const [tipo, content, expected] of cases) {
    it(`normaliza ${tipo} sem perder a estrutura legada`, () => {
      const result = normalizeDocument(legacy(tipo, content), context);
      assert.equal(result.version, DOCUMENT_MODEL_VERSION);
      assert.deepEqual(
        result.sections.map((section) => section.title),
        expected,
      );
      assert.ok(result.sections.some((section) => section.blocks.length > 0));
      assert.equal(result.header.institution, "Assembleia Municipal de Lagoa");
      assert.equal(result.closing.name, "Maria Silva");
      assert.doesNotMatch(JSON.stringify(result), /undefined|null/);
    });
  }

  it("preserva listas e parágrafos na ponte de compatibilidade", () => {
    const original = normalizeDocument(
      legacy("Recomendação", cases[2][1].replace("Factos.", "**Factos confirmados.**")),
      context,
    );
    const markdown = serializeDocumentToMarkdown(original);
    const reopened = normalizeDocument(legacy("Recomendação", markdown), context);
    const blocks = reopened.sections.flatMap((section) => section.blocks);
    assert.ok(blocks.some((block) => block.type === "paragraph"));
    assert.ok(blocks.some((block) => block.type === "bullet-list"));
    assert.ok(
      blocks.some((block) => block.type === "paragraph" && block.runs?.some((run) => run.bold)),
    );
    assert.match(markdown, /\*\*Factos confirmados\.\*\*/);
  });

  it("usa conteudoJson canónico como fonte de verdade", () => {
    const original = normalizeDocument(legacy("Moção", cases[0][1]), context);
    const changed = {
      ...original,
      header: { ...original.header, title: "Título editado" },
      closing: { ...original.closing, politicalGroup: "Grupo independente" },
    };
    const reopened = normalizeDocument(
      { ...legacy("Moção", "texto legado divergente"), conteudoJson: changed },
      context,
    );
    assert.equal(isCanonicalDocument(reopened), true);
    assert.equal(reopened.header.title, "Título editado");
    assert.equal(reopened.closing.politicalGroup, "Grupo independente");
    assert.doesNotMatch(serializeDocumentToMarkdown(reopened), /texto legado divergente/);
  });
});
