import { obterAuthState } from "@/lib/auth-store";
import {
  AlignmentType,
  Document,
  Footer,
  ImageRun,
  LevelFormat,
  Packer,
  PageNumber,
  Paragraph,
  TextRun,
} from "docx";
import { construirBaseJuridicaInstitucional } from "@/lib/ai/legal-basis";
import { resolveStoredInstitutionalContext } from "@/lib/ai/institutional-context";
import type { PerfilInstitucionalContexto } from "@/lib/ai/types";
import {
  nomeFicheiroDocumento,
  obterContextoInstitucionalGuardado,
  obterDadosInstitucionais,
  resolverOrgaoInstitucional,
  validarDocumentoInstitucional,
  type ContextoDocumentoInstitucional,
} from "@/lib/documentos-institucionais";
import { normalizeDocument, type InlineRun } from "@/lib/document-model";
import { composeInstitutionalDocumentHeader } from "@/lib/institutional-document-header";
import { isLogoPartidarioPlaceholder } from "@/lib/party-branding";
import type { DocumentoCriado } from "@/lib/types";

type LinhaPdf =
  | { tipo: "espaco"; altura: number }
  | { tipo: "secao"; texto: string }
  | { tipo: "paragrafo"; texto: string; runs?: InlineRun[] }
  | { tipo: "item"; marcador: string; texto: string; referenciaNumeracao?: string };

type PaginaPdf = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  y: number;
};

const larguraA4 = 1240;
const alturaA4 = 1754;
const margemX = 160;
const margemTopo = 96;
const margemFundo = 116;
const larguraTexto = larguraA4 - margemX * 2;
const larguraMaximaLogoPdf = 420;
const alturaMaximaLogoPdf = 160;
const espacoLogoOrgaoPdf = 126;
const larguraMaximaLogoDocx = 340;
const alturaMaximaLogoDocx = 120;
const espacoLogoOrgaoDocx = 720;
export const MIME_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const HASH_LOGO_TRIBUNO_HISTORICO =
  "9779a279845e9d89a3a86845afd71c71b9e976631499d358972108d56af0d6ea";
const TAMANHO_LOGO_TRIBUNO_HISTORICO = 1_118_090;
export const mensagemLogoObrigatorio =
  "Para gerar documentos oficiais, adicione primeiro o logótipo institucional no seu perfil.";
export const mensagemContextoInstitucionalObrigatorio =
  "Complete o seu perfil institucional antes de gerar documentos oficiais. Confirme o município e, quando aplicável, a freguesia.";
export const mensagemDataInstitucionalProvisoria =
  "Este documento não está associado a uma Sessão. A data apresentada é provisória.";
export const mensagemErroGeracaoPDF = "Não foi possível gerar o PDF. Tente novamente.";
export const mensagemErroGeracaoWord = "Não foi possível gerar o ficheiro Word. Tente novamente.";

export type EtapaErroExportacao =
  | "criacao-canvas"
  | "conversao-canvas-blob"
  | "criacao-pdf"
  | "criacao-docx"
  | "inicio-download";

export type ResultadoExportacaoDocumento =
  | { status: "sucesso" }
  | { status: "contexto-institucional-em-falta" }
  | { status: "data-provisoria" }
  | { status: "logo-em-falta" }
  | { status: "documento-invalido"; erros: string[] }
  | { status: "erro-geracao"; etapa: EtapaErroExportacao };

type DependenciasExportacao = {
  desenharPaginasPdf?: typeof desenharPaginasDocumento;
  criarPdf?: typeof criarPdfComPaginasCanvas;
  criarDocx?: typeof criarBlobDocumentoWord;
  iniciarDownload?: typeof iniciarDownload;
};
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
  return validacao.pronto ? undefined : validacao.erros;
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

export async function exportarDocumentoCriadoPDF(
  documento: DocumentoCriado,
  contexto?: ContextoDocumentoInstitucional,
  dependencias: DependenciasExportacao = {},
): Promise<ResultadoExportacaoDocumento> {
  try {
    const preparacao = prepararExportacao(documento, contexto);
    if ("status" in preparacao) return preparacao;
    return await gerarEDescarregarPdf(documento, preparacao.contexto, dependencias);
  } catch {
    return { status: "erro-geracao", etapa: "criacao-pdf" };
  }
}

export const exportarDocumentoCriadoPdf = exportarDocumentoCriadoPDF;

export async function exportarDocumentoCriadoWord(
  documento: DocumentoCriado,
  contexto?: ContextoDocumentoInstitucional,
  dependencias: DependenciasExportacao = {},
): Promise<ResultadoExportacaoDocumento> {
  let preparacao: ReturnType<typeof prepararExportacao>;
  try {
    preparacao = prepararExportacao(documento, contexto);
  } catch {
    return { status: "erro-geracao", etapa: "criacao-docx" };
  }
  if ("status" in preparacao) return preparacao;

  let blob: Blob;
  try {
    blob = await (dependencias.criarDocx ?? criarBlobDocumentoWord)(documento, preparacao.contexto);
  } catch {
    return { status: "erro-geracao", etapa: "criacao-docx" };
  }

  try {
    (dependencias.iniciarDownload ?? iniciarDownload)(
      blob,
      nomeFicheiroDocumento(documento, "docx"),
    );
    return { status: "sucesso" };
  } catch {
    return { status: "erro-geracao", etapa: "inicio-download" };
  }
}

function prepararExportacao(
  documento: DocumentoCriado,
  contexto?: ContextoDocumentoInstitucional,
):
  | { contexto: ContextoDocumentoInstitucional }
  | Exclude<ResultadoExportacaoDocumento, { status: "sucesso" } | { status: "erro-geracao" }> {
  const contextoFinal = contextoComSnapshot(documento, contexto);
  const contextoExportacao = resolverContextoExportacao(documento, contextoFinal);
  if (contextoExportacao.status === "UNRESOLVED") {
    return { status: "contexto-institucional-em-falta" };
  }
  const contextoResolvido = {
    ...contextoFinal,
    institutionalContext: contextoExportacao.context,
  };

  const dados = obterDadosInstitucionais(contextoResolvido);
  if (dados.dataProvisoria && !contextoResolvido.permitirDataProvisoria) {
    return { status: "data-provisoria" };
  }

  const erros = validarAntesDeExportar(documento, contextoResolvido);
  if (erros) return { status: "documento-invalido", erros };

  return { contexto: contextoResolvido };
}

export async function criarBlobDocumentoWord(
  documento: DocumentoCriado,
  contexto?: ContextoDocumentoInstitucional,
) {
  const { model, linhas } = comporDocumentoExportacao(documento, contexto);
  const header = composeInstitutionalDocumentHeader(model.header);
  const corpo = linhas
    .filter((linha) => linha.tipo !== "espaco")
    .map((linha) => paragrafoDocx(linha));
  const logo = await imagemDocx(header.logoUrl);
  const referenciasNumeracao = model.sections.map((_, index) => `tribuno-numerada-${index + 1}`);
  const documentoDocx = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Arial", size: 22, color: "111111" },
          paragraph: { spacing: { line: 276, after: 100 } },
        },
      },
    },
    numbering: {
      config: referenciasNumeracao.map((reference) => ({
        reference,
        levels: [
          {
            level: 0,
            format: LevelFormat.DECIMAL,
            text: "%1.",
            alignment: AlignmentType.START,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      })),
    },
    sections: [
      {
        properties: {
          page: { margin: { top: 1225, right: 1550, bottom: 1080, left: 1550 } },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.START,
                children: [
                  new TextRun({
                    text: "Tribuno • Documento preparado digitalmente • Página ",
                    color: "8A8A8A",
                    size: 18,
                  }),
                  new TextRun({ children: [PageNumber.CURRENT], color: "8A8A8A", size: 18 }),
                ],
              }),
            ],
          }),
        },
        children: [
          ...(logo
            ? [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: espacoLogoOrgaoDocx },
                  children: [logo],
                }),
              ]
            : []),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: header.institutionDisplay,
                size: 32,
              }),
            ],
          }),
          ...(header.mandate
            ? [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 80 },
                  children: [new TextRun({ text: header.mandate, size: 22 })],
                }),
              ]
            : []),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 240 },
            children: [
              new TextRun({
                text: header.documentTypeDisplay,
                size: 32,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 180, after: 460 },
            children: [new TextRun({ text: header.title, size: 28 })],
          }),
          ...(model.documentData.length
            ? [
                new Paragraph({
                  spacing: { after: 100 },
                  children: [new TextRun({ text: "Dados do documento", size: 26 })],
                }),
                ...model.documentData.map(
                  (item) =>
                    new Paragraph({
                      children: [new TextRun({ text: `${item.label}: ` }), new TextRun(item.value)],
                    }),
                ),
              ]
            : []),
          ...corpo,
          ...(model.closing.location || model.closing.date
            ? [
                new Paragraph({
                  spacing: { before: 500, after: 360 },
                  text: [model.closing.location, model.closing.date].filter(Boolean).join(", "),
                }),
              ]
            : []),
          ...(model.closing.signatureLabel
            ? [
                new Paragraph({
                  spacing: { before: 280 },
                  children: [new TextRun(model.closing.signatureLabel)],
                }),
              ]
            : []),
          ...[model.closing.name, model.closing.role, model.closing.politicalGroup]
            .filter((line): line is string => Boolean(line))
            .map(
              (linha, index) =>
                new Paragraph({
                  children: [new TextRun({ text: linha })],
                }),
            ),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(documentoDocx);
  return new Blob([blob], { type: MIME_DOCX });
}

export function obterModeloDocumentoExportacao(
  documento: DocumentoCriado,
  contexto?: ContextoDocumentoInstitucional,
) {
  return normalizeDocument(documento, contexto);
}

async function imagemDocx(logoUrl?: string) {
  const logo = await carregarLogoExportacao(logoUrl);
  if (!logo) return undefined;
  try {
    return new ImageRun({
      data: logo.bytes,
      type: logo.type,
      transformation: dimensoesLogo(logo.dimensoes),
    });
  } catch {
    return undefined;
  }
}

function dimensoesLogo(natural: { width: number; height: number }) {
  const scale = Math.min(
    larguraMaximaLogoDocx / natural.width,
    alturaMaximaLogoDocx / natural.height,
  );
  return {
    width: Math.max(1, Math.round(natural.width * scale)),
    height: Math.max(1, Math.round(natural.height * scale)),
  };
}

export type LogoExportacaoCarregado = {
  bytes: Uint8Array;
  type: "png" | "jpg";
  mimeType: "image/png" | "image/jpeg";
  dimensoes: { width: number; height: number };
};

function bytesDataUrl(logoUrl: string) {
  const match = /^data:([^,]*),(.*)$/is.exec(logoUrl);
  if (!match) return undefined;
  try {
    if (/(?:^|;)base64(?:;|$)/i.test(match[1] ?? "")) {
      const decoded = atob((match[2] ?? "").replace(/\s/g, ""));
      return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
    }
    return new TextEncoder().encode(decodeURIComponent(match[2] ?? ""));
  } catch {
    return undefined;
  }
}

/**
 * @internal Carrega e valida os bytes usados por ambos os exportadores.
 * A extensão e o Content-Type nunca substituem a assinatura real da imagem.
 */
export async function carregarLogoExportacao(
  logoUrl?: string,
  fetcher: typeof fetch = fetch,
): Promise<LogoExportacaoCarregado | undefined> {
  if (!logoUrl || isLogoPartidarioPlaceholder(logoUrl)) return undefined;
  try {
    const bytes = logoUrl.startsWith("data:")
      ? bytesDataUrl(logoUrl)
      : await (async () => {
          const response = await fetcher(logoUrl);
          if (!response.ok) return undefined;
          return new Uint8Array(await response.arrayBuffer());
        })();
    if (!bytes) return undefined;
    if (await bytesSaoLogoTribunoHistorico(bytes)) return undefined;

    const dimensoes = dimensoesNaturaisImagem(bytes);
    if (!dimensoes) return undefined;
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
      return { bytes, type: "png", mimeType: "image/png", dimensoes };
    }
    if (bytes[0] === 0xff && bytes[1] === 0xd8) {
      return { bytes, type: "jpg", mimeType: "image/jpeg", dimensoes };
    }
    return undefined;
  } catch {
    return undefined;
  }
}

async function bytesSaoLogoTribunoHistorico(bytes: Uint8Array) {
  if (bytes.byteLength !== TAMANHO_LOGO_TRIBUNO_HISTORICO || !globalThis.crypto?.subtle) {
    return false;
  }
  try {
    const buffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;
    const digest = new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", buffer));
    const hash = Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return hash === HASH_LOGO_TRIBUNO_HISTORICO;
  } catch {
    return false;
  }
}

function dimensoesNaturaisImagem(bytes: Uint8Array) {
  if (
    bytes.length > 24 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const width = view.getUint32(16);
    const height = view.getUint32(20);
    if (width > 0 && height > 0) return { width, height };
  }

  if (bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let offset = 2;
    while (offset + 8 < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = bytes[offset + 1];
      if (marker === 0xd8 || marker === 0xd9) {
        offset += 2;
        continue;
      }
      const segmentLength = view.getUint16(offset + 2);
      const isStartOfFrame =
        marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
      if (isStartOfFrame && offset + 8 < bytes.length) {
        const height = view.getUint16(offset + 5);
        const width = view.getUint16(offset + 7);
        if (width > 0 && height > 0) return { width, height };
      }
      if (segmentLength < 2) break;
      offset += segmentLength + 2;
    }
  }

  return undefined;
}

function paragrafoDocx(linha: Exclude<LinhaPdf, { tipo: "espaco" }>) {
  if (linha.tipo === "secao") {
    return new Paragraph({
      keepNext: true,
      spacing: { before: 320, after: 120 },
      children: [new TextRun({ text: linha.texto, size: 26 })],
    });
  }
  if (linha.tipo === "item") {
    if (/^\d+\.$/.test(linha.marcador) && linha.referenciaNumeracao) {
      return new Paragraph({
        numbering: { reference: linha.referenciaNumeracao, level: 0 },
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
    children: linha.runs?.length
      ? linha.runs.map((run) => new TextRun({ text: run.text.replace(/\n/g, " "), bold: run.bold }))
      : [new TextRun(linha.texto.replace(/\n/g, " "))],
  });
}

async function gerarEDescarregarPdf(
  documento: DocumentoCriado,
  contexto?: ContextoDocumentoInstitucional,
  dependencias: DependenciasExportacao = {},
): Promise<ResultadoExportacaoDocumento> {
  let paginas: HTMLCanvasElement[];
  try {
    paginas = await (dependencias.desenharPaginasPdf ?? desenharPaginasDocumento)(
      documento,
      contexto,
    );
  } catch {
    return { status: "erro-geracao", etapa: "criacao-canvas" };
  }

  let pdf: Blob;
  try {
    pdf = await (dependencias.criarPdf ?? criarPdfComPaginasCanvas)(paginas);
  } catch (error) {
    return {
      status: "erro-geracao",
      etapa:
        error instanceof Error && error.message === "PDF_CANVAS_BLOB_UNAVAILABLE"
          ? "conversao-canvas-blob"
          : "criacao-pdf",
    };
  }

  try {
    (dependencias.iniciarDownload ?? iniciarDownload)(pdf, nomeFicheiroDocumento(documento, "pdf"));
    return { status: "sucesso" };
  } catch {
    return { status: "erro-geracao", etapa: "inicio-download" };
  }
}

function iniciarDownload(blob: Blob, nomeFicheiro: string) {
  const url = URL.createObjectURL(blob);
  let link: HTMLAnchorElement | undefined;
  try {
    link = document.createElement("a");
    link.href = url;
    link.download = nomeFicheiro;
    document.body.appendChild(link);
    link.click();
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  } finally {
    link?.remove();
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function desenharPaginasDocumento(
  documento: DocumentoCriado,
  contexto?: ContextoDocumentoInstitucional,
) {
  const { model, linhas } = comporDocumentoExportacao(documento, contexto);
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

  const header = composeInstitutionalDocumentHeader(model.header);
  await desenharCabecalho(
    pagina,
    { orgao: header.institutionDisplay, organizacao: header.mandate },
    header.documentTypeDisplay,
    header.title,
    header.logoUrl,
  );
  pagina.y += 34;

  if (model.documentData.length) {
    pagina = desenharLinhaDocumento(pagina, paginas, {
      tipo: "secao",
      texto: "Dados do documento",
    });
    model.documentData.forEach((item) => {
      pagina = desenharLinhaDocumento(pagina, paginas, {
        tipo: "paragrafo",
        texto: `${item.label}: ${item.value}`,
      });
    });
  }

  linhas.forEach((linha) => {
    pagina = garantirEspaco(pagina, paginas, linha.tipo === "secao" ? 82 : 58);
    pagina = desenharLinhaDocumento(pagina, paginas, linha);
  });

  pagina = garantirEspaco(pagina, paginas, 280);
  pagina.y += 54;
  const localData = [model.closing.location, model.closing.date].filter(Boolean).join(", ");
  if (localData)
    pagina = desenharParagrafo(pagina, paginas, localData, {
      font: "22px Arial, sans-serif",
      lineHeight: 34,
    });
  pagina.y += 46;
  if (model.closing.signatureLabel)
    pagina = desenharParagrafo(pagina, paginas, model.closing.signatureLabel, {
      font: "22px Arial, sans-serif",
      lineHeight: 34,
    });
  pagina.y += 30;
  [model.closing.name, model.closing.role, model.closing.politicalGroup]
    .filter((line): line is string => Boolean(line))
    .forEach((linha, index) => {
      pagina = desenharParagrafo(pagina, paginas, linha, {
        font: "22px Arial, sans-serif",
        lineHeight: 34,
      });
    });

  paginas.forEach((item, index) => {
    item.ctx.save();
    item.ctx.textAlign = "left";
    item.ctx.font = "19px Arial, sans-serif";
    item.ctx.fillStyle = "#8a8a8a";
    item.ctx.fillText(
      `Tribuno • Documento preparado digitalmente • Página ${index + 1}`,
      margemX,
      alturaA4 - 54,
    );
    item.ctx.restore();
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
    const alturaOrgao = desenharTextoQuebrado(ctx, cabecalho.orgao, larguraA4 / 2, pagina.y, {
      maxWidth: larguraTexto,
      font: "32px Arial, sans-serif",
      lineHeight: 42,
      color: "#111111",
    });
    pagina.y += alturaOrgao + 10;

    if (cabecalho.organizacao) {
      const alturaOrganizacao = desenharTextoQuebrado(
        ctx,
        cabecalho.organizacao,
        larguraA4 / 2,
        pagina.y,
        {
          maxWidth: larguraTexto,
          font: "23px Arial, sans-serif",
          lineHeight: 34,
          color: "#111111",
        },
      );
      pagina.y += alturaOrganizacao + 30;
    }

    ctx.textAlign = "center";
    desenharTextoQuebrado(ctx, tipo, larguraA4 / 2, pagina.y, {
      maxWidth: larguraTexto,
      font: "38px Arial, sans-serif",
      lineHeight: 48,
      color: "#111111",
    });
    pagina.y += 62;

    const alturaTitulo = desenharTextoQuebrado(ctx, titulo, larguraA4 / 2, pagina.y, {
      maxWidth: larguraTexto,
      font: "36px Arial, sans-serif",
      lineHeight: 44,
      color: "#111111",
    });
    pagina.y += alturaTitulo + 46;
    ctx.textAlign = "left";
  });
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

/** @internal Exportada apenas para validar a composição PDF sem gerar um documento visual inteiro. */
export async function desenharLogoPdf(
  ctx: CanvasRenderingContext2D,
  logoUrl: string | undefined,
  y: number,
) {
  if (!logoUrl) return 0;

  let objectUrl: string | undefined;
  try {
    const logo = await carregarLogoExportacao(logoUrl);
    if (!logo) return 0;
    const buffer = logo.bytes.buffer.slice(
      logo.bytes.byteOffset,
      logo.bytes.byteOffset + logo.bytes.byteLength,
    ) as ArrayBuffer;
    objectUrl = URL.createObjectURL(new Blob([buffer], { type: logo.mimeType }));
    const imagem = await carregarImagem(objectUrl);
    if (!imagem.naturalWidth || !imagem.naturalHeight) return 0;
    const escala = Math.min(
      larguraMaximaLogoPdf / imagem.naturalWidth,
      alturaMaximaLogoPdf / imagem.naturalHeight,
    );
    const largura = imagem.naturalWidth * escala;
    const altura = imagem.naturalHeight * escala;

    ctx.drawImage(imagem, (larguraA4 - largura) / 2, y, largura, altura);
    return altura + espacoLogoOrgaoPdf;
  } catch {
    return 0;
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

/** @internal Estrutura partilhada pelos compositores PDF e DOCX, exportada para regressão. */
export function criarLinhasDocumento(
  documento: DocumentoCriado,
  contexto?: ContextoDocumentoInstitucional,
): LinhaPdf[] {
  const model = obterModeloDocumentoExportacao(documento, contexto);
  return criarLinhasModelo(model);
}

/** @internal Snapshot único consumido pelos compositores PDF e DOCX. */
export function comporDocumentoExportacao(
  documento: DocumentoCriado,
  contexto?: ContextoDocumentoInstitucional,
) {
  const model = obterModeloDocumentoExportacao(documento, contexto);
  return { model, linhas: criarLinhasModelo(model) };
}

function criarLinhasModelo(model: ReturnType<typeof obterModeloDocumentoExportacao>): LinhaPdf[] {
  return model.sections.flatMap((section, sectionIndex): LinhaPdf[] => {
    let proximoNumero = 1;
    const referenciaNumeracao = `tribuno-numerada-${sectionIndex + 1}`;
    return [
      { tipo: "espaco", altura: 24 },
      { tipo: "secao", texto: section.title },
      ...section.blocks.flatMap((block): LinhaPdf[] => {
        if (block.type === "paragraph")
          return [{ tipo: "paragrafo", texto: block.text, runs: block.runs }];
        return block.items.map((item) => ({
          tipo: "item" as const,
          marcador: block.type === "ordered-list" ? `${proximoNumero++}.` : "•",
          texto: item,
          referenciaNumeracao: block.type === "ordered-list" ? referenciaNumeracao : undefined,
        }));
      }),
    ];
  });
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
    pagina = desenharParagrafo(pagina, paginas, linha.texto, {
      font: "30px Arial, sans-serif",
      lineHeight: 40,
      color: "#111111",
    });
    pagina.y += 10;
    return pagina;
  }

  if (linha.tipo === "item") {
    return desenharParagrafo(pagina, paginas, `${linha.marcador} ${linha.texto}`, {
      font: "23px Arial, sans-serif",
      lineHeight: 34,
      x: margemX + 22,
      maxWidth: larguraTexto - 22,
    });
  }

  return desenharParagrafo(pagina, paginas, linha.texto.replace(/\n/g, " "), {
    font: "23px Arial, sans-serif",
    lineHeight: 34,
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
