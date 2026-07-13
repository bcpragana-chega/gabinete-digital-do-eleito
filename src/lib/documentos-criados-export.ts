import { obterAuthState } from "@/lib/auth-store";
import {
  AlignmentType,
  Document,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { construirBaseJuridicaInstitucional } from "@/lib/ai/legal-basis";
import { resolveStoredInstitutionalContext } from "@/lib/ai/institutional-context";
import type { PerfilInstitucionalContexto } from "@/lib/ai/types";
import {
  isTipoDocumentoInstitucional,
  nomeFicheiroDocumento,
  obterContextoInstitucionalGuardado,
  obterDadosInstitucionais,
  obterSecoesDocumentoInstitucional,
  resolverOrgaoInstitucional,
  validarDocumentoInstitucional,
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
export const MIME_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const mensagemLogoObrigatorio =
  "Para gerar documentos oficiais, adicione primeiro o logótipo institucional no seu perfil.";
export const mensagemContextoInstitucionalObrigatorio =
  "Complete o seu perfil institucional antes de gerar documentos oficiais. Confirme o município e, quando aplicável, a freguesia.";
const titulosRaciocinioInterno = new Set([
  "FACTOS",
  "PROBLEMA",
  "CONSEQUENCIA",
  "CONSEQUÊNCIA",
  "OBJETIVO",
  "OBJECTIVO",
  "OBJETIVO POLITICO",
  "OBJETIVO POLÍTICO",
  "OBJECTIVO POLITICO",
  "OBJECTIVO POLÍTICO",
  "RISCOS",
  "RISCO",
  "NOTAS",
  "NOTA",
  "AVISO",
  "INFORMACAO COMPLEMENTAR",
  "INFORMAÇÃO COMPLEMENTAR",
  "ANALISE",
  "ANÁLISE",
  "RACIOCINIO",
  "RACIOCÍNIO",
]);

function textoSeguro(valor?: string) {
  return valor?.trim() || undefined;
}

export function obterCabecalhoInstitucionalExportacao(
  contexto: ContextoDocumentoInstitucional | undefined,
): { orgao: string; organizacao?: string } {
  const { perfil } = obterAuthState();
  return { orgao: resolverOrgaoInstitucional(contexto, perfil).nome ?? "" };
}

function perfilParaContexto(): PerfilInstitucionalContexto | undefined {
  const { perfil } = obterAuthState();
  if (!perfil) return undefined;
  return {
    nome: perfil.nomeInstitucional,
    cargo: perfil.cargo,
    orgao: perfil.orgao,
    organizacao: perfil.organizacao,
    territorio: perfil.territorio,
    municipio: perfil.municipio,
    freguesia: perfil.freguesia,
    assinatura: perfil.assinaturaInstitucional,
  };
}

function perfilContextoDocumento(
  contexto?: ContextoDocumentoInstitucional,
): PerfilInstitucionalContexto | undefined {
  if (!contexto?.perfil) return perfilParaContexto();
  return {
    nome: contexto.perfil.nomeInstitucional,
    cargo: contexto.perfil.cargo,
    orgao: contexto.perfil.orgao,
    organizacao: contexto.perfil.organizacao,
    territorio: contexto.perfil.territorio,
    municipio: contexto.perfil.municipio,
    freguesia: contexto.perfil.freguesia,
    assinatura: contexto.perfil.assinaturaInstitucional,
  };
}

function resolverContextoExportacao(
  documento: DocumentoCriado,
  contexto?: ContextoDocumentoInstitucional,
) {
  const perfil = perfilContextoDocumento(contexto);
  const baseJuridica = perfil
    ? construirBaseJuridicaInstitucional({
        perfil,
        tipoDocumental: documento.tipo,
      })
    : undefined;

  return resolveStoredInstitutionalContext({
    documento,
    perfil,
    baseJuridica,
  });
}

function contextoComSnapshot(
  documento: DocumentoCriado,
  contexto?: ContextoDocumentoInstitucional,
): ContextoDocumentoInstitucional | undefined {
  const institutionalContext =
    contexto?.institutionalContext ?? obterContextoInstitucionalGuardado(documento);
  if (!institutionalContext) return contexto;
  return { ...contexto, institutionalContext };
}

function obterAssinaturaUnica(contexto?: ContextoDocumentoInstitucional) {
  const dados = obterDadosInstitucionais(contexto);
  return [dados.nomeEleito, dados.cargo, dados.grupoPolitico].filter(Boolean);
}

function validarAntesDeExportar(
  documento: DocumentoCriado,
  contexto: ContextoDocumentoInstitucional,
) {
  const validacao = validarDocumentoInstitucional(documento, contexto);
  if (validacao.pronto) return true;
  window.dispatchEvent(
    new CustomEvent("tribuno:documento-institucional-invalido", { detail: validacao }),
  );
  return false;
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

function normalizarTituloInterno(valor: string) {
  return valor
    .trim()
    .replace(/^#{1,6}\s*/, "")
    .replace(/:$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleUpperCase("pt-PT");
}

function linhaRaciocinioInterno(linha: string) {
  return titulosRaciocinioInterno.has(normalizarTituloInterno(linha));
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
    if (linhaPlaceholder(texto) || linhaAvisoInterno(texto) || linhaRaciocinioInterno(texto)) {
      return;
    }

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
    .filter(
      (linha) =>
        !linhaPlaceholder(linha) && !linhaAvisoInterno(linha) && !linhaRaciocinioInterno(linha),
    )
    .join("\n")
    .replace(/\bCHEGA!/g, "CHEGA")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function exportarDocumentoCriadoPDF(
  documento: DocumentoCriado,
  contexto?: ContextoDocumentoInstitucional,
) {
  const contextoFinal = contextoComSnapshot(documento, contexto);
  const contextoExportacao = resolverContextoExportacao(documento, contextoFinal);
  if (contextoExportacao.status === "UNRESOLVED") {
    window.dispatchEvent(new CustomEvent("tribuno:contexto-institucional-obrigatorio"));
    return false;
  }
  const contextoResolvido = {
    ...contextoFinal,
    institutionalContext: contextoExportacao.context,
  };

  if (!validarAntesDeExportar(documento, contextoResolvido)) return false;

  if (!perfilTemLogoInstitucional(contextoResolvido)) {
    window.dispatchEvent(new CustomEvent("tribuno:logo-institucional-obrigatorio"));
    return false;
  }

  void gerarEDescarregarPdf(documento, contextoResolvido);
  return true;
}

export const exportarDocumentoCriadoPdf = exportarDocumentoCriadoPDF;

export function exportarDocumentoCriadoWord(
  documento: DocumentoCriado,
  contexto?: ContextoDocumentoInstitucional,
) {
  const contextoFinal = contextoComSnapshot(documento, contexto);
  const contextoExportacao = resolverContextoExportacao(documento, contextoFinal);
  if (contextoExportacao.status === "UNRESOLVED") {
    window.dispatchEvent(new CustomEvent("tribuno:contexto-institucional-obrigatorio"));
    return false;
  }
  const contextoResolvido = {
    ...contextoFinal,
    institutionalContext: contextoExportacao.context,
  };

  if (!validarAntesDeExportar(documento, contextoResolvido)) return false;

  if (!perfilTemLogoInstitucional(contextoResolvido)) {
    window.dispatchEvent(new CustomEvent("tribuno:logo-institucional-obrigatorio"));
    return false;
  }

  void criarBlobDocumentoWord(documento, contextoResolvido).then((blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = nomeFicheiroDocumento(documento, "docx");
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  return true;
}

export async function criarBlobDocumentoWord(
  documento: DocumentoCriado,
  contexto?: ContextoDocumentoInstitucional,
) {
  const dados = obterDadosInstitucionais(contexto);
  const cabecalho = obterCabecalhoInstitucionalExportacao(contexto);
  const assinatura = obterAssinaturaUnica(contexto);
  const titulo = documento.titulo.trim() || "Documento sem título";
  const corpo = criarLinhasDocumento(documento)
    .filter((linha) => linha.tipo !== "espaco")
    .map((linha) => paragrafoDocx(linha));
  const documentoDocx = new Document({
    numbering: {
      config: [
        {
          reference: "tribuno-numerada",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.START,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: cabecalho.orgao.toLocaleUpperCase("pt-PT"), bold: true }),
            ],
          }),
          ...(cabecalho.organizacao
            ? [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: cabecalho.organizacao, bold: true })],
                }),
              ]
            : []),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 240 },
            children: [
              new TextRun({ text: documento.tipo.toLocaleUpperCase("pt-PT"), bold: true }),
            ],
          }),
          new Paragraph({
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { before: 240, after: 480 },
            children: [new TextRun({ text: titulo, bold: true })],
          }),
          ...corpo,
          new Paragraph({ spacing: { before: 600 }, text: `${dados.local}, ${dados.data}` }),
          new Paragraph({ spacing: { before: 480 }, children: [new TextRun("O Proponente,")] }),
          ...assinatura.map(
            (linha, index) =>
              new Paragraph({
                children: [new TextRun({ text: linha, bold: index === 0 })],
              }),
          ),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(documentoDocx);
  return new Blob([blob], { type: MIME_DOCX });
}

function paragrafoDocx(linha: Exclude<LinhaPdf, { tipo: "espaco" }>) {
  if (linha.tipo === "secao") {
    return new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 300, after: 120 },
      children: [new TextRun({ text: linha.texto, bold: true })],
    });
  }
  if (linha.tipo === "item") {
    if (/^\d+\.$/.test(linha.marcador)) {
      return new Paragraph({
        numbering: { reference: "tribuno-numerada", level: 0 },
        children: [new TextRun(linha.texto)],
      });
    }
    if (/^[-*•]$/.test(linha.marcador)) {
      return new Paragraph({ bullet: { level: 0 }, children: [new TextRun(linha.texto)] });
    }
    return new Paragraph({ text: `${linha.marcador} ${linha.texto}` });
  }
  return new Paragraph({
    spacing: { after: 160 },
    children: [new TextRun(linha.texto.replace(/\n/g, " "))],
  });
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
  const cabecalho = obterCabecalhoInstitucionalExportacao(contexto);
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

  await desenharCabecalho(pagina, cabecalho, documento.tipo, titulo, dados.logoUrl);
  pagina.y += 34;

  const linhas = criarLinhasDocumento(documento);
  linhas.forEach((linha) => {
    pagina = garantirEspaco(pagina, paginas, linha.tipo === "secao" ? 82 : 58);
    pagina = desenharLinhaDocumento(pagina, paginas, linha);
  });

  pagina = garantirEspaco(pagina, paginas, 280);
  pagina.y += 54;
  pagina = desenharParagrafo(pagina, paginas, `${dados.local}, ${dados.data}`, {
    font: "32px 'Times New Roman', Times, serif",
    lineHeight: 48,
  });
  pagina.y += 46;
  pagina = desenharParagrafo(pagina, paginas, "O Proponente,", {
    font: "30px 'Times New Roman', Times, serif",
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
          ? "30px 'Times New Roman', Times, serif"
          : "28px 'Times New Roman', Times, serif",
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
  logoUrl?: string,
) {
  const { ctx } = pagina;

  ctx.textAlign = "center";
  return desenharLogoPdf(ctx, logoUrl, pagina.y).then((alturaLogo) => {
    pagina.y += alturaLogo;
    desenharTextoQuebrado(
      ctx,
      cabecalho.orgao.toLocaleUpperCase("pt-PT"),
      larguraA4 / 2,
      pagina.y,
      {
        maxWidth: larguraTexto,
        font: "800 32px Arial, sans-serif",
        lineHeight: 42,
        color: "#374151",
      },
    );
    pagina.y += 60;

    if (cabecalho.organizacao) {
      const alturaOrganizacao = desenharTextoQuebrado(
        ctx,
        cabecalho.organizacao.toLocaleUpperCase("pt-PT"),
        larguraA4 / 2,
        pagina.y,
        {
          maxWidth: larguraTexto,
          font: "700 25px Arial, sans-serif",
          lineHeight: 34,
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
  });
}

function perfilTemLogoInstitucional(contexto?: ContextoDocumentoInstitucional) {
  const { perfil } = obterAuthState();
  return Boolean(textoSeguro(contexto?.perfil?.logoUrl) || textoSeguro(perfil?.logoUrl));
}

function carregarImagem(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const imagem = new Image();
    imagem.crossOrigin = "anonymous";
    imagem.onload = () => resolve(imagem);
    imagem.onerror = () => reject(new Error("LOGO_LOAD_ERROR"));
    imagem.src = src;
  });
}

async function desenharLogoPdf(
  ctx: CanvasRenderingContext2D,
  logoUrl: string | undefined,
  y: number,
) {
  if (!logoUrl) return 0;

  try {
    const imagem = await carregarImagem(logoUrl);
    const maxWidth = 240;
    const maxHeight = 120;
    const escala = Math.min(maxWidth / imagem.naturalWidth, maxHeight / imagem.naturalHeight, 1);
    const largura = imagem.naturalWidth * escala;
    const altura = imagem.naturalHeight * escala;

    ctx.drawImage(imagem, (larguraA4 - largura) / 2, y, largura, altura);
    return altura + 34;
  } catch {
    return 0;
  }
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
      const linhas = bloco
        .split(/\r?\n/)
        .map((linha) => linha.trim())
        .filter(Boolean);
      if (linhas.every((linha) => /^(\d+\.|[-*•])\s+/.test(linha))) {
        return linhas.flatMap((linha): LinhaPdf[] => {
          const item = linha.match(/^(\d+\.|[-*•])\s+(.+)$/);
          return item?.[1] && item[2] ? [{ tipo: "item", marcador: item[1], texto: item[2] }] : [];
        });
      }
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
      font: "29px 'Times New Roman', Times, serif",
      lineHeight: 43,
      x: margemX + 22,
      maxWidth: larguraTexto - 22,
    });
  }

  return desenharParagrafo(pagina, paginas, linha.texto.replace(/\n/g, " "), {
    font: "30px 'Times New Roman', Times, serif",
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
