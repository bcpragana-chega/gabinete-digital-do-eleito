import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "node:test";
import { InstitutionalDocumentEditor } from "@/components/documentos/InstitutionalDocumentEditor";
import { DOCUMENT_MODEL_VERSION } from "@/lib/document-model";
import type { ContextoDocumentoInstitucional } from "@/lib/documentos-institucionais";

const contexto: ContextoDocumentoInstitucional = {
  assembleia: {
    nome: "Sessão ordinária",
    tipo: "ordinaria",
    orgao: "Assembleia Municipal",
    data: "2026-07-30",
    local: "Lagoa",
  },
  perfil: {
    nomeInstitucional: "Maria Silva",
    cargo: "Deputado Municipal",
    orgao: "Assembleia Municipal",
    organizacao: "",
    territorio: "Lagoa",
    updatedAt: "2026-07-01T10:00:00Z",
  },
};

describe("editor de documentos canónicos antigos", () => {
  it("mostra a numeração normalizada contínua e preserva o título", () => {
    const conteudoJson = {
      version: DOCUMENT_MODEL_VERSION,
      header: {
        logoUrl: "/branding/neutral-mark.svg",
        documentType: "Moção",
        title: "MBcaixa",
      },
      documentData: [],
      sections: [
        {
          id: "proposta",
          title: "DELIBERAÇÃO / PROPOSTA",
          blocks: [
            { type: "paragraph", text: "1. Aprovar." },
            { type: "paragraph", text: "1. Publicar." },
            { type: "paragraph", text: "1. Notificar." },
            { type: "paragraph", text: "1. Executar." },
          ],
        },
      ],
      closing: {},
    };

    const html = renderToStaticMarkup(
      createElement(InstitutionalDocumentEditor, {
        tipo: "Moção",
        titulo: "MBcaixa",
        conteudo: "",
        conteudoJson,
        contexto,
        readOnly: true,
      }),
    );

    assert.match(html, />MBcaixa</);
    assert.match(html, /<ol[^>]*start="1"/);
    assert.match(html, /<ol[^>]*start="2"/);
    assert.match(html, /<ol[^>]*start="3"/);
    assert.match(html, /<ol[^>]*start="4"/);
    assert.doesNotMatch(html, /neutral-mark|logo\.png/);
  });
});
