import { obterAuthState, type PerfilEleito } from "@/lib/auth-store";
import type { ResolvedInstitutionalContext } from "@/lib/ai/institutional-context";
import type { Assembleia, DocumentoCriado, TipoDocumentoCriado } from "@/lib/types";

export type TipoDocumentoInstitucional = Extract<
  TipoDocumentoCriado,
  "Moção" | "Recomendação" | "Requerimento"
>;

export type ContextoDocumentoInstitucional = {
  assembleia?: Pick<Assembleia, "nome" | "tipo" | "orgao" | "data" | "local">;
  sessao?: string;
  assunto?: string;
  ponto?: string;
  perfil?: PerfilEleito;
  institutionalContext?: ResolvedInstitutionalContext;
  nomeEleito?: string;
  grupoPolitico?: string;
};

type DadosInstitucionais = {
  nomeOrgao: string;
  entidadeDeliberativa: string;
  nomeEleito: string;
  cargo: string;
  grupoPolitico: string;
  logoUrl?: string;
  local: string;
  data: string;
};

export type OrgaoInstitucionalResolvido = {
  nome?: string;
  origem?: "sessao" | "contexto" | "perfil" | "cargo";
};

export type ResultadoValidacaoDocumentoInstitucional = {
  pronto: boolean;
  erros: string[];
  avisos: string[];
};

const tiposInstitucionais: TipoDocumentoInstitucional[] = ["Moção", "Recomendação", "Requerimento"];

const secoesPorTipo: Record<TipoDocumentoInstitucional, string[]> = {
  Moção: ["ENQUADRAMENTO", "FUNDAMENTAÇÃO", "PROPOSTA / DELIBERAÇÃO"],
  Recomendação: ["ENQUADRAMENTO", "FUNDAMENTAÇÃO", "RECOMENDAÇÃO"],
  Requerimento: ["ENQUADRAMENTO", "FUNDAMENTAÇÃO", "REQUERIMENTO"],
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

export type SecaoDocumentoInstitucional = {
  titulo: string;
  conteudo: string;
};

export function isTipoDocumentoInstitucional(
  tipo: TipoDocumentoCriado,
): tipo is TipoDocumentoInstitucional {
  return tiposInstitucionais.includes(tipo as TipoDocumentoInstitucional);
}

function textoSeguro(valor?: string) {
  return valor?.trim() || undefined;
}

function normalizarIdentidade(valor?: string) {
  return textoSeguro(valor)?.replace(/\s+/g, " ").replace(/[!]+$/g, "").trim();
}

function valorPoliticoOuPlaceholder(valor?: string) {
  const normalizado = normalizarIdentidade(valor)
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-PT");
  if (!normalizado) return true;
  return (
    normalizado === "chega" ||
    normalizado === "partido socialista" ||
    normalizado === "psd" ||
    normalizado === "grupo politico" ||
    normalizado === "partido" ||
    normalizado === "organizacao"
  );
}

function orgaoComTerritorio(orgao: string, perfil?: PerfilEleito) {
  const territorio = textoSeguro(perfil?.freguesia) || textoSeguro(perfil?.territorio);
  const generico =
    /^(?:Assembleia de Freguesia|Assembleia Municipal|Junta de Freguesia|Câmara Municipal)$/i.test(
      orgao,
    );
  if (!territorio || !generico) return orgao;
  return `${orgao} de ${territorio}`;
}

export function resolverOrgaoInstitucional(
  contexto?: ContextoDocumentoInstitucional,
  perfilFallback?: PerfilEleito,
): OrgaoInstitucionalResolvido {
  const perfil = contexto?.perfil ?? perfilFallback;
  const sessao = normalizarIdentidade(contexto?.assembleia?.orgao);
  if (sessao && sessao !== "Outro" && !valorPoliticoOuPlaceholder(sessao)) {
    return { nome: orgaoComTerritorio(sessao, perfil), origem: "sessao" };
  }

  const resolvido = normalizarIdentidade(
    contexto?.institutionalContext?.institution.deliberativeBody.officialName,
  );
  if (resolvido && !valorPoliticoOuPlaceholder(resolvido)) {
    return { nome: resolvido, origem: "contexto" };
  }

  const orgaoPerfil = normalizarIdentidade(perfil?.orgao);
  if (orgaoPerfil && orgaoPerfil !== "Outro" && !valorPoliticoOuPlaceholder(orgaoPerfil)) {
    return { nome: orgaoComTerritorio(orgaoPerfil, perfil), origem: "perfil" };
  }

  const cargo = normalizarIdentidade(perfil?.cargo);
  const orgaoNoCargo = cargo?.match(
    /(Assembleia\s+(?:Municipal|de\s+Freguesia)(?:\s+de\s+[\p{L} .'-]+)?)/iu,
  )?.[1];
  if (orgaoNoCargo && !valorPoliticoOuPlaceholder(orgaoNoCargo)) {
    return { nome: orgaoComTerritorio(orgaoNoCargo, perfil), origem: "cargo" };
  }

  return {};
}

export function normalizarGrupoPolitico(valor?: string) {
  const normalizado = normalizarIdentidade(valor);
  const comparavel = normalizado
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-PT");
  if (!comparavel || ["grupo politico", "partido", "organizacao"].includes(comparavel)) {
    return undefined;
  }
  return normalizado;
}

export function obterContextoInstitucionalGuardado(
  documento: Pick<DocumentoCriado, "iaMetadata">,
): ResolvedInstitutionalContext | undefined {
  const metadata = documento.iaMetadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return undefined;
  const record = metadata as Record<string, unknown>;
  const candidato = record.institutionalContext ?? record.contextoInstitucional;
  if (!candidato || typeof candidato !== "object" || Array.isArray(candidato)) return undefined;
  return candidato as ResolvedInstitutionalContext;
}

export function escaparHtml(valor: string) {
  return valor
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function capitalizarTipo(tipo: string) {
  return tipo.toLocaleUpperCase("pt-PT");
}

function linhaPlaceholderInstitucional(linha: string) {
  const texto = linha.trim();
  if (!texto) return false;

  return (
    /^\[[^\]]+\]$/.test(texto) ||
    /\[(descrever|primeiro|segundo|terceiro|forma de|prazo|medida|fundamento|escrever|conteúdo|conteudo|entidade responsável|posição a aprovar)/i.test(
      texto,
    )
  );
}

function linhaRaciocinioInterno(linha: string) {
  const titulo = normalizarTituloSecao(linha);
  return titulosRaciocinioInterno.has(titulo);
}

function normalizarConteudoInstitucionalVisivel(conteudo: string) {
  return conteudo
    .split(/\r?\n/)
    .filter((linha) => !linhaPlaceholderInstitucional(linha) && !linhaRaciocinioInterno(linha))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function dataFormatada(data?: string) {
  const dataBase = data ? new Date(data) : new Date();

  if (Number.isNaN(dataBase.getTime())) {
    return new Intl.DateTimeFormat("pt-PT", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date());
  }

  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(dataBase);
}

function obterEntidadeDeliberativa(
  nomeOrgao: string,
  perfil?: PerfilEleito,
  assembleia?: ContextoDocumentoInstitucional["assembleia"],
) {
  const orgao = textoSeguro(perfil?.orgao) || textoSeguro(assembleia?.orgao) || nomeOrgao;
  const territorio = textoSeguro(perfil?.territorio);
  const nomeComTerritorio =
    territorio && orgao && orgao !== "Outro" ? `${orgao} de ${territorio}` : nomeOrgao;

  if (orgao === "Câmara Municipal" || nomeOrgao.startsWith("Câmara Municipal")) {
    return `a ${nomeComTerritorio}`;
  }

  if (orgao === "Junta de Freguesia" || nomeOrgao.startsWith("Junta de Freguesia")) {
    return `a ${nomeComTerritorio}`;
  }

  if (
    orgao === "Assembleia Municipal" ||
    orgao === "Assembleia de Freguesia" ||
    nomeOrgao.startsWith("Assembleia")
  ) {
    return `a ${nomeComTerritorio}`;
  }

  return `o ${nomeOrgao}`;
}

function obterDestinatarioExecutivo(perfil?: PerfilEleito) {
  const orgao = textoSeguro(perfil?.orgao);
  const territorio = textoSeguro(perfil?.territorio);

  if (orgao === "Assembleia Municipal" || orgao === "Câmara Municipal") {
    return territorio ? `Câmara Municipal de ${territorio}` : "Câmara Municipal";
  }

  if (orgao === "Assembleia de Freguesia" || orgao === "Junta de Freguesia") {
    return territorio ? `Junta de Freguesia de ${territorio}` : "Junta de Freguesia";
  }

  return textoSeguro(perfil?.orgao) || "órgão executivo";
}

export function obterDadosInstitucionais(
  contexto?: ContextoDocumentoInstitucional,
): DadosInstitucionais {
  const auth = obterAuthState();
  const perfil = contexto?.perfil ?? auth.perfil;
  const user = auth.user;
  const nomeOrgao = resolverOrgaoInstitucional(contexto, auth.perfil).nome ?? "";

  return {
    nomeOrgao,
    entidadeDeliberativa: obterEntidadeDeliberativa(nomeOrgao, perfil, contexto?.assembleia),
    nomeEleito:
      textoSeguro(contexto?.nomeEleito) ||
      textoSeguro(perfil?.nomeInstitucional) ||
      textoSeguro(user?.nome) ||
      "Nome do eleito",
    cargo:
      textoSeguro(contexto?.institutionalContext?.electedOfficial.institutionalTitle) ||
      textoSeguro(perfil?.cargo) ||
      "",
    grupoPolitico: normalizarGrupoPolitico(contexto?.grupoPolitico) || "",
    logoUrl: textoSeguro(perfil?.logoUrl),
    local:
      textoSeguro(contexto?.assembleia?.local) ||
      textoSeguro(contexto?.institutionalContext?.territory.municipalityName) ||
      textoSeguro(perfil?.municipio) ||
      textoSeguro(perfil?.territorio) ||
      "Local",
    data: dataFormatada(contexto?.assembleia?.data),
  };
}

const placeholdersInstitucionais = [
  { pattern: /texto\s+por\s+preencher\.?/i, campo: "conteúdo por preencher" },
  { pattern: /\[data\]/i, campo: "data" },
  { pattern: /_{3,}\s+de\s+_{3,}/i, campo: "data" },
  { pattern: /\[(?:local|órgão|orgao|nome|cargo|assinatura)\]/i, campo: "campo institucional" },
];

export function validarDocumentoInstitucional(
  documento: Pick<DocumentoCriado, "tipo" | "titulo" | "conteudo">,
  contexto?: ContextoDocumentoInstitucional,
): ResultadoValidacaoDocumentoInstitucional {
  const erros: string[] = [];
  const avisos: string[] = [];
  const dados = obterDadosInstitucionais(contexto);
  const conteudo = documento.conteudo.trim();

  if (!dados.nomeOrgao) {
    erros.push("O órgão institucional não está resolvido.");
  }
  if (!documento.tipo.trim()) erros.push("O tipo documental está em falta.");
  if (!documento.titulo.trim()) erros.push("O título está em falta.");
  if (!conteudo) erros.push("O conteúdo substantivo está em falta.");

  placeholdersInstitucionais.forEach(({ pattern, campo }) => {
    if (pattern.test(conteudo)) erros.push(`Existe um placeholder não resolvido: ${campo}.`);
  });

  if (/^\s*(?:#+\s*)?chega!?\s*$/im.test(conteudo.split(/\r?\n/)[0] ?? "")) {
    erros.push("O conteúdo contém identidade partidária usada como cabeçalho.");
  }

  const linhasRodape = conteudo.match(
    /^(?:local e data|data|proponente|assinatura|o proponente|a proponente|grupo político|grupo politico)\s*:?/gim,
  );
  if (linhasRodape?.length) {
    erros.push("O conteúdo contém um rodapé institucional que seria duplicado pelo template.");
  }
  if (/^[\p{L} .'-]+,\s*\d{1,2}\s+de\s+[\p{L}]+\s+de\s+\d{4}\s*$/imu.test(conteudo)) {
    erros.push("O conteúdo contém uma data institucional que seria duplicada pelo template.");
  }
  const cauda = conteudo
    .split(/\r?\n/)
    .slice(-8)
    .map((linha) => linha.trim());
  if (dados.nomeEleito && cauda.includes(dados.nomeEleito)) {
    erros.push(
      "O conteúdo contém a identificação do proponente que seria duplicada pelo template.",
    );
  }

  if (isTipoDocumentoInstitucional(documento.tipo)) {
    const vazias = obterSecoesDocumentoInstitucional(documento.tipo, conteudo).filter(
      (secao) => !secao.conteudo.trim(),
    );
    vazias.forEach((secao) => erros.push(`A secção ${secao.titulo} não tem conteúdo.`));
  }

  if (!dados.grupoPolitico) avisos.push("O grupo político não está configurado e será omitido.");

  return { pronto: erros.length === 0, erros: Array.from(new Set(erros)), avisos };
}

export function criarConteudoInicialInstitucional(
  tipo: TipoDocumentoInstitucional,
  titulo: string,
  notas?: string,
  contexto?: ContextoDocumentoInstitucional,
) {
  const dados = obterDadosInstitucionais(contexto);
  const perfil = contexto?.perfil ?? obterAuthState().perfil;
  const destinatarioExecutivo = obterDestinatarioExecutivo(perfil);
  const notasPreparacao = notas?.trim();

  if (tipo === "Moção") {
    return `## ENQUADRAMENTO

${notasPreparacao || ""}

## FUNDAMENTAÇÃO

Considerando que:

## PROPOSTA / DELIBERAÇÃO

Face ao exposto,
${dados.entidadeDeliberativa} delibera:`;
  }

  if (tipo === "Recomendação") {
    return `## ENQUADRAMENTO

${notasPreparacao || ""}

## FUNDAMENTAÇÃO

Considerando que:

## RECOMENDAÇÃO

Face ao exposto,
recomenda-se que a ${destinatarioExecutivo}:`;
  }

  return `## ENQUADRAMENTO

${notasPreparacao || ""}

## FUNDAMENTAÇÃO

Considerando que:

## REQUERIMENTO

Face ao exposto,
requer-se que a ${destinatarioExecutivo} informe:`;
}

function removerTituloMarkdown(conteudo: string, titulo: string) {
  const linhas = conteudo.trim().split(/\r?\n/);
  const primeiraLinha = linhas[0]?.trim();
  const tituloMarkdown = `# ${titulo.trim()}`;

  if (
    primeiraLinha &&
    primeiraLinha.toLocaleLowerCase("pt-PT") === tituloMarkdown.toLocaleLowerCase("pt-PT")
  ) {
    return linhas.slice(1).join("\n").trim();
  }

  return conteudo.trim();
}

function normalizarTituloSecao(valor: string) {
  return valor
    .trim()
    .replace(/^#{1,6}\s*/, "")
    .replace(/:$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleUpperCase("pt-PT");
}

function obterTituloSecaoNormalizado(
  tipo: TipoDocumentoInstitucional,
  linha: string,
): string | undefined {
  const tituloNormalizado = normalizarTituloSecao(linha);
  const secoesEsperadas = secoesPorTipo[tipo];
  const aliases: Record<string, string | undefined> = {
    ENQUADRAMENTO: "ENQUADRAMENTO",
    CONTEXTO: "ENQUADRAMENTO",
    "EXPOSICAO DE MOTIVOS": "ENQUADRAMENTO",
    "EXPOSICAO DOS MOTIVOS": "ENQUADRAMENTO",
    MOTIVOS: "ENQUADRAMENTO",
    FUNDAMENTACAO: "FUNDAMENTAÇÃO",
    FUNDAMENTOS: "FUNDAMENTAÇÃO",
    CONSIDERANDOS: "FUNDAMENTAÇÃO",
    DELIBERACAO: tipo === "Moção" ? "PROPOSTA / DELIBERAÇÃO" : undefined,
    PROPOSTA: tipo === "Moção" ? "PROPOSTA / DELIBERAÇÃO" : undefined,
    "PROPOSTA / DELIBERACAO": "PROPOSTA / DELIBERAÇÃO",
    PEDIDO: tipo === "Requerimento" ? "REQUERIMENTO" : "RECOMENDAÇÃO",
    RECOMENDACAO: "RECOMENDAÇÃO",
    REQUERIMENTO: "REQUERIMENTO",
  };
  const direto = secoesEsperadas.find(
    (secao) => normalizarTituloSecao(secao) === tituloNormalizado,
  );
  const alias = aliases[tituloNormalizado];

  if (direto) return direto;
  if (alias && secoesEsperadas.includes(alias)) return alias;
  return undefined;
}

function linhaPareceTituloSecao(tipo: TipoDocumentoInstitucional, linha: string) {
  if (!linha.trim()) return undefined;
  return obterTituloSecaoNormalizado(tipo, linha);
}

export function obterSecoesDocumentoInstitucional(
  tipo: TipoDocumentoInstitucional,
  conteudo: string,
): SecaoDocumentoInstitucional[] {
  const secoesEsperadas = secoesPorTipo[tipo];
  const secoes = new Map<string, string[]>();
  let secaoAtual: string | undefined;

  for (const linhaOriginal of removerTituloMarkdown(conteudo, "").split(/\r?\n/)) {
    const linha = linhaOriginal.trimEnd();

    const tituloSecao = linha.trim().startsWith("## ")
      ? obterTituloSecaoNormalizado(tipo, linha.trim().slice(3))
      : linhaPareceTituloSecao(tipo, linha);

    if (tituloSecao) {
      secaoAtual = tituloSecao;
      if (secaoAtual && !secoes.has(secaoAtual)) secoes.set(secaoAtual, []);
      continue;
    }

    if (!secaoAtual) continue;
    secoes.get(secaoAtual)?.push(linha);
  }

  return secoesEsperadas.map((titulo) => ({
    titulo,
    conteudo: normalizarConteudoInstitucionalVisivel(secoes.get(titulo)?.join("\n") ?? ""),
  }));
}

function obterSecoesDocumentoInstitucionalSemFallback(
  tipo: TipoDocumentoInstitucional,
  conteudo: string,
): SecaoDocumentoInstitucional[] {
  const secoesEsperadas = secoesPorTipo[tipo];
  const secoes = new Map<string, string[]>();
  let secaoAtual: string | undefined;

  for (const linhaOriginal of conteudo.split(/\r?\n/)) {
    const linha = linhaOriginal.trimEnd();

    const tituloSecao = linha.trim().startsWith("## ")
      ? obterTituloSecaoNormalizado(tipo, linha.trim().slice(3))
      : linhaPareceTituloSecao(tipo, linha);

    if (tituloSecao) {
      secaoAtual = tituloSecao;
      if (secaoAtual && !secoes.has(secaoAtual)) secoes.set(secaoAtual, []);
      continue;
    }

    if (!secaoAtual) continue;
    secoes.get(secaoAtual)?.push(linha);
  }

  return secoesEsperadas.map((titulo) => ({
    titulo,
    conteudo: secoes.get(titulo)?.join("\n").trim() || "",
  }));
}

export function serializarSecoesDocumentoInstitucional(secoes: SecaoDocumentoInstitucional[]) {
  return secoes
    .map((secao) => ({
      ...secao,
      conteudo: normalizarConteudoInstitucionalVisivel(secao.conteudo),
    }))
    .filter((secao) => secao.conteudo)
    .map((secao) => `## ${secao.titulo}\n\n${secao.conteudo}`)
    .join("\n\n");
}

function renderMarkdownInstitucional(markdown: string) {
  const linhas = markdown.split(/\r?\n/);
  const html: string[] = [];
  let paragrafo: string[] = [];
  let listaAberta = false;

  function fecharParagrafo() {
    if (paragrafo.length === 0) return;
    html.push(`<p>${paragrafo.map(escaparHtml).join("<br />")}</p>`);
    paragrafo = [];
  }

  function fecharLista() {
    if (!listaAberta) return;
    html.push("</ol>");
    listaAberta = false;
  }

  for (const linhaOriginal of linhas) {
    const linha = linhaOriginal.trim();

    if (!linha) {
      fecharParagrafo();
      fecharLista();
      continue;
    }

    if (linha.startsWith("## ")) {
      fecharParagrafo();
      fecharLista();
      html.push(`<h2>${escaparHtml(linha.slice(3).trim())}</h2>`);
      continue;
    }

    if (linha.startsWith("# ")) {
      fecharParagrafo();
      fecharLista();
      continue;
    }

    const itemLista = linha.match(/^\d+\.\s+(.*)$/);
    if (itemLista) {
      fecharParagrafo();
      if (!listaAberta) {
        html.push("<ol>");
        listaAberta = true;
      }
      html.push(`<li>${escaparHtml(itemLista[1] ?? "")}</li>`);
      continue;
    }

    fecharLista();
    paragrafo.push(linha);
  }

  fecharParagrafo();
  fecharLista();

  return html.join("\n");
}

function cssDocumentoInstitucional() {
  return `
      @page { size: A4; margin: 24mm 22mm 24mm; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        color: #111827;
        background: #ffffff;
        font-family: "Times New Roman", Times, serif;
        font-size: 12.5pt;
        line-height: 1.62;
      }
      .documento-institucional {
        margin: 0 auto;
        max-width: 760px;
      }
      header {
        border-bottom: 1px solid #d1d5db;
        margin-bottom: 26px;
        padding-bottom: 22px;
        text-align: center;
      }
      .logo {
        display: block;
        height: auto;
        margin: 0 auto 18px;
        max-height: 72px;
        max-width: 150px;
      }
      .orgao {
        color: #374151;
        font-family: Arial, sans-serif;
        font-size: 10.5pt;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .tipo {
        color: #111827;
        font-family: Arial, sans-serif;
        font-size: 15pt;
        font-weight: 800;
        letter-spacing: 0.16em;
        margin-top: 16px;
        text-transform: uppercase;
      }
      h1 {
        color: #111827;
        font-family: Arial, sans-serif;
        font-size: 18pt;
        font-weight: 800;
        letter-spacing: 0.02em;
        line-height: 1.28;
        margin: 18px 0 0;
        text-transform: uppercase;
      }
      main h2 {
        color: #111827;
        font-family: Arial, sans-serif;
        font-size: 11.5pt;
        font-weight: 800;
        letter-spacing: 0.08em;
        margin: 26px 0 10px;
        text-transform: uppercase;
      }
      p {
        margin: 0 0 12px;
        text-align: justify;
      }
      ol {
        margin: 8px 0 16px 24px;
        padding: 0;
      }
      li {
        margin: 0 0 8px;
        padding-left: 6px;
      }
      footer {
        margin-top: 54px;
        page-break-inside: avoid;
      }
      .data {
        margin-bottom: 36px;
      }
      .proponente {
        margin-bottom: 26px;
      }
      .assinatura {
        margin: 0 0 8px;
      }
      .linha-assinatura {
        border-top: 1px solid #111827;
        display: inline-block;
        min-width: 280px;
        padding-top: 10px;
      }
      .nome-eleito,
      .grupo-politico {
        margin: 0;
      }
      @media print {
        body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      }
    `;
}

export function criarHtmlDocumentoInstitucional(
  documento: Pick<DocumentoCriado, "tipo" | "titulo" | "conteudo">,
  contexto?: ContextoDocumentoInstitucional,
) {
  const dados = obterDadosInstitucionais(contexto);
  const titulo = documento.titulo.trim() || "Documento sem título";
  const conteudo = isTipoDocumentoInstitucional(documento.tipo)
    ? serializarSecoesDocumentoInstitucional(
        obterSecoesDocumentoInstitucional(documento.tipo, documento.conteudo || ""),
      )
    : removerTituloMarkdown(documento.conteudo || "", titulo);
  const tipo = capitalizarTipo(documento.tipo);

  return `<!doctype html>
<html lang="pt">
  <head>
    <meta charset="utf-8" />
    <title>${escaparHtml(titulo)}</title>
    <style>${cssDocumentoInstitucional()}</style>
  </head>
  <body>
    <article class="documento-institucional">
      <header>
        ${
          dados.logoUrl
            ? `<img class="logo" src="${escaparHtml(dados.logoUrl)}" alt="" onerror="this.remove()" />`
            : ""
        }
        <div class="orgao">${escaparHtml(dados.nomeOrgao)}</div>
        <div class="tipo">${escaparHtml(tipo)}</div>
        <h1>${escaparHtml(titulo)}</h1>
      </header>
      <main>
        ${renderMarkdownInstitucional(conteudo)}
      </main>
      <footer>
        <p class="data">${escaparHtml(dados.local)}, ${escaparHtml(dados.data)}</p>
        <p class="proponente">O Proponente,</p>
        <p class="assinatura"><span class="linha-assinatura"></span></p>
        <p class="nome-eleito">${escaparHtml(dados.nomeEleito)}</p>
        ${dados.cargo ? `<p class="cargo">${escaparHtml(dados.cargo)}</p>` : ""}
        ${dados.grupoPolitico ? `<p class="grupo-politico">${escaparHtml(dados.grupoPolitico)}</p>` : ""}
      </footer>
    </article>
  </body>
</html>`;
}

export function nomeFicheiroDocumento(
  documento: Pick<DocumentoCriado, "tipo" | "titulo">,
  extensao: string,
) {
  const base = `${documento.tipo}_${documento.titulo || "Documento"}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 90);

  return `${base || "Documento_Tribuno"}.${extensao}`;
}
