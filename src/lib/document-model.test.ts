import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DOCUMENT_MODEL_VERSION,
  blocksToText,
  isCanonicalDocument,
  normalizeDocument,
  parseBlocks,
  serializeDocumentToMarkdown,
} from "@/lib/document-model";
import { LOGO_PARTIDARIO_CHEGA, LOGO_PARTIDARIO_NEUTRO } from "@/lib/party-branding";
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

  it("substitui o antigo logótipo do Tribuno pela identidade partidária atual", () => {
    const original = normalizeDocument(legacy("Moção", cases[0][1]), context);
    const antigo = {
      ...original,
      header: { ...original.header, logoUrl: "/logo.png" },
    };
    const contextoChega: ContextoDocumentoInstitucional = {
      ...context,
      perfil: context.perfil ? { ...context.perfil, organizacao: "CHEGA" } : undefined,
    };

    const reopened = normalizeDocument(
      { ...legacy("Moção", "texto legado divergente"), conteudoJson: antigo },
      contextoChega,
    );

    assert.equal(reopened.header.logoUrl, LOGO_PARTIDARIO_CHEGA);
  });

  it("leva o URL do logótipo guardado no perfil até ao modelo documental", () => {
    const logoUrl = "https://project.supabase.co/storage/v1/object/public/logos/user/logo.png";
    const result = normalizeDocument(legacy("Moção", cases[0][1]), {
      ...context,
      perfil: context.perfil ? { ...context.perfil, logoUrl } : undefined,
    });

    assert.equal(result.header.logoUrl, logoUrl);
  });

  it("remove o placeholder cinzento persistido num documento canónico antigo", () => {
    const original = normalizeDocument(legacy("Moção", cases[0][1]), context);
    const comPlaceholder = {
      ...original,
      header: { ...original.header, logoUrl: LOGO_PARTIDARIO_NEUTRO },
    };
    const result = normalizeDocument(
      { ...legacy("Moção", "texto legado divergente"), conteudoJson: comPlaceholder },
      context,
    );

    assert.equal(result.header.logoUrl, undefined);
  });

  it("remove placeholders históricos relativos, absolutos e com query sem alterar o título", () => {
    const original = normalizeDocument(legacy("Moção", cases[0][1]), context);
    for (const logoUrl of [
      "/branding/neutral-mark.svg",
      "https://tribuno.example/branding/neutral-mark.svg#antigo",
      "/logo.png?cache=1",
    ]) {
      const result = normalizeDocument(
        {
          ...legacy("Moção", "texto legado divergente"),
          titulo: "MBcaixa",
          conteudoJson: {
            ...original,
            header: { ...original.header, logoUrl, title: "MBcaixa" },
          },
        },
        context,
      );
      assert.equal(result.header.logoUrl, undefined);
      assert.equal(result.header.title, "MBcaixa");
    }
  });

  it("substitui qualquer logo persistido pelo logo atual do perfil", () => {
    const original = normalizeDocument(legacy("Moção", cases[0][1]), context);
    const logoAtual = "data:image/png;base64,LOGO_ATUAL";
    const result = normalizeDocument(
      {
        ...legacy("Moção", "texto legado divergente"),
        conteudoJson: {
          ...original,
          header: {
            ...original.header,
            logoUrl: "https://arquivo.test/logo-partidario-antigo.png",
          },
        },
      },
      {
        ...context,
        perfil: context.perfil ? { ...context.perfil, logoUrl: logoAtual } : undefined,
      },
    );

    assert.equal(result.header.logoUrl, logoAtual);
  });

  it("converte uma sequência inequívoca de parágrafos numerados antigos", () => {
    const original = normalizeDocument(legacy("Moção", cases[0][1]), context);
    const result = normalizeDocument(
      {
        ...legacy("Moção", "ignorado"),
        conteudoJson: {
          ...original,
          sections: [
            {
              id: "proposta",
              title: "DELIBERAÇÃO / PROPOSTA",
              blocks: [
                { type: "paragraph", text: "1. Aprovar a proposta." },
                { type: "paragraph", text: "1) Publicar a deliberação." },
                { type: "paragraph", text: "1. Notificar os interessados." },
                { type: "paragraph", text: "1. Executar a medida." },
              ],
            },
          ],
        },
      },
      context,
    );

    assert.deepEqual(result.sections[0]?.blocks, [
      { type: "ordered-list", items: ["Aprovar a proposta."] },
      { type: "ordered-list", items: ["Publicar a deliberação."] },
      { type: "ordered-list", items: ["Notificar os interessados."] },
      { type: "ordered-list", items: ["Executar a medida."] },
    ]);
  });

  it("converte vários itens numerados inequívocos dentro do mesmo parágrafo", () => {
    const original = normalizeDocument(legacy("Moção", cases[0][1]), context);
    const result = normalizeDocument(
      {
        ...legacy("Moção", "ignorado"),
        conteudoJson: {
          ...original,
          sections: [
            {
              id: "proposta",
              title: "DELIBERAÇÃO / PROPOSTA",
              blocks: [
                {
                  type: "paragraph",
                  text: "1. Aprovar a proposta.\n1. Publicar a deliberação.\n1) Executar a medida.",
                },
              ],
            },
          ],
        },
      },
      context,
    );

    assert.deepEqual(result.sections[0]?.blocks, [
      {
        type: "ordered-list",
        items: ["Aprovar a proposta.", "Publicar a deliberação.", "Executar a medida."],
      },
    ]);
  });

  it("não converte artigos legais, datas, quantias, percentagens ou parágrafos isolados", () => {
    const original = normalizeDocument(legacy("Moção", cases[0][1]), context);
    const blocks = [
      { type: "paragraph" as const, text: "Nos termos do artigo 9.º do regulamento." },
      { type: "paragraph" as const, text: "Data da deliberação: 30.07.2026." },
      { type: "paragraph" as const, text: "1. julho de 2026" },
      { type: "paragraph" as const, text: "A verba ascende a 1.000 euros." },
      { type: "paragraph" as const, text: "A execução atingiu 50% do previsto." },
      { type: "bullet-list" as const, items: ["Marcador preservado"] },
    ];
    const result = normalizeDocument(
      {
        ...legacy("Moção", "ignorado"),
        conteudoJson: {
          ...original,
          sections: [{ id: "fundamentacao", title: "FUNDAMENTAÇÃO", blocks }],
        },
      },
      context,
    );

    assert.deepEqual(result.sections[0]?.blocks, blocks);
  });

  it("normaliza listas por secção sem misturar as respetivas sequências", () => {
    const original = normalizeDocument(legacy("Moção", cases[0][1]), context);
    const result = normalizeDocument(
      {
        ...legacy("Moção", "ignorado"),
        conteudoJson: {
          ...original,
          sections: ["PRIMEIRA", "SEGUNDA"].map((title, index) => ({
            id: `secao-${index + 1}`,
            title,
            blocks: [
              { type: "paragraph", text: "1. Primeiro item." },
              { type: "paragraph", text: "1. Segundo item." },
            ],
          })),
        },
      },
      context,
    );

    assert.ok(
      result.sections.every((section) =>
        section.blocks.every((block) => block.type === "ordered-list"),
      ),
    );
  });

  it("preserva PROPOSTA / DELIBERAÇÃO entre Markdown legado, editor e modelo canónico", () => {
    const antigo = legacy(
      "Moção",
      `## ENQUADRAMENTO

Factos.

## FUNDAMENTAÇÃO

Fundamentos.

## PROPOSTA / DELIBERAÇÃO

1. Aprovar a proposta apresentada.`,
    );
    const canonical = normalizeDocument(antigo, context);
    const proposta = canonical.sections.find((section) => section.id === "deliberacao-proposta");

    assert.ok(proposta);
    assert.equal(proposta.title, "DELIBERAÇÃO / PROPOSTA");
    assert.match(blocksToText(proposta.blocks), /Aprovar a proposta apresentada/);

    const editado = {
      ...canonical,
      sections: canonical.sections.map((section) =>
        section.id === "deliberacao-proposta"
          ? { ...section, blocks: parseBlocks("1. Aprovar.\n2. Publicar a deliberação.") }
          : section,
      ),
    };
    const markdown = serializeDocumentToMarkdown(editado);
    const reabertoCanonico = normalizeDocument(
      { ...antigo, conteudo: markdown, conteudoJson: editado },
      context,
    );
    const reabertoLegado = normalizeDocument({ ...antigo, conteudo: markdown }, context);

    for (const reaberto of [reabertoCanonico, reabertoLegado]) {
      const conteudo = blocksToText(
        reaberto.sections.find((section) => section.id === "deliberacao-proposta")?.blocks ?? [],
      );
      assert.match(conteudo, /Aprovar/);
      assert.match(conteudo, /Publicar a deliberação/);
    }
  });
});
