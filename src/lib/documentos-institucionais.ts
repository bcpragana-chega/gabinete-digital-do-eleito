import { obterAuthState, type PerfilEleito } from "@/lib/auth-store";
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
  nomeEleito?: string;
  grupoPolitico?: string;
};

type DadosInstitucionais = {
  nomeOrgao: string;
  entidadeDeliberativa: string;
  nomeEleito: string;
  cargo: string;
  grupoPolitico: string;
  local: string;
  data: string;
};

const tiposInstitucionais: TipoDocumentoInstitucional[] = ["Moção", "Recomendação", "Requerimento"];

const secoesPorTipo: Record<TipoDocumentoInstitucional, string[]> = {
  Moção: ["ENQUADRAMENTO", "FUNDAMENTAÇÃO", "PROPOSTA / DELIBERAÇÃO"],
  Recomendação: ["ENQUADRAMENTO", "FUNDAMENTAÇÃO", "RECOMENDAÇÃO"],
  Requerimento: ["ENQUADRAMENTO", "FUNDAMENTAÇÃO", "REQUERIMENTO"],
};

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

function obterNomeOrgao(
  perfil?: PerfilEleito,
  assembleia?: ContextoDocumentoInstitucional["assembleia"],
) {
  const organizacao = textoSeguro(perfil?.organizacao);
  if (organizacao) return organizacao;

  const orgao = textoSeguro(assembleia?.orgao) || textoSeguro(perfil?.orgao);
  const territorio = textoSeguro(perfil?.territorio);

  if (orgao && territorio && orgao !== "Outro") return `${orgao} de ${territorio}`;
  if (orgao && orgao !== "Outro") return orgao;
  if (textoSeguro(assembleia?.nome)) return assembleia?.nome.trim() ?? "";

  return "Órgão competente";
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

export function obterDadosInstitucionais(
  contexto?: ContextoDocumentoInstitucional,
): DadosInstitucionais {
  const auth = obterAuthState();
  const perfil = contexto?.perfil ?? auth.perfil;
  const user = auth.user;
  const nomeOrgao = obterNomeOrgao(perfil, contexto?.assembleia);

  return {
    nomeOrgao,
    entidadeDeliberativa: obterEntidadeDeliberativa(nomeOrgao, perfil, contexto?.assembleia),
    nomeEleito:
      textoSeguro(contexto?.nomeEleito) ||
      textoSeguro(perfil?.nomeInstitucional) ||
      textoSeguro(user?.nome) ||
      "Nome do eleito",
    cargo: textoSeguro(perfil?.cargo) || "Cargo",
    grupoPolitico:
      textoSeguro(contexto?.grupoPolitico) ||
      textoSeguro(perfil?.assinaturaInstitucional) ||
      "Grupo político",
    local: textoSeguro(contexto?.assembleia?.local) || textoSeguro(perfil?.territorio) || "Local",
    data: dataFormatada(contexto?.assembleia?.data),
  };
}

export function criarConteudoInicialInstitucional(
  tipo: TipoDocumentoInstitucional,
  titulo: string,
  notas?: string,
  contexto?: ContextoDocumentoInstitucional,
) {
  const dados = obterDadosInstitucionais(contexto);
  const notasPreparacao = notas?.trim();

  if (tipo === "Moção") {
    return `## ENQUADRAMENTO

${notasPreparacao || "[Descrever de forma objetiva o contexto institucional, social ou político que justifica a apresentação da moção.]"}

## FUNDAMENTAÇÃO

Considerando que:

1. [Primeiro fundamento relevante para a deliberação.]
2. [Segundo fundamento, com impacto para a população ou para o interesse público.]
3. [Terceiro fundamento, incluindo enquadramento legal, administrativo ou histórico quando aplicável.]

## PROPOSTA / DELIBERAÇÃO

Face ao exposto,
${dados.entidadeDeliberativa} delibera:

1. [Primeira deliberação ou posição a aprovar.]
2. [Segunda deliberação, recomendação ou compromisso institucional.]
3. [Terceira deliberação, entidade destinatária ou medida de acompanhamento.]
4. [Forma de comunicação, execução ou remessa da presente moção.]`;
  }

  if (tipo === "Recomendação") {
    return `## ENQUADRAMENTO

[Descrever a situação concreta que justifica a recomendação, identificando o problema e a sua relevância pública.]

## FUNDAMENTAÇÃO

Considerando que:

1. [Primeiro fundamento factual ou administrativo.]
2. [Segundo fundamento relativo ao impacto na comunidade.]
3. [Terceiro fundamento sobre oportunidade, responsabilidade ou exequibilidade.]

## RECOMENDAÇÃO

Face ao exposto,
recomenda-se ao Executivo competente que:

1. [Primeira medida recomendada.]
2. [Segunda medida recomendada.]
3. [Prazo, forma de acompanhamento ou entidade responsável.]`;
  }

  return `## ENQUADRAMENTO

[Descrever o contexto que justifica o pedido de informação ou esclarecimento.]

## FUNDAMENTAÇÃO

Considerando que:

1. [Primeiro fundamento do interesse público do pedido.]
2. [Segundo fundamento relacionado com transparência, fiscalização ou acompanhamento.]
3. [Terceiro fundamento sobre documentação, execução ou responsabilidade administrativa.]

## REQUERIMENTO

Face ao exposto,
requer-se ao Executivo competente que informe:

1. [Primeira informação, documento ou esclarecimento requerido.]
2. [Segunda informação, documento ou esclarecimento requerido.]
3. [Prazo, detalhe, formato ou entidade responsável pela resposta.]`;
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

  const defaults = criarConteudoInicialInstitucional(tipo, "");

  return secoesEsperadas.map((titulo) => ({
    titulo,
    conteudo:
      secoes.get(titulo)?.join("\n").trim() ||
      obterSecoesDocumentoInstitucionalSemFallback(tipo, defaults).find(
        (secao) => secao.titulo === titulo,
      )?.conteudo ||
      "",
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
  return secoes.map((secao) => `## ${secao.titulo}\n\n${secao.conteudo.trim()}`).join("\n\n");
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
        font-family: Georgia, "Times New Roman", serif;
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
        font-family: Inter, Arial, sans-serif;
        font-size: 10.5pt;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .tipo {
        color: #111827;
        font-family: Inter, Arial, sans-serif;
        font-size: 15pt;
        font-weight: 800;
        letter-spacing: 0.16em;
        margin-top: 16px;
        text-transform: uppercase;
      }
      h1 {
        color: #111827;
        font-family: Inter, Arial, sans-serif;
        font-size: 18pt;
        font-weight: 800;
        letter-spacing: 0.02em;
        line-height: 1.28;
        margin: 18px 0 0;
        text-transform: uppercase;
      }
      main h2 {
        color: #111827;
        font-family: Inter, Arial, sans-serif;
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
        <img class="logo" src="/branding/logo.png" alt="" onerror="this.remove()" />
        <div class="orgao">${escaparHtml(dados.nomeOrgao)}</div>
        <div class="tipo">${escaparHtml(tipo)}</div>
        <h1>${escaparHtml(titulo)}</h1>
      </header>
      <main>
        ${renderMarkdownInstitucional(conteudo || "[Escrever conteúdo do documento.]")}
      </main>
      <footer>
        <p class="data">${escaparHtml(dados.local)}, ${escaparHtml(dados.data)}</p>
        <p class="proponente">Proponente:</p>
        <p class="assinatura"><span class="linha-assinatura"></span></p>
        <p class="nome-eleito">${escaparHtml(dados.nomeEleito)}</p>
        <p class="grupo-politico">${escaparHtml(dados.grupoPolitico)}</p>
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
