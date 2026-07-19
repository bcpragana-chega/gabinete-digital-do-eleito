import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import JSZip from "jszip";
import {
  criarBlobDocumentoWord,
  exportarDocumentoCriadoPDF,
  exportarDocumentoCriadoWord,
  MIME_DOCX,
  obterCabecalhoInstitucionalExportacao,
} from "@/lib/documentos-criados-export";
import type { ContextoDocumentoInstitucional } from "@/lib/documentos-institucionais";
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

function contextoValido(): ContextoDocumentoInstitucional {
  return {
    assembleia: {
      nome: "Sessão ordinária",
      tipo: "ordinaria",
      orgao: "Assembleia de Freguesia",
      data: "2026-07-30",
      local: "Porches",
    },
    perfil: {
      nomeInstitucional: "João Gonçalves",
      cargo: "Membro da Assembleia de Freguesia",
      orgao: "Assembleia de Freguesia",
      organizacao: "",
      territorio: "Porches",
      municipio: "Lagoa",
      freguesia: "Porches",
      logoUrl: "data:image/png;base64,AA==",
      updatedAt: "2026-07-13T10:00:00.000Z",
    },
  };
}

describe("exportação DOCX real", () => {
  it("gera pacote Office Open XML, MIME oficial e conteúdo português", async () => {
    const blob = await criarBlobDocumentoWord(documento(), {
      assembleia: {
        nome: "Sessão ordinária",
        tipo: "ordinaria",
        orgao: "Assembleia de Freguesia",
        data: "2026-07-30",
        local: "Porches",
      },
      nomeEleito: "João Gonçalves",
      grupoPolitico: "Grupo político",
      perfil: {
        nomeInstitucional: "João Gonçalves",
        cargo: "Membro da Assembleia de Freguesia",
        orgao: "Assembleia de Freguesia",
        organizacao: "Chega!",
        territorio: "Porches",
        municipio: "Lagoa",
        freguesia: "Porches",
        updatedAt: "2026-07-13T10:00:00.000Z",
      },
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
    assert.match(xml ?? "", /ASSEMBLEIA DE FREGUESIA DE PORCHES/);
    assert.doesNotMatch(xml ?? "", /Chega!/);
    assert.doesNotMatch(xml ?? "", /Grupo político/);
    assert.match(xml ?? "", /Porches precisa de informação pública clara/);
    assert.match(xml ?? "", /João Gonçalves/);
    assert.match(xml ?? "", /Membro da Assembleia de Freguesia/);
    assert.match(xml ?? "", /30 de julho de 2026/);
    assert.doesNotMatch(xml ?? "", /12 de julho de 2026/);
    assert.equal((xml?.match(/30 de julho de 2026/g) ?? []).length, 1);
    assert.match(xml ?? "", /participação dos cidadãos/);
    assert.match(xml ?? "", /Reforçar a fiscalização/);
    assert.match(xml ?? "", /a\) Garantir acessibilidade/);
    assert.equal((xml?.match(/João Gonçalves/g) ?? []).length, 1);
  });

  it("devolve contexto institucional em falta sem iniciar a geração", async () => {
    let tentouGerar = false;
    const resultado = await exportarDocumentoCriadoPDF(documento(), undefined, {
      desenharPaginasPdf: async () => {
        tentouGerar = true;
        return [];
      },
    });

    assert.deepEqual(resultado, { status: "contexto-institucional-em-falta" });
    assert.equal(tentouGerar, false);
  });

  it("fornece ao compositor PDF o órgão institucional, não a identidade partidária", () => {
    const cabecalho = obterCabecalhoInstitucionalExportacao({
      assembleia: {
        nome: "Sessão ordinária",
        tipo: "ordinaria",
        orgao: "Assembleia de Freguesia de Porches",
        data: "2026-07-13",
        local: "Porches",
      },
    });
    assert.equal(cabecalho.orgao, "Assembleia de Freguesia de Porches");
    assert.notEqual(cabecalho.orgao, "Chega!");
  });

  it("bloqueia exportação sem Sessão até existir confirmação da data provisória", async () => {
    const contexto = contextoValido();
    delete contexto.assembleia;
    const resultado = await exportarDocumentoCriadoPDF(documento(), contexto);
    assert.deepEqual(resultado, { status: "data-provisoria" });
  });

  it("PDF válido inicia o download com o nome existente", async () => {
    let download: { tipo: string; nome: string } | undefined;
    const resultado = await exportarDocumentoCriadoPDF(documento(), contextoValido(), {
      desenharPaginasPdf: async () => [],
      criarPdf: async () => new Blob(["pdf"], { type: "application/pdf" }),
      iniciarDownload: (blob, nome) => {
        download = { tipo: blob.type, nome };
      },
    });

    assert.deepEqual(resultado, { status: "sucesso" });
    assert.equal(download?.tipo, "application/pdf");
    assert.match(download?.nome ?? "", /\.pdf$/);
  });

  it("Word válido inicia o download com o nome existente", async () => {
    let download: { tipo: string; nome: string } | undefined;
    const resultado = await exportarDocumentoCriadoWord(documento(), contextoValido(), {
      criarDocx: async () => new Blob(["docx"], { type: MIME_DOCX }),
      iniciarDownload: (blob, nome) => {
        download = { tipo: blob.type, nome };
      },
    });

    assert.deepEqual(resultado, { status: "sucesso" });
    assert.equal(download?.tipo, MIME_DOCX);
    assert.match(download?.nome ?? "", /\.docx$/);
  });

  it("perfil sem logótipo devolve requisito visível e não tenta gerar", async () => {
    const contexto = contextoValido();
    delete contexto.perfil?.logoUrl;
    let tentouGerar = false;
    const resultado = await exportarDocumentoCriadoPDF(documento(), contexto, {
      desenharPaginasPdf: async () => {
        tentouGerar = true;
        return [];
      },
    });

    assert.deepEqual(resultado, { status: "logo-em-falta" });
    assert.equal(tentouGerar, false);
  });

  it("documento institucional inválido devolve os respetivos erros", async () => {
    const invalido = { ...documento(), titulo: "", conteudo: "" };
    const resultado = await exportarDocumentoCriadoPDF(invalido, contextoValido());

    assert.equal(resultado.status, "documento-invalido");
    if (resultado.status === "documento-invalido") {
      assert.ok(resultado.erros.some((erro) => erro.includes("título")));
      assert.ok(resultado.erros.some((erro) => erro.includes("conteúdo")));
    }
  });

  it("falha de canvas.toBlob devolve erro de conversão sem rejeição", async () => {
    const canvas = {
      width: 1240,
      height: 1754,
      toBlob: (callback: BlobCallback) => callback(null),
    } as HTMLCanvasElement;
    const resultado = await exportarDocumentoCriadoPDF(documento(), contextoValido(), {
      desenharPaginasPdf: async () => [canvas],
    });

    assert.deepEqual(resultado, {
      status: "erro-geracao",
      etapa: "conversao-canvas-blob",
    });
  });

  it("falha na criação DOCX devolve erro tipado sem rejeição", async () => {
    const resultado = await exportarDocumentoCriadoWord(documento(), contextoValido(), {
      criarDocx: async () => {
        throw new Error("falha simulada");
      },
    });

    assert.deepEqual(resultado, { status: "erro-geracao", etapa: "criacao-docx" });
  });

  it("falha ao criar a URL ou iniciar o download devolve erro tipado", async () => {
    const resultado = await exportarDocumentoCriadoWord(documento(), contextoValido(), {
      criarDocx: async () => new Blob(["docx"], { type: MIME_DOCX }),
      iniciarDownload: () => {
        throw new Error("URL indisponível");
      },
    });

    assert.deepEqual(resultado, { status: "erro-geracao", etapa: "inicio-download" });
  });
});

describe("feedback de exportação no detalhe do documento", () => {
  const detalhe = readFileSync(
    resolve(process.cwd(), "src/components/documentos/DocumentoCriadoDetalhe.tsx"),
    "utf8",
  );

  it("desativa ambos os botões durante a exportação e mostra progresso", () => {
    assert.equal(
      (detalhe.match(/disabled={!documento \|\| Boolean\(exportacaoEmCurso\)}/g) ?? []).length,
      2,
    );
    assert.match(detalhe, /A gerar PDF\.\.\./);
    assert.match(detalhe, /A gerar Word\.\.\./);
    assert.match(detalhe, /exportacaoEmCursoRef\.current/);
  });

  it("apresenta feedback acessível para requisitos e falhas e permite fechar", () => {
    assert.match(detalhe, /mensagemContextoInstitucionalObrigatorio/);
    assert.match(detalhe, /mensagemLogoObrigatorio/);
    assert.match(detalhe, /mensagemErroGeracaoPDF/);
    assert.match(detalhe, /mensagemErroGeracaoWord/);
    assert.match(detalhe, /role="alert"/);
    assert.match(detalhe, /Tentar novamente/);
  });

  it("aguarda PDF e Word sem depender de eventos globais", () => {
    assert.match(detalhe, /await exportarDocumentoCriadoPDF/);
    assert.match(detalhe, /await exportarDocumentoCriadoWord/);
    assert.doesNotMatch(detalhe, /tribuno:(?:contexto|logo|documento)-institucional/);
  });
});
