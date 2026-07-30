import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import JSZip from "jszip";
import {
  carregarLogoExportacao,
  comporDocumentoExportacao,
  criarBlobDocumentoWord,
  criarLinhasDocumento,
  desenharLogoPdf,
  desenharPaginasDocumento,
  exportarDocumentoCriadoPDF,
  exportarDocumentoCriadoWord,
  MIME_DOCX,
  obterCabecalhoInstitucionalExportacao,
  obterModeloDocumentoExportacao,
} from "@/lib/documentos-criados-export";
import { LOGO_PARTIDARIO_CHEGA, LOGO_PARTIDARIO_NEUTRO } from "@/lib/party-branding";
import { DOCUMENT_MODEL_VERSION, normalizeDocument } from "@/lib/document-model";
import {
  mapearDocumentoCriadoParaRemoto,
  mapearDocumentoCriadoRemoto,
} from "@/lib/documentos-criados-repository";
import type { ContextoDocumentoInstitucional } from "@/lib/documentos-institucionais";
import type { DocumentoCriado, TipoDocumentoCriado } from "@/lib/types";

const PNG_1X1 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const JPEG_1X1 = Uint8Array.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
  0x00, 0x01, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x01, 0x00, 0x01, 0x03, 0x01, 0x11,
  0x00, 0x02, 0x11, 0x00, 0x03, 0x11, 0x00, 0xff, 0xd9,
]);

const variantesCabecalho: Array<{ tipo: TipoDocumentoCriado; designacao: string }> = [
  { tipo: "Moção", designacao: "Moção" },
  { tipo: "Recomendação", designacao: "Recomendação" },
  { tipo: "Requerimento", designacao: "Requerimento" },
  { tipo: "Outro documento", designacao: "Pedido de esclarecimento" },
  { tipo: "Declaração de voto", designacao: "Declaração de voto" },
  { tipo: "Intervenção", designacao: "Intervenção" },
  { tipo: "Outro documento", designacao: "Outro documento" },
];

function dataUrl(bytes: Uint8Array, mimeType: string) {
  return `data:${mimeType};base64,${Buffer.from(bytes).toString("base64")}`;
}

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
      logoUrl: PNG_1X1,
      updatedAt: "2026-07-13T10:00:00.000Z",
    },
  };
}

describe("exportação DOCX real", () => {
  it("reconhece PNG e JPEG pelos bytes, em data URL e URL remoto", async () => {
    const png = await carregarLogoExportacao(PNG_1X1);
    const jpeg = await carregarLogoExportacao(
      "https://storage.test/logo-sem-extensao",
      async () =>
        new Response(JPEG_1X1, { status: 200, headers: { "Content-Type": "image/jpeg" } }),
    );

    assert.equal(png?.type, "png");
    assert.deepEqual(png?.dimensoes, { width: 1, height: 1 });
    assert.equal(jpeg?.type, "jpg");
    assert.deepEqual(jpeg?.dimensoes, { width: 1, height: 1 });
    assert.equal((await carregarLogoExportacao(dataUrl(JPEG_1X1, "image/jpeg")))?.type, "jpg");
  });

  it("rejeita HTML, bytes desconhecidos, respostas falhadas e URLs inacessíveis", async () => {
    assert.equal(
      await carregarLogoExportacao(
        "https://storage.test/logo.png",
        async () => new Response("<html>login</html>", { status: 200 }),
      ),
      undefined,
    );
    assert.equal(await carregarLogoExportacao("data:image/png;base64,AA=="), undefined);
    assert.equal(
      await carregarLogoExportacao(
        "https://storage.test/indisponivel.png",
        async () => new Response("", { status: 404 }),
      ),
      undefined,
    );
    assert.equal(
      await carregarLogoExportacao("https://storage.test/falha.png", async () => {
        throw new Error("network unavailable");
      }),
      undefined,
    );
  });

  it("rejeita placeholders históricos por URL e pelos bytes exatos do PNG antigo", async () => {
    let pedidos = 0;
    assert.equal(
      await carregarLogoExportacao(
        "https://tribuno.example/branding/neutral-mark.svg?antigo=1",
        async () => {
          pedidos += 1;
          return new Response(PNG_1X1);
        },
      ),
      undefined,
    );
    assert.equal(pedidos, 0);

    const pngAntigo = new Uint8Array(readFileSync(resolve(process.cwd(), "public/logo.png")));
    assert.equal(await carregarLogoExportacao(dataUrl(pngAntigo, "image/png")), undefined);
  });

  it("incorpora uma imagem válida e omite totalmente uma imagem inválida no DOCX", async () => {
    const valido = await criarBlobDocumentoWord(documento(), contextoValido());
    const zipValido = await JSZip.loadAsync(await valido.arrayBuffer());
    const mediaValida = Object.keys(zipValido.files).filter(
      (name) => name.startsWith("word/media/") && !name.endsWith("/"),
    );
    const xmlValido = await zipValido.file("word/document.xml")?.async("string");

    const contextoInvalido = contextoValido();
    if (contextoInvalido.perfil) contextoInvalido.perfil.logoUrl = "data:image/png;base64,AA==";
    const invalido = await criarBlobDocumentoWord(documento(), contextoInvalido);
    const zipInvalido = await JSZip.loadAsync(await invalido.arrayBuffer());
    const mediaInvalida = Object.keys(zipInvalido.files).filter(
      (name) => name.startsWith("word/media/") && !name.endsWith("/"),
    );
    const xmlInvalido = await zipInvalido.file("word/document.xml")?.async("string");

    assert.equal(mediaValida.length, 1);
    assert.match(xmlValido ?? "", /<w:drawing>/);
    assert.equal(mediaInvalida.length, 0);
    assert.doesNotMatch(xmlInvalido ?? "", /<w:drawing>/);
  });

  it("desenha uma imagem válida no PDF e reserva altura zero quando ela falha", async () => {
    const imageDescriptor = Object.getOwnPropertyDescriptor(globalThis, "Image");
    const desenhos: unknown[][] = [];
    class ImageMock {
      crossOrigin = "";
      naturalWidth = 100;
      naturalHeight = 50;
      onload?: () => void;
      onerror?: () => void;

      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    Object.defineProperty(globalThis, "Image", {
      configurable: true,
      value: ImageMock,
    });

    try {
      const ctx = {
        drawImage: (...args: unknown[]) => desenhos.push(args),
      } as unknown as CanvasRenderingContext2D;
      const alturaValida = await desenharLogoPdf(ctx, PNG_1X1, 10);
      const alturaInvalida = await desenharLogoPdf(ctx, "data:image/png;base64,AA==", 10);

      assert.equal(alturaValida, 286);
      assert.equal(alturaInvalida, 0);
      assert.equal(desenhos.length, 1);
      assert.deepEqual(desenhos[0]?.slice(1), [460, 10, 320, 160]);
    } finally {
      if (imageDescriptor) Object.defineProperty(globalThis, "Image", imageDescriptor);
      else Reflect.deleteProperty(globalThis, "Image");
    }
  });

  it("usa em todos os tipos o mesmo cabeçalho DOCX centrado, ampliado e com espaço solene", async () => {
    const tituloLongo =
      "Título institucional longo que deve permanecer centrado e quebrar automaticamente em várias linhas";
    const pngComProporcaoDoisParaUm = Uint8Array.from(
      Buffer.from(PNG_1X1.split(",")[1] ?? "", "base64"),
    );
    const view = new DataView(
      pngComProporcaoDoisParaUm.buffer,
      pngComProporcaoDoisParaUm.byteOffset,
      pngComProporcaoDoisParaUm.byteLength,
    );
    view.setUint32(16, 1_000);
    view.setUint32(20, 500);
    const logo = dataUrl(pngComProporcaoDoisParaUm, "image/png");

    for (const { tipo, designacao } of variantesCabecalho) {
      const contexto = contextoValido();
      if (contexto.perfil) contexto.perfil.logoUrl = logo;
      const base = normalizeDocument({ ...documento(), tipo, titulo: tituloLongo }, contexto);
      const canonico = {
        ...base,
        header: { ...base.header, documentType: designacao, title: tituloLongo },
      };
      const blob = await criarBlobDocumentoWord(
        { ...documento(), tipo, titulo: tituloLongo, conteudoJson: canonico },
        contexto,
      );
      const zip = await JSZip.loadAsync(await blob.arrayBuffer());
      const xml = (await zip.file("word/document.xml")?.async("string")) ?? "";
      const paragrafos = [...xml.matchAll(/<w:p(?: |>).*?<\/w:p>/g)].map((match) => match[0]);
      const encontrar = (texto: string) =>
        paragrafos.find((paragrafo) => paragrafo.includes(`>${texto}<`)) ?? "";

      assert.match(encontrar("ASSEMBLEIA DE FREGUESIA DE PORCHES"), /w:jc w:val="center"/);
      assert.match(encontrar(designacao.toLocaleUpperCase("pt-PT")), /w:jc w:val="center"/);
      assert.match(encontrar(tituloLongo), /w:jc w:val="center"/);
      assert.doesNotMatch(encontrar("Dados do documento"), /w:jc w:val="center"/);
      assert.match(xml, /w:after="720"/);
      assert.match(xml, /wp:extent cx="2286000" cy="1143000"/);
    }
  });

  it("mantém no PDF o cabeçalho e títulos longos centrados e os dados à esquerda", async () => {
    const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, "document");
    const contexto = contextoValido();
    delete contexto.perfil?.logoUrl;
    const titulo =
      "Título institucional suficientemente longo para quebrar automaticamente em mais de uma linha";
    const registos: Array<{ texto: string; alinhamento: CanvasTextAlign; x: number }> = [];
    let alinhamento: CanvasTextAlign = "left";
    const ctx = {
      fillStyle: "",
      textBaseline: "alphabetic",
      get textAlign() {
        return alinhamento;
      },
      set textAlign(value: CanvasTextAlign) {
        alinhamento = value;
      },
      font: "",
      fillRect: () => undefined,
      fillText: (texto: string, x: number) => registos.push({ texto, alinhamento, x }),
      measureText: (texto: string) => ({ width: texto.length * 18 }),
      drawImage: () => undefined,
      save: () => undefined,
      restore: () => undefined,
    } as unknown as CanvasRenderingContext2D;
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        createElement: () =>
          ({
            width: 0,
            height: 0,
            getContext: () => ctx,
          }) as unknown as HTMLCanvasElement,
      },
    });

    try {
      for (const { tipo, designacao } of variantesCabecalho) {
        registos.length = 0;
        const base = normalizeDocument({ ...documento(), tipo, titulo }, contexto);
        const canonico = {
          ...base,
          header: { ...base.header, documentType: designacao, title: titulo },
        };
        await desenharPaginasDocumento(
          { ...documento(), tipo, titulo, conteudoJson: canonico },
          contexto,
        );
        const instituicao = registos.find((item) =>
          item.texto.includes("ASSEMBLEIA DE FREGUESIA DE PORCHES"),
        );
        const tipoDesenhado = registos.find(
          (item) => item.texto === designacao.toLocaleUpperCase("pt-PT"),
        );
        const linhasTitulo = registos.filter((item) => titulo.includes(item.texto));
        const dados = registos.find((item) => item.texto === "Dados do documento");

        assert.deepEqual(
          [instituicao?.alinhamento, tipoDesenhado?.alinhamento, dados?.alinhamento],
          ["center", "center", "left"],
        );
        assert.equal(instituicao?.x, 620);
        assert.equal(tipoDesenhado?.x, 620);
        assert.ok(linhasTitulo.length >= 2);
        assert.ok(linhasTitulo.every((item) => item.alinhamento === "center" && item.x === 620));
      }
    } finally {
      if (documentDescriptor) Object.defineProperty(globalThis, "document", documentDescriptor);
      else Reflect.deleteProperty(globalThis, "document");
    }
  });

  it("reproduz perfil autenticado → criação → PDF com logo real e 1, 2, 3, 4", async () => {
    const documentoReal: DocumentoCriado = {
      ...documento(),
      tipo: "Moção",
      titulo: "MBcaixa",
      conteudo: `## ENQUADRAMENTO

Enquadramento institucional.

## FUNDAMENTAÇÃO

Fundamentação da proposta.

## PROPOSTA / DELIBERAÇÃO

1. Primeira deliberação.

1. Segunda deliberação.

1. Terceira deliberação.

1. Quarta deliberação.`,
    };
    const contextoReal = contextoValido();
    const composicao = comporDocumentoExportacao(documentoReal, contextoReal);
    const itens = composicao.linhas.filter((linha) => linha.tipo === "item");

    assert.equal(composicao.model.header.logoUrl, PNG_1X1);
    assert.notEqual(composicao.model.header.logoUrl, LOGO_PARTIDARIO_NEUTRO);
    assert.equal(composicao.model.header.title, "MBcaixa");
    assert.deepEqual(
      itens.map((item) => item.marcador),
      ["1.", "2.", "3.", "4."],
    );

    const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, "document");
    const imageDescriptor = Object.getOwnPropertyDescriptor(globalThis, "Image");
    const textos: string[] = [];
    let logosDesenhados = 0;
    class ImageMock {
      crossOrigin = "";
      naturalWidth = 100;
      naturalHeight = 50;
      onload?: () => void;

      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    const ctx = {
      fillStyle: "",
      textBaseline: "alphabetic",
      textAlign: "left",
      font: "",
      fillRect: () => undefined,
      fillText: (text: string) => textos.push(text),
      measureText: (text: string) => ({ width: text.length * 10 }),
      drawImage: () => {
        logosDesenhados += 1;
      },
      save: () => undefined,
      restore: () => undefined,
    } as unknown as CanvasRenderingContext2D;
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        createElement: (tag: string) => {
          assert.equal(tag, "canvas");
          return {
            width: 0,
            height: 0,
            getContext: () => ctx,
          } as unknown as HTMLCanvasElement;
        },
      },
    });
    Object.defineProperty(globalThis, "Image", {
      configurable: true,
      value: ImageMock,
    });

    try {
      const paginas = await desenharPaginasDocumento(documentoReal, contextoReal);
      assert.ok(paginas.length >= 1);
      assert.equal(logosDesenhados, 1);
      for (const linha of [
        "1. Primeira deliberação.",
        "2. Segunda deliberação.",
        "3. Terceira deliberação.",
        "4. Quarta deliberação.",
      ]) {
        assert.ok(textos.includes(linha), `Linha ausente no canvas PDF: ${linha}`);
      }
    } finally {
      if (documentDescriptor) Object.defineProperty(globalThis, "document", documentDescriptor);
      else Reflect.deleteProperty(globalThis, "document");
      if (imageDescriptor) Object.defineProperty(globalThis, "Image", imageDescriptor);
      else Reflect.deleteProperty(globalThis, "Image");
    }
  });

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
    assert.equal((xml?.match(/João Gonçalves/g) ?? []).length, 2);
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

  it("PDF e DOCX recebem a mesma resolução partidária do modelo canónico", () => {
    const contexto = contextoValido();
    if (contexto.perfil) {
      contexto.perfil.logoUrl = undefined;
      contexto.perfil.organizacao = "CHEGA";
    }
    const model = obterModeloDocumentoExportacao(documento(), contexto);
    const composicao = comporDocumentoExportacao(documento(), contexto);
    assert.equal(model.header.logoUrl, LOGO_PARTIDARIO_CHEGA);
    assert.equal(composicao.model.header.logoUrl, LOGO_PARTIDARIO_CHEGA);
  });

  it("PDF e DOCX preservam o conteúdo de PROPOSTA / DELIBERAÇÃO", async () => {
    const mocao: DocumentoCriado = {
      ...documento(),
      tipo: "Moção",
      titulo: "Participação pública",
      conteudo: `## ENQUADRAMENTO

Existe uma necessidade documentada.

## FUNDAMENTAÇÃO

A medida é adequada.

## PROPOSTA / DELIBERAÇÃO

1. Aprovar a medida.
2. Publicar a deliberação.`,
    };
    const contexto = contextoValido();
    const model = obterModeloDocumentoExportacao(mocao, contexto);
    const proposta = model.sections.find((section) => section.id === "deliberacao-proposta");
    const linhasPdf = criarLinhasDocumento(mocao, contexto);
    const blob = await criarBlobDocumentoWord(mocao, contexto);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const xml = await zip.file("word/document.xml")?.async("string");

    assert.ok(proposta);
    assert.ok(
      linhasPdf.some(
        (linha) =>
          linha.tipo === "item" && linha.texto === "Aprovar a medida." && linha.marcador === "1.",
      ),
    );
    assert.match(xml ?? "", /DELIBERAÇÃO \/ PROPOSTA/);
    assert.match(xml ?? "", /Aprovar a medida\./);
    assert.match(xml ?? "", /Publicar a deliberação\./);
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

  it("perfil sem partido nem logótipo não cria placeholder nem bloqueia a exportação", async () => {
    const contexto = contextoValido();
    delete contexto.perfil?.logoUrl;
    assert.equal(obterModeloDocumentoExportacao(documento(), contexto).header.logoUrl, undefined);
    let tentouGerar = false;
    const resultado = await exportarDocumentoCriadoPDF(documento(), contexto, {
      desenharPaginasPdf: async () => {
        tentouGerar = true;
        return [];
      },
      criarPdf: async () => new Blob(["pdf"], { type: "application/pdf" }),
      iniciarDownload: () => undefined,
    });

    assert.deepEqual(resultado, { status: "sucesso" });
    assert.equal(tentouGerar, true);
  });

  it("mantém a numeração entre blocos da mesma secção e reinicia numa nova secção", async () => {
    const base = normalizeDocument(documento(), contextoValido());
    const canonico = {
      ...base,
      version: DOCUMENT_MODEL_VERSION,
      sections: [
        {
          id: "primeira",
          title: "PRIMEIRA SECÇÃO",
          blocks: [
            { type: "ordered-list" as const, items: ["Um", "Dois"] },
            { type: "ordered-list" as const, items: ["Três", "Quatro"] },
            { type: "bullet-list" as const, items: ["Marcador"] },
          ],
        },
        {
          id: "segunda",
          title: "SEGUNDA SECÇÃO",
          blocks: [{ type: "ordered-list" as const, items: ["Novo um", "Novo dois"] }],
        },
      ],
    };
    const comBlocos = { ...documento(), conteudoJson: canonico };
    const linhas = criarLinhasDocumento(comBlocos, contextoValido());
    const itens = linhas.filter((linha) => linha.tipo === "item");

    assert.deepEqual(
      itens.map((item) => [item.marcador, item.texto]),
      [
        ["1.", "Um"],
        ["2.", "Dois"],
        ["3.", "Três"],
        ["4.", "Quatro"],
        ["•", "Marcador"],
        ["1.", "Novo um"],
        ["2.", "Novo dois"],
      ],
    );
    assert.equal(itens[0]?.referenciaNumeracao, itens[3]?.referenciaNumeracao);
    assert.notEqual(itens[3]?.referenciaNumeracao, itens[5]?.referenciaNumeracao);

    const blob = await criarBlobDocumentoWord(comBlocos, contextoValido());
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const xml = await zip.file("word/document.xml")?.async("string");
    const paragrafosNumerados = [...(xml ?? "").matchAll(/<w:p(?: |>).*?<\/w:p>/g)]
      .map((match) => match[0])
      .filter(
        (paragraph) =>
          /<w:numPr>/.test(paragraph) &&
          !paragraph.includes('<w:t xml:space="preserve">Marcador</w:t>'),
      );
    const ids = paragrafosNumerados.map(
      (paragraph) => /<w:numId w:val="(\d+)"\/>/.exec(paragraph)?.[1],
    );

    assert.equal(paragrafosNumerados.length, 6);
    assert.equal(new Set(ids.slice(0, 4)).size, 1);
    assert.equal(new Set(ids.slice(4, 6)).size, 1);
    assert.notEqual(ids[0], ids[4]);
  });

  it("faz round-trip de documento canónico antigo e exporta a estrutura atualizada", async () => {
    const contexto = contextoValido();
    const base = normalizeDocument({ ...documento(), titulo: "MBcaixa" }, contexto);
    const antigo: DocumentoCriado = {
      ...documento(),
      titulo: "MBcaixa",
      conteudoJson: {
        ...base,
        header: {
          ...base.header,
          title: "MBcaixa",
          logoUrl: "https://tribuno.example/branding/neutral-mark.svg",
        },
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
          {
            id: "segunda",
            title: "SEGUNDA SECÇÃO",
            blocks: [
              { type: "paragraph", text: "1. Recomeçar." },
              { type: "paragraph", text: "1. Concluir." },
            ],
          },
        ],
      },
    };
    const normalizado = normalizeDocument(antigo, contexto);
    const row = mapearDocumentoCriadoParaRemoto("user-1", {
      ...antigo,
      conteudoJson: normalizado,
      formatoConteudo: "blocks_json",
    });
    const recarregado = mapearDocumentoCriadoRemoto(row);
    const linhas = criarLinhasDocumento(recarregado, contexto).filter(
      (linha) => linha.tipo === "item",
    );

    assert.equal((recarregado.conteudoJson as typeof normalizado).header.logoUrl, PNG_1X1);
    assert.equal((recarregado.conteudoJson as typeof normalizado).header.title, "MBcaixa");
    assert.deepEqual(
      linhas.map((linha) => linha.marcador),
      ["1.", "2.", "3.", "4.", "1.", "2."],
    );

    const blob = await criarBlobDocumentoWord(recarregado, contexto);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const xml = await zip.file("word/document.xml")?.async("string");
    assert.match(xml ?? "", />MBcaixa</);
    assert.equal(
      Object.keys(zip.files).some((path) => path.startsWith("word/media/")),
      true,
    );
  });

  it("placeholder antigo sem logo atual não chega ao canvas nem ao DOCX", async () => {
    const contexto = contextoValido();
    delete contexto.perfil?.logoUrl;
    const base = normalizeDocument(documento(), contexto);
    const antigo = {
      ...documento(),
      conteudoJson: {
        ...base,
        header: { ...base.header, logoUrl: "/logo.png?versao=antiga" },
      },
    };
    const model = obterModeloDocumentoExportacao(antigo, contexto);
    assert.equal(model.header.logoUrl, undefined);

    let desenhos = 0;
    const altura = await desenharLogoPdf(
      { drawImage: () => desenhos++ } as unknown as CanvasRenderingContext2D,
      model.header.logoUrl,
      20,
    );
    assert.equal(altura, 0);
    assert.equal(desenhos, 0);

    const blob = await criarBlobDocumentoWord(antigo, contexto);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    assert.equal(
      Object.keys(zip.files).some((path) => path.startsWith("word/media/")),
      false,
    );
  });

  it("preserva exatamente o título escolhido pelo utilizador", async () => {
    const original = { ...documento(), titulo: "MBcaixa" };
    assert.equal(
      obterModeloDocumentoExportacao(original, contextoValido()).header.title,
      "MBcaixa",
    );

    const blob = await criarBlobDocumentoWord(original, contextoValido());
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const xml = await zip.file("word/document.xml")?.async("string");
    assert.match(xml ?? "", />MBcaixa</);
    assert.doesNotMatch(xml ?? "", /MB\s+caixa/i);
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
  const listaDossie = readFileSync(
    resolve(process.cwd(), "src/components/dossies/DossieDocumentosCriadosSection.tsx"),
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

  it("passa explicitamente o perfil autenticado ao contexto de exportação real", () => {
    assert.match(detalhe, /const \{ perfil \} = useAuth\(\)/);
    assert.match(detalhe, /perfil,\s+institutionalContext:/);
    assert.match(listaDossie, /const \{ user, perfil \} = useAuth\(\)/);
    assert.match(listaDossie, /const contexto = \{ assunto: dossie\?\.titulo, perfil \}/);
    assert.match(listaDossie, /exportarDocumentoCriadoWord\(documento, contexto\)/);
  });
});
