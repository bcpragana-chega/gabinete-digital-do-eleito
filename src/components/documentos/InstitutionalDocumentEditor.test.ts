import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "node:test";
import { InstitutionalDocumentEditor } from "@/components/documentos/InstitutionalDocumentEditor";
import { DOCUMENT_MODEL_VERSION } from "@/lib/document-model";
import type { ContextoDocumentoInstitucional } from "@/lib/documentos-institucionais";
import type { TipoDocumentoCriado } from "@/lib/types";

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
  it("renderiza todos os tipos com exatamente as mesmas medidas e alinhamentos do cabeçalho", () => {
    const variantes: Array<{ tipo: TipoDocumentoCriado; designacao: string }> = [
      { tipo: "Moção", designacao: "Moção" },
      { tipo: "Recomendação", designacao: "Recomendação" },
      { tipo: "Requerimento", designacao: "Requerimento" },
      { tipo: "Outro documento", designacao: "Pedido de esclarecimento" },
      { tipo: "Declaração de voto", designacao: "Declaração de voto" },
      { tipo: "Intervenção", designacao: "Intervenção" },
      { tipo: "Outro documento", designacao: "Outro documento" },
    ];
    const contextoComLogo: ContextoDocumentoInstitucional = {
      ...contexto,
      perfil: contexto.perfil
        ? { ...contexto.perfil, logoUrl: "data:image/png;base64,LOGO" }
        : undefined,
    };

    for (const { tipo, designacao } of variantes) {
      const html = renderToStaticMarkup(
        createElement(InstitutionalDocumentEditor, {
          tipo,
          titulo: "Título institucional",
          conteudo: "Conteúdo institucional.",
          conteudoJson: {
            version: DOCUMENT_MODEL_VERSION,
            header: { documentType: designacao, title: "Título institucional" },
            documentData: [],
            sections: [],
            closing: {},
          },
          contexto: contextoComLogo,
          readOnly: true,
        }),
      );

      assert.match(
        html,
        /class="mx-auto min-h-\[1123px\] max-w-\[794px\].*md:px-\[82px\] md:py-\[76px\]"/,
      );
      assert.match(html, /class="mx-auto mb-8 block max-h-\[64px\] max-w-\[170px\]/);
      assert.match(
        html,
        /class="text-left text-\[26px\] font-normal uppercase leading-tight tracking-normal text-black"/,
      );
      assert.match(
        html,
        /class="mt-8 text-center text-\[28px\] font-normal uppercase tracking-normal"/,
      );
      assert.match(html, new RegExp(`>${designacao}<`, "i"));
    }
  });

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
