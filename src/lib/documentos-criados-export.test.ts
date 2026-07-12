import assert from "node:assert/strict";
import { describe, it } from "node:test";
import JSZip from "jszip";
import {
  criarBlobDocumentoWord,
  exportarDocumentoCriadoPDF,
  MIME_DOCX,
  obterCabecalhoInstitucionalExportacao,
} from "@/lib/documentos-criados-export";
import type { DocumentoCriado } from "@/lib/types";

function documento(): DocumentoCriado {
  return {
    id: "documento-1",
    tipo: "Recomendação",
    titulo: "Proteção da habitação e mobilidade",
    conteudo: `## ENQUADRAMENTO

A população de Porches precisa de informação pública clara.

## FUNDAMENTAÇÃO

A intervenção deve preservar a segurança e a participação dos cidadãos.

## RECOMENDAÇÃO

1. Reforçar a fiscalização.
2. Publicar informação atualizada.

a) Garantir acessibilidade.
b) Preservar a participação dos cidadãos.`,
    origem: "ia",
    assuntoId: "assunto-1",
    estado: "em revisão",
    createdAt: "2026-07-12T10:00:00.000Z",
    updatedAt: "2026-07-12T11:00:00.000Z",
  };
}

describe("exportação DOCX real", () => {
  it("gera pacote Office Open XML, MIME oficial e conteúdo português", async () => {
    const blob = await criarBlobDocumentoWord(documento(), {
      assembleia: {
        nome: "Sessão ordinária",
        tipo: "ordinaria",
        orgao: "Assembleia de Freguesia",
        data: "2026-07-12",
        local: "Porches",
      },
      nomeEleito: "João Gonçalves",
      grupoPolitico: "Grupo político",
    });

    assert.equal(blob.type, MIME_DOCX);
    assert.equal(
      MIME_DOCX,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );

    const bytes = new Uint8Array(await blob.arrayBuffer());
    assert.deepEqual(Array.from(bytes.slice(0, 2)), [0x50, 0x4b]);
    assert.notEqual(
      new TextDecoder().decode(bytes.slice(0, 100)).trimStart().startsWith("<"),
      true,
    );

    const zip = await JSZip.loadAsync(bytes);
    assert.ok(zip.file("[Content_Types].xml"));
    assert.ok(zip.file("word/document.xml"));
    const xml = await zip.file("word/document.xml")?.async("string");
    assert.match(xml ?? "", /Proteção da habitação e mobilidade/);
    assert.match(xml ?? "", /ASSEMBLEIA DE FREGUESIA/);
    assert.match(xml ?? "", /Porches precisa de informação pública clara/);
    assert.match(xml ?? "", /João Gonçalves/);
    assert.match(xml ?? "", /participação dos cidadãos/);
    assert.match(xml ?? "", /Reforçar a fiscalização/);
    assert.match(xml ?? "", /a\) Garantir acessibilidade/);
    assert.equal((xml?.match(/João Gonçalves/g) ?? []).length, 1);
  });

  it("mantém a proteção institucional da exportação PDF", () => {
    const eventos: string[] = [];
    const windowAnterior = globalThis.window;
    const customEventAnterior = globalThis.CustomEvent;
    class CustomEventTeste extends Event {
      constructor(type: string) {
        super(type);
      }
    }
    Object.assign(globalThis, {
      CustomEvent: CustomEventTeste,
      window: { dispatchEvent: (evento: Event) => eventos.push(evento.type) },
    });

    try {
      assert.equal(exportarDocumentoCriadoPDF(documento()), false);
      assert.deepEqual(eventos, ["tribuno:contexto-institucional-obrigatorio"]);
    } finally {
      Object.assign(globalThis, {
        CustomEvent: customEventAnterior,
        window: windowAnterior,
      });
    }
  });

  it("fornece ao compositor PDF o órgão institucional, não a identidade partidária", () => {
    const cabecalho = obterCabecalhoInstitucionalExportacao(
      {
        assembleia: {
          nome: "Sessão ordinária",
          tipo: "ordinaria",
          orgao: "Assembleia de Freguesia de Porches",
          data: "2026-07-13",
          local: "Porches",
        },
      },
      "Chega!",
    );
    assert.equal(cabecalho.orgao, "Assembleia de Freguesia de Porches");
    assert.notEqual(cabecalho.orgao, "Chega!");
  });
});
