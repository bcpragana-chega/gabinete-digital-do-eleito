import { obterAuthState } from "@/lib/auth-store";
import {
  criarHtmlDocumentoInstitucional,
  escaparHtml,
  isTipoDocumentoInstitucional,
  nomeFicheiroDocumento,
  obterDadosInstitucionais,
  obterSecoesDocumentoInstitucional,
  type ContextoDocumentoInstitucional,
  type SecaoDocumentoInstitucional,
} from "@/lib/documentos-institucionais";
import type { DocumentoCriado } from "@/lib/types";

type LinhaPdf =
  | { tipo: "espaco"; altura: number }
  | { tipo: "secao"; texto: string }
  | { tipo: "paragrafo"; texto: string }
  | { tipo: "item"; marcador: string; texto: string };

type PaginaPdf = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  y: number;
};

const larguraA4 = 1240;
const alturaA4 = 1754;
const margemX = 136;
const margemTopo = 118;
const margemFundo = 128;
const larguraTexto = larguraA4 - margemX * 2;

function assinaturaInstitucional() {
  const { perfil, user } = obterAuthState();
  return (
    perfil?.assinaturaInstitucional?.trim() ||
    perfil?.nomeInstitucional?.trim() ||
    user?.nome?.trim() ||
    "Tribuno"
  );
}

function dataAtualFormatada() {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

function textoSeguro(valor?: string) {
  return valor?.trim() || undefined;
}

function normalizarMarcaInstitucional(valor?: string) {
  return textoSeguro(valor)?.replace(/[!]+$/g, "").replace(/\s+/g, " ").trim();
}

function obterCabecalhoInstitucional(
  contexto: ContextoDocumentoInstitucional | undefined,
  nomeOrgaoFallback: string,
) {
  const { perfil } = obterAuthState();
  const perfilContexto = contexto?.perfil ?? perfil;
  const orgao =
    normalizarMarcaInstitucional(contexto?.assembleia?.orgao) ||
    normalizarMarcaInstitucional(perfilContexto?.orgao) ||
    normalizarMarcaInstitucional(nomeOrgaoFallback) ||
    "Órgão competente";
  const organizacao = normalizarMarcaInstitucional(perfilContexto?.organizacao);

  return {
    orgao,
    organizacao:
      organizacao && organizacao.toLocaleLowerCase("pt-PT") !== orgao.toLocaleLowerCase("pt-PT")
        ? organizacao
        : undefined,
  };
}

function obterAssinaturaUnica(contexto?: ContextoDocumentoInstitucional) {
  const { perfil, user } = obterAuthState();
  const perfilContexto = contexto?.perfil ?? perfil;
  const assinatura = textoSeguro(perfilContexto?.assinaturaInstitucional);

  if (assinatura) {
    return assinatura
      .split(/\r?\n/)
      .map((linha) => normalizarMarcaInstitucional(linha))
      .filter((linha): linha is string => Boolean(linha));
  }

  const nome =
    textoSeguro(contexto?.nomeEleito) ||
    textoSeguro(perfilContexto?.nomeInstitucional) ||
    textoSeguro(user?.nome) ||
    "Nome do eleito";
  const cargo = textoSeguro(perfilContexto?.cargo);

  return [cargo ? `${nome}, ${cargo}` : nome];
}

function linhaPlaceholder(linha: string) {
  const texto = linha.trim();
  if (!texto) return false;

  return (
    /^\[[^\]]+\]$/.test(texto) ||
    /\[(descrever|primeiro|segundo|terceiro|forma de|prazo|medida|fundamento|escrever|conteúdo|conteudo|entidade responsável|posição a aprovar)/i.test(
      texto,
    )
  );
}

function linhaAvisoInterno(linha: string) {
  return /^(nota|aviso|observação|observacao|informação complementar|informacao complementar)\s*:/i.test(
    linha.trim(),
  );
}

function linhaRodapeOuAssinatura(linha: string) {
  return /^(local e data|data|proponente|assinatura|assinado|assinada|o eleito|a eleita|grupo político|grupo politico)\s*:?\s*$/i.test(
    linha.trim(),
  );
}

function normalizarConteudoDocumento(conteudo: string) {
  const linhas = conteudo
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((linha) => linha.replace(/\s+$/g, ""));
  const resultado: string[] = [];
  let ignorarRodape = false;

  linhas.forEach((linha) => {
    const texto = linha.trim();

    if (linhaRodapeOuAssinatura(texto)) {
      ignorarRodape = true;
      return;
    }

    if (/^#{1,3}\s+/.test(texto)) {
      ignorarRodape = false;
    }

    if (ignorarRodape) return;
    if (linhaPlaceholder(texto) || linhaAvisoInterno(texto)) return;

    resultado.push(linha);
  });

  return resultado
    .join("\n")
    .replace(/\bCHEGA!/g, "CHEGA")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizarConteudoSecao(conteudo: string) {
  return conteudo
    .split(/\r?\n/)
    .filter((linha) => !linhaPlaceholder(linha) && !linhaAvisoInterno(linha))
    .join("\n")
    .replace(/\bCHEGA!/g, "CHEGA")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function exportarDocumentoCriadoPDF(
  documento: DocumentoCriado,
  contexto?: ContextoDocumentoInstitucional,
) {
  void gerarEDescarregarPdf(documento, contexto);
}

export const exportarDocumentoCriadoPdf = exportarDocumentoCriadoPDF;

export function exportarDocumentoCriadoWord(
  documento: DocumentoCriado,
  contexto?: ContextoDocumentoInstitucional,
) {
  const html = isTipoDocumentoInstitucional(documento.tipo)
    ? criarHtmlDocumentoInstitucional(documento, contexto)
    : criarHtmlDocumentoGenerico(documento, contexto);
  const blob = new Blob(["\ufeff", html], {
    type: "application/msword;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = nomeFicheiroDocumento(documento, "doc");
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function criarHtmlDocumentoGenerico(
  documento: DocumentoCriado,
  contexto?: ContextoDocumentoInstitucional,
) {
  const titulo = documento.titulo.trim() || "Documento sem título";
  const tipo = documento.tipo;
  const conteudo = documento.conteudo.trim() || "";
  const data = dataAtualFormatada();
  const assinatura = assinaturaInstitucional();
  const detalhes = [
    contexto?.assunto ? `Assunto: ${contexto.assunto}` : undefined,
    contexto?.sessao ? `Sessão: ${contexto.sessao}` : undefined,
    contexto?.ponto ? `Ponto: ${contexto.ponto}` : undefined,
  ].filter(Boolean);

  return `<!doctype html>
<html lang="pt">
  <head>
    <meta charset="utf-8" />
    <title>${escaparHtml(titulo)}</title>
    <style>
      @page { margin: 24mm; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        color: #111827;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        line-height: 1.65;
      }
      header {
        border-bottom: 1px solid #e5e7eb;
        margin-bottom: 32px;
        padding-bottom: 24px;
        text-align: center;
      }
      .brand {
        color: #6b7280;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }
      .type {
        color: #374151;
        font-size: 13px;
        font-weight: 700;
        margin-top: 10px;
        text-transform: uppercase;
      }
      h1 {
        font-size: 28px;
        line-height: 1.2;
        margin: 28px 0 0;
      }
      .meta {
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        color: #4b5563;
        font-size: 13px;
        margin-bottom: 32px;
        padding: 16px 18px;
      }
      .content {
        font-size: 15px;
        white-space: pre-wrap;
      }
      footer {
        margin-top: 56px;
        page-break-inside: avoid;
      }
      .date {
        margin-bottom: 48px;
      }
      .signature {
        border-top: 1px solid #9ca3af;
        display: inline-block;
        min-width: 260px;
        padding-top: 10px;
      }
      @media print {
        body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      }
    </style>
  </head>
  <body>
    <header>
      <div class="brand">Tribuno</div>
      <div class="type">${escaparHtml(tipo)}</div>
      <h1>${escaparHtml(titulo)}</h1>
    </header>
    ${
      detalhes.length > 0
        ? `<section class="meta">${detalhes.map((item) => escaparHtml(item ?? "")).join("<br />")}</section>`
        : ""
    }
    <main class="content">${escaparHtml(conteudo)}</main>
    <footer>
      <p class="date">Data: ${escaparHtml(data)}</p>
      <p class="signature">${escaparHtml(assinatura)}</p>
    </footer>
  </body>
</html>`;
}

async function gerarEDescarregarPdf(
  documento: DocumentoCriado,
  contexto?: ContextoDocumentoInstitucional,
) {
  const paginas = await desenharPaginasDocumento(documento, contexto);
  const pdf = await criarPdfComPaginasCanvas(paginas);
  const url = URL.createObjectURL(pdf);
  const link = document.createElement("a");

  link.href = url;
  link.download = nomeFicheiroDocumento(documento, "pdf");
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function desenharPaginasDocumento(
  documento: DocumentoCriado,
  contexto?: ContextoDocumentoInstitucional,
) {
  const dados = obterDadosInstitucionais(contexto);
  const titulo = documento.titulo.trim() || "Documento sem título";
  const cabecalho = obterCabecalhoInstitucional(contexto, dados.nomeOrgao);
  const assinatura = obterAssinaturaUnica(contexto);
  const paginas: PaginaPdf[] = [];
  const criarPagina = () => {
    const canvas = document.createElement("canvas");
    canvas.width = larguraA4;
    canvas.height = alturaA4;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("PDF_CANVAS_CONTEXT_UNAVAILABLE");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, larguraA4, alturaA4);
    ctx.fillStyle = "#111827";
    ctx.textBaseline = "alphabetic";

    const pagina = { canvas, ctx, y: margemTopo };
    paginas.push(pagina);
    return pagina;
  };

  let pagina = criarPagina();

  desenharCabecalho(pagina, cabecalho, documento.tipo, titulo);
  pagina.y += 34;

  const linhas = criarLinhasDocumento(documento);
  linhas.forEach((linha) => {
    pagina = garantirEspaco(pagina, paginas, linha.tipo === "secao" ? 82 : 58);
    pagina = desenharLinhaDocumento(pagina, paginas, linha);
  });

  pagina = garantirEspaco(pagina, paginas, 280);
  pagina.y += 54;
  pagina = desenharParagrafo(pagina, paginas, `${dados.local}, ${dados.data}`, {
    font: "32px Georgia, 'Times New Roman', serif",
    lineHeight: 48,
  });
  pagina.y += 46;
  pagina = desenharParagrafo(pagina, paginas, "Proponente:", {
    font: "30px Georgia, 'Times New Roman', serif",
    lineHeight: 44,
  });
  pagina.y += 44;
  pagina.ctx.strokeStyle = "#111827";
  pagina.ctx.lineWidth = 2;
  pagina.ctx.beginPath();
  pagina.ctx.moveTo(margemX, pagina.y);
  pagina.ctx.lineTo(margemX + 420, pagina.y);
  pagina.ctx.stroke();
  pagina.y += 38;
  assinatura.forEach((linha, index) => {
    pagina = desenharParagrafo(pagina, paginas, linha, {
      font:
        index === 0
          ? "30px Georgia, 'Times New Roman', serif"
          : "28px Georgia, 'Times New Roman', serif",
      lineHeight: index === 0 ? 44 : 42,
    });
  });

  return paginas.map((item) => item.canvas);
}

function desenharCabecalho(
  pagina: PaginaPdf,
  cabecalho: { orgao: string; organizacao?: string },
  tipo: string,
  titulo: string,
) {
  const { ctx } = pagina;

  ctx.textAlign = "center";
  const alturaOrgao = desenharTextoQuebrado(
    ctx,
    cabecalho.orgao.toLocaleUpperCase("pt-PT"),
    larguraA4 / 2,
    pagina.y,
    {
      maxWidth: larguraTexto,
      font: "700 25px Arial, sans-serif",
      lineHeight: 34,
      color: "#374151",
    },
  );
  pagina.y += alturaOrgao + 18;

  if (cabecalho.organizacao) {
    const alturaOrganizacao = desenharTextoQuebrado(
      ctx,
      cabecalho.organizacao.toLocaleUpperCase("pt-PT"),
      larguraA4 / 2,
      pagina.y,
      {
        maxWidth: larguraTexto,
        font: "800 29px Arial, sans-serif",
        lineHeight: 38,
        color: "#111827",
      },
    );
    pagina.y += alturaOrganizacao + 20;
  }

  desenharTextoQuebrado(ctx, tipo.toLocaleUpperCase("pt-PT"), larguraA4 / 2, pagina.y, {
    maxWidth: larguraTexto,
    font: "800 38px Arial, sans-serif",
    lineHeight: 48,
    color: "#111827",
  });
  pagina.y += 66;

  const alturaTitulo = desenharTextoQuebrado(
    ctx,
    titulo.toLocaleUpperCase("pt-PT"),
    larguraA4 / 2,
    pagina.y,
    {
      maxWidth: larguraTexto,
      font: "800 42px Arial, sans-serif",
      lineHeight: 54,
      color: "#111827",
    },
  );
  pagina.y += alturaTitulo + 36;

  ctx.strokeStyle = "#d1d5db";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(margemX, pagina.y);
  ctx.lineTo(larguraA4 - margemX, pagina.y);
  ctx.stroke();
  pagina.y += 34;
  ctx.textAlign = "left";
}

function criarLinhasDocumento(documento: DocumentoCriado): LinhaPdf[] {
  if (isTipoDocumentoInstitucional(documento.tipo)) {
    return obterSecoesDocumentoInstitucional(
      documento.tipo,
      normalizarConteudoDocumento(documento.conteudo),
    )
      .map((secao) => ({ ...secao, conteudo: normalizarConteudoSecao(secao.conteudo) }))
      .filter((secao) => secao.conteudo.trim())
      .flatMap((secao) => linhasDaSecao(secao));
  }

  return normalizarConteudoDocumento(documento.conteudo)
    .split(/\n{2,}/)
    .map((bloco) => bloco.trim())
    .filter(Boolean)
    .flatMap((bloco): LinhaPdf[] => {
      const tituloMarkdown = bloco.match(/^#{1,3}\s+(.+)$/m);
      if (tituloMarkdown?.[1]) return [{ tipo: "secao", texto: tituloMarkdown[1].trim() }];
      return [{ tipo: "paragrafo", texto: bloco.replace(/^[-*]\s+/gm, "") }];
    });
}

function linhasDaSecao(secao: SecaoDocumentoInstitucional): LinhaPdf[] {
  const linhas: LinhaPdf[] = [
    { tipo: "espaco", altura: 24 },
    { tipo: "secao", texto: secao.titulo },
  ];
  let contadorListaPrincipal = 1;

  secao.conteudo
    .split(/\n{2,}/)
    .map((bloco) => bloco.trim())
    .filter(Boolean)
    .forEach((bloco) => {
      const linhasBloco = bloco
        .split(/\r?\n/)
        .map((linha) => linha.trim())
        .filter(Boolean);
      const todosItens = linhasBloco.every((linha) =>
        /^(\d+\.|[a-z]\)|[ivxlcdm]+\))\s+/i.test(linha),
      );

      if (todosItens) {
        linhasBloco.forEach((item) => {
          const match = item.match(/^(\d+\.|[a-z]\)|[ivxlcdm]+\))\s+(.+)$/i);
          if (!match?.[1] || !match[2]) return;

          const marcadorOriginal = match[1];
          const marcador = /^\d+\.$/.test(marcadorOriginal)
            ? `${contadorListaPrincipal++}.`
            : marcadorOriginal;

          linhas.push({ tipo: "item", marcador, texto: match[2] });
        });
        return;
      }

      linhas.push({ tipo: "paragrafo", texto: bloco });
    });

  return linhas;
}

function garantirEspaco(pagina: PaginaPdf, paginas: PaginaPdf[], alturaMinima: number) {
  if (pagina.y + alturaMinima < alturaA4 - margemFundo) return pagina;

  const canvas = document.createElement("canvas");
  canvas.width = larguraA4;
  canvas.height = alturaA4;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("PDF_CANVAS_CONTEXT_UNAVAILABLE");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, larguraA4, alturaA4);
  ctx.fillStyle = "#111827";
  ctx.textBaseline = "alphabetic";

  const novaPagina = { canvas, ctx, y: margemTopo };
  paginas.push(novaPagina);
  return novaPagina;
}

function desenharLinhaDocumento(pagina: PaginaPdf, paginas: PaginaPdf[], linha: LinhaPdf) {
  if (linha.tipo === "espaco") {
    pagina.y += linha.altura;
    return pagina;
  }

  if (linha.tipo === "secao") {
    pagina.y += 18;
    pagina = desenharParagrafo(pagina, paginas, linha.texto.toLocaleUpperCase("pt-PT"), {
      font: "800 28px Arial, sans-serif",
      lineHeight: 38,
      color: "#111827",
    });
    pagina.y += 10;
    return pagina;
  }

  if (linha.tipo === "item") {
    return desenharParagrafo(pagina, paginas, `${linha.marcador} ${linha.texto}`, {
      font: "29px Georgia, 'Times New Roman', serif",
      lineHeight: 43,
      x: margemX + 22,
      maxWidth: larguraTexto - 22,
    });
  }

  return desenharParagrafo(pagina, paginas, linha.texto.replace(/\n/g, " "), {
    font: "30px Georgia, 'Times New Roman', serif",
    lineHeight: 46,
  });
}

function desenharParagrafo(
  pagina: PaginaPdf,
  paginas: PaginaPdf[],
  texto: string,
  options: {
    font: string;
    lineHeight: number;
    color?: string;
    x?: number;
    maxWidth?: number;
  },
) {
  let paginaAtual = pagina;
  const x = options.x ?? margemX;
  const maxWidth = options.maxWidth ?? larguraTexto;
  const linhas = quebrarTexto(paginaAtual.ctx, texto, {
    maxWidth,
    font: options.font,
  });

  paginaAtual.ctx.font = options.font;
  paginaAtual.ctx.fillStyle = options.color ?? "#111827";

  linhas.forEach((linha) => {
    paginaAtual = garantirEspaco(paginaAtual, paginas, options.lineHeight + 18);
    paginaAtual.ctx.font = options.font;
    paginaAtual.ctx.fillStyle = options.color ?? "#111827";
    paginaAtual.ctx.fillText(linha, x, paginaAtual.y);
    paginaAtual.y += options.lineHeight;
  });

  paginaAtual.y += 14;
  return paginaAtual;
}

function desenharTextoQuebrado(
  ctx: CanvasRenderingContext2D,
  texto: string,
  x: number,
  y: number,
  options: { maxWidth: number; font: string; lineHeight: number; color: string },
) {
  ctx.font = options.font;
  ctx.fillStyle = options.color;

  const linhas = quebrarTexto(ctx, texto, options);

  linhas.forEach((linha, index) => {
    ctx.fillText(linha, x, y + index * options.lineHeight);
  });

  return Math.max(options.lineHeight, linhas.length * options.lineHeight);
}

function quebrarTexto(
  ctx: CanvasRenderingContext2D,
  texto: string,
  options: { maxWidth: number; font: string },
) {
  ctx.font = options.font;
  const palavras = texto.replace(/\s+/g, " ").trim().split(" ");
  const linhas: string[] = [];
  let linhaAtual = "";

  palavras.forEach((palavra) => {
    const teste = linhaAtual ? `${linhaAtual} ${palavra}` : palavra;
    if (ctx.measureText(teste).width <= options.maxWidth || !linhaAtual) {
      linhaAtual = teste;
      return;
    }

    linhas.push(linhaAtual);
    linhaAtual = palavra;
  });

  if (linhaAtual) linhas.push(linhaAtual);
  return linhas.length > 0 ? linhas : [""];
}

async function criarPdfComPaginasCanvas(paginas: HTMLCanvasElement[]) {
  const imagens = await Promise.all(
    paginas.map(async (canvas) => ({
      bytes: await canvasParaJpegBytes(canvas),
      width: canvas.width,
      height: canvas.height,
    })),
  );
  const encoder = new TextEncoder();
  const objetosPaginas: Uint8Array[] = [];
  const paginaObjectIds = imagens.map((_, index) => 6 + index * 3);

  imagens.forEach((imagem, index) => {
    const imageId = 4 + index * 3;
    const contentId = 5 + index * 3;
    const pageId = 6 + index * 3;
    const conteudoPagina = `q\n595 0 0 842 0 0 cm\n/Im${index} Do\nQ`;

    objetosPaginas.push(
      concatenarBytes([
        encoder.encode(
          `<< /Type /XObject /Subtype /Image /Width ${imagem.width} /Height ${imagem.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imagem.bytes.length} >>\nstream\n`,
        ),
        imagem.bytes,
        encoder.encode("\nendstream"),
      ]),
    );
    objetosPaginas.push(
      encoder.encode(
        `<< /Length ${encoder.encode(conteudoPagina).length} >>\nstream\n${conteudoPagina}\nendstream`,
      ),
    );
    objetosPaginas.push(
      encoder.encode(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im${index} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`,
      ),
    );

    void pageId;
  });

  const objetosPdf = [
    encoder.encode("<< /Type /Catalog /Pages 2 0 R >>"),
    encoder.encode(
      `<< /Type /Pages /Kids [${paginaObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${paginaObjectIds.length} >>`,
    ),
    encoder.encode("<< /Producer (Tribuno) >>"),
    ...objetosPaginas,
  ];

  return montarPdf(objetosPdf);
}

async function canvasParaJpegBytes(canvas: HTMLCanvasElement) {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (resultado) => {
        if (resultado) resolve(resultado);
        else reject(new Error("PDF_CANVAS_BLOB_UNAVAILABLE"));
      },
      "image/jpeg",
      0.92,
    );
  });

  return new Uint8Array(await blob.arrayBuffer());
}

function montarPdf(objetos: Uint8Array[]) {
  const encoder = new TextEncoder();
  const partes: Uint8Array[] = [encoder.encode("%PDF-1.4\n")];
  const offsets = [0];
  let offsetAtual = partes[0].length;

  objetos.forEach((objeto, index) => {
    offsets.push(offsetAtual);
    const cabecalho = encoder.encode(`${index + 1} 0 obj\n`);
    const rodape = encoder.encode("\nendobj\n");
    partes.push(cabecalho, objeto, rodape);
    offsetAtual += cabecalho.length + objeto.length + rodape.length;
  });

  const inicioXref = offsetAtual;
  const linhasXref = [
    "xref",
    `0 ${objetos.length + 1}`,
    "0000000000 65535 f ",
    ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `),
    "trailer",
    `<< /Size ${objetos.length + 1} /Root 1 0 R /Info 3 0 R >>`,
    "startxref",
    String(inicioXref),
    "%%EOF",
  ].join("\n");

  partes.push(encoder.encode(linhasXref));

  const bytesPdf = concatenarBytes(partes);
  const arrayBuffer = new ArrayBuffer(bytesPdf.byteLength);
  new Uint8Array(arrayBuffer).set(bytesPdf);

  return new Blob([arrayBuffer], { type: "application/pdf" });
}

function concatenarBytes(partes: Uint8Array[]) {
  const tamanho = partes.reduce((total, parte) => total + parte.length, 0);
  const resultado = new Uint8Array(tamanho);
  let offset = 0;

  partes.forEach((parte) => {
    resultado.set(parte, offset);
    offset += parte.length;
  });

  return resultado;
}
