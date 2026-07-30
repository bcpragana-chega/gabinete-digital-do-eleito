import type { ContextoDocumentoInstitucional } from "@/lib/documentos-institucionais";
import { obterDadosInstitucionais } from "@/lib/documentos-institucionais";
import type { DocumentoCriado, TipoDocumentoCriado } from "@/lib/types";
import { resolverLogoPartidario, resolverMandatoInstitucional } from "@/lib/party-branding";

export const DOCUMENT_MODEL_VERSION = "tribuno-document-v1" as const;

export type InlineRun = { text: string; bold?: boolean };

export type DocumentBlock =
  | { type: "paragraph"; text: string; runs?: InlineRun[] }
  | { type: "ordered-list"; items: string[] }
  | { type: "bullet-list"; items: string[] };

export type CanonicalDocument = {
  version: typeof DOCUMENT_MODEL_VERSION;
  header: {
    logoUrl?: string;
    institution?: string;
    mandate?: string;
    documentType: string;
    title: string;
  };
  documentData: Array<{ label: string; value: string }>;
  recipient?: string;
  sections: Array<{ id: string; title: string; blocks: DocumentBlock[] }>;
  closing: {
    location?: string;
    date?: string;
    signatureLabel?: string;
    name?: string;
    role?: string;
    politicalGroup?: string;
  };
};

const sectionTitles: Record<TipoDocumentoCriado, string[]> = {
  Moção: ["ENQUADRAMENTO", "CONSIDERANDOS", "DELIBERAÇÃO / PROPOSTA"],
  Requerimento: ["DESTINATÁRIO", "ENQUADRAMENTO", "FUNDAMENTAÇÃO", "PEDIDOS / PERGUNTAS"],
  Recomendação: ["ENQUADRAMENTO", "PROBLEMA IDENTIFICADO", "FUNDAMENTAÇÃO", "RECOMENDAÇÕES"],
  "Declaração de voto": [
    "IDENTIFICAÇÃO DA VOTAÇÃO",
    "SENTIDO DE VOTO",
    "FUNDAMENTAÇÃO",
    "CONCLUSÃO",
  ],
  Intervenção: ["ABERTURA", "CONTEXTO", "ARGUMENTAÇÃO", "CONCLUSÃO"],
  "Outro documento": [],
};

const aliases: Record<string, string> = {
  CONTEXTO: "ENQUADRAMENTO",
  "EXPOSICAO DE MOTIVOS": "ENQUADRAMENTO",
  "EXPOSICAO DOS MOTIVOS": "ENQUADRAMENTO",
  FUNDAMENTOS: "FUNDAMENTAÇÃO",
  FUNDAMENTACAO: "FUNDAMENTAÇÃO",
  CONSIDERANDOS: "CONSIDERANDOS",
  "PROPOSTA / DELIBERACAO": "DELIBERAÇÃO / PROPOSTA",
  "PROPOSTA / DELIBERAÇÃO": "DELIBERAÇÃO / PROPOSTA",
  DELIBERACAO: "DELIBERAÇÃO / PROPOSTA",
  DELIBERAÇÃO: "DELIBERAÇÃO / PROPOSTA",
  PROPOSTA: "DELIBERAÇÃO / PROPOSTA",
  REQUERIMENTO: "PEDIDOS / PERGUNTAS",
  PEDIDO: "PEDIDOS / PERGUNTAS",
  PEDIDOS: "PEDIDOS / PERGUNTAS",
  PERGUNTAS: "PEDIDOS / PERGUNTAS",
  RECOMENDACAO: "RECOMENDAÇÕES",
  RECOMENDAÇÃO: "RECOMENDAÇÕES",
  RECOMENDACOES: "RECOMENDAÇÕES",
  DECLARACAO: "CONCLUSÃO",
};

function clean(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed || /^(?:undefined|null)$/i.test(trimmed)) return undefined;
  return trimmed;
}

function normalizeTitle(value: string) {
  return value
    .replace(/^#{1,6}\s*/, "")
    .replace(/:$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleUpperCase("pt-PT");
}

function slug(value: string, index: number) {
  return (
    normalizeTitle(value)
      .toLocaleLowerCase("pt-PT")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `secao-${index + 1}`
  );
}

export function parseBlocks(text: string): DocumentBlock[] {
  const blocks: DocumentBlock[] = [];
  const paragraphs = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);

  paragraphs.forEach((paragraph) => {
    const lines = paragraph
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length && lines.every((line) => /^\d+[.)]\s+/.test(line))) {
      blocks.push({
        type: "ordered-list",
        items: lines.map((line) => line.replace(/^\d+[.)]\s+/, "")),
      });
    } else if (lines.length && lines.every((line) => /^[-*•]\s+/.test(line))) {
      blocks.push({
        type: "bullet-list",
        items: lines.map((line) => line.replace(/^[-*•]\s+/, "")),
      });
    } else {
      const runs = parseInlineRuns(lines.join("\n"));
      blocks.push({
        type: "paragraph",
        text: runs.map((run) => run.text).join(""),
        runs: runs.some((run) => run.bold) ? runs : undefined,
      });
    }
  });
  return blocks;
}

function parseInlineRuns(text: string): InlineRun[] {
  const runs: InlineRun[] = [];
  let cursor = 0;
  const pattern = /\*\*(.+?)\*\*/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    if (match.index > cursor) runs.push({ text: text.slice(cursor, match.index) });
    if (match[1]) runs.push({ text: match[1], bold: true });
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) runs.push({ text: text.slice(cursor) });
  return runs.length ? runs : [{ text }];
}

export function blocksToText(blocks: DocumentBlock[]) {
  return blocks
    .map((block) => {
      if (block.type === "paragraph")
        return block.runs
          ? block.runs.map((run) => (run.bold ? `**${run.text}**` : run.text)).join("")
          : block.text;
      const marker = block.type === "ordered-list" ? (index: number) => `${index + 1}.` : () => "-";
      return block.items.map((item, index) => `${marker(index)} ${item}`).join("\n");
    })
    .filter(Boolean)
    .join("\n\n");
}

function parseLegacySections(tipo: TipoDocumentoCriado, content: string) {
  const expected = sectionTitles[tipo];
  const parsed: Array<{ title: string; content: string[] }> = [];
  let current: { title: string; content: string[] } | undefined;

  content
    .replace(/\r\n/g, "\n")
    .split("\n")
    .forEach((line) => {
      const raw = line.trim();
      const normalized = normalizeTitle(raw);
      let alias =
        aliases[normalized] ??
        raw
          .replace(/^#{1,6}\s*/, "")
          .replace(/:$/, "")
          .trim();
      if (tipo === "Moção" && normalizeTitle(alias) === "FUNDAMENTACAO") alias = "CONSIDERANDOS";
      if (tipo === "Declaração de voto" && normalizeTitle(alias) === "ENQUADRAMENTO")
        alias = "IDENTIFICAÇÃO DA VOTAÇÃO";
      const heading = /^#{1,6}\s+/.test(raw);
      const known = expected.some((title) => normalizeTitle(title) === normalizeTitle(alias));
      if (heading || known) {
        current = { title: alias, content: [] };
        parsed.push(current);
      } else if (current) {
        current.content.push(line);
      } else if (raw) {
        current = { title: expected[0] ?? "CONTEÚDO", content: [line] };
        parsed.push(current);
      }
    });

  if (expected.length === 0) {
    return parsed.length ? parsed : [{ title: "CONTEÚDO", content: [content] }];
  }

  return expected.map((title) => {
    const matching = parsed.filter(
      (section) => normalizeTitle(section.title) === normalizeTitle(title),
    );
    return { title, content: matching.flatMap((section) => section.content) };
  });
}

export function isCanonicalDocument(value: unknown): value is CanonicalDocument {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    record.version === DOCUMENT_MODEL_VERSION &&
    Array.isArray(record.sections) &&
    Boolean(record.header) &&
    Boolean(record.closing)
  );
}

export function normalizeDocument(
  documento: Pick<DocumentoCriado, "tipo" | "titulo" | "conteudo" | "conteudoJson">,
  contexto?: ContextoDocumentoInstitucional,
): CanonicalDocument {
  const data = obterDadosInstitucionais(contexto);

  if (isCanonicalDocument(documento.conteudoJson)) {
    const canonical = sanitizeDocument(documento.conteudoJson);
    const mandatoResolvido = resolverMandatoInstitucional({
      perfil: contexto?.perfil,
      contexto: contexto?.institutionalContext,
    });

    return sanitizeDocument({
      ...canonical,
      header: {
        ...canonical.header,
        logoUrl: data.logoUrl ?? canonical.header.logoUrl,
        mandate: canonical.header.mandate ?? mandatoResolvido,
      },
    });
  }

  const sections = parseLegacySections(documento.tipo, documento.conteudo || "");
  const documentData = [
    { label: "Sessão", value: contexto?.sessao ?? contexto?.assembleia?.nome ?? "" },
    { label: "Proponente", value: data.nomeEleito === "Nome do eleito" ? "" : data.nomeEleito },
    { label: "Grupo", value: data.grupoPolitico },
    { label: "Assunto", value: contexto?.assunto ?? "" },
    { label: "Ponto", value: contexto?.ponto ?? "" },
  ].filter((item) => clean(item.value)) as Array<{ label: string; value: string }>;

  return sanitizeDocument({
    version: DOCUMENT_MODEL_VERSION,
    header: {
      logoUrl: data.logoUrl,
      institution: data.nomeOrgao,
      mandate: resolverMandatoInstitucional({
        perfil: contexto?.perfil,
        contexto: contexto?.institutionalContext,
      }),
      documentType: documento.tipo,
      title: documento.titulo,
    },
    documentData,
    sections: sections.map((section, index) => ({
      id: slug(section.title, index),
      title: section.title,
      blocks: parseBlocks(section.content.join("\n").trim()),
    })),
    closing: {
      location: data.local,
      date: data.data,
      name: data.nomeEleito === "Nome do eleito" ? undefined : data.nomeEleito,
      role: data.cargo,
      politicalGroup: data.grupoPolitico,
    },
  });
}

export function sanitizeDocument(document: CanonicalDocument): CanonicalDocument {
  return {
    version: DOCUMENT_MODEL_VERSION,
    header: {
      logoUrl: clean(document.header.logoUrl),
      institution: clean(document.header.institution),
      mandate: clean(document.header.mandate),
      documentType: clean(document.header.documentType) ?? "Documento",
      title: clean(document.header.title) ?? "Documento sem título",
    },
    documentData: (document.documentData ?? [])
      .map((item) => ({ label: clean(item.label) ?? "", value: clean(item.value) ?? "" }))
      .filter((item) => item.label && item.value),
    recipient: clean(document.recipient),
    sections: (document.sections ?? []).map((section, index) => ({
      id: clean(section.id) ?? slug(section.title, index),
      title: clean(section.title) ?? `SECÇÃO ${index + 1}`,
      blocks: (section.blocks ?? []).filter((block) =>
        block.type === "paragraph" ? Boolean(clean(block.text)) : block.items.some(Boolean),
      ),
    })),
    closing: {
      location: clean(document.closing?.location),
      date: clean(document.closing?.date),
      signatureLabel: clean(document.closing?.signatureLabel),
      name: clean(document.closing?.name),
      role: clean(document.closing?.role),
      politicalGroup: clean(document.closing?.politicalGroup),
    },
  };
}

export function serializeDocumentToMarkdown(document: CanonicalDocument) {
  return sanitizeDocument(document)
    .sections.map((section) => `## ${section.title}\n\n${blocksToText(section.blocks)}`.trim())
    .join("\n\n");
}
