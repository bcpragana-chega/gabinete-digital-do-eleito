import { listarAssembleias } from "@/lib/assembleias-store";
import { listarDossies, obterDossie } from "@/lib/dossies-store";
import { listarDocumentosLocais } from "@/lib/documentos-store";
import { listarTodasNotasDossie } from "@/lib/dossie-notas-store";
import { listarTodosEventosTimelineDossie } from "@/lib/dossie-timeline-store";
import type { Documento } from "@/lib/types";

export type UniversalSearchType =
  | "assembleias"
  | "dossies"
  | "documentos"
  | "notas"
  | "timeline"
  | "pessoas"
  | "entidades"
  | "compromissos";

export type UniversalSearchResult = {
  id: string;
  type: UniversalSearchType;
  title: string;
  description?: string;
  meta?: string;
  href: string;
  terms: string[];
};

export type UniversalSearchGroup = {
  type: UniversalSearchType;
  label: string;
  results: UniversalSearchResult[];
};

const groupLabels: Record<UniversalSearchType, string> = {
  assembleias: "Sessões",
  dossies: "Assuntos",
  documentos: "Documentos",
  notas: "Notas dos assuntos",
  timeline: "O que aconteceu",
  pessoas: "Pessoas",
  entidades: "Entidades",
  compromissos: "Compromissos",
};

const groupOrder: UniversalSearchType[] = [
  "assembleias",
  "dossies",
  "documentos",
  "notas",
  "timeline",
];

function normalizar(valor: string) {
  return valor
    .toLocaleLowerCase("pt-PT")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function documentoKey(documento: Documento) {
  return documento.id;
}

function documentosUnicos(documentos: Documento[]) {
  const porId = new Map<string, Documento>();

  documentos.forEach((documento) => {
    porId.set(documentoKey(documento), documento);
  });

  return Array.from(porId.values()).sort((a, b) => b.data.localeCompare(a.data));
}

function matches(result: UniversalSearchResult, query: string) {
  const normalizedQuery = normalizar(query.trim());
  if (!normalizedQuery) return false;

  return result.terms.some((term) => normalizar(term).includes(normalizedQuery));
}

function buildIndex(): UniversalSearchResult[] {
  const assembleias = listarAssembleias().map(
    (assembleia): UniversalSearchResult => ({
      id: assembleia.id,
      type: "assembleias",
      title: assembleia.nome,
      description: assembleia.local,
      meta: `${assembleia.data}${assembleia.hora ? ` · ${assembleia.hora}` : ""}`,
      href: `/sessoes/${assembleia.id}`,
      terms: [assembleia.nome, assembleia.local, assembleia.estado, assembleia.data],
    }),
  );

  const dossies = listarDossies().map(
    (dossie): UniversalSearchResult => ({
      id: dossie.id,
      type: "dossies",
      title: dossie.titulo,
      description: dossie.resumo,
      meta: dossie.prioridade,
      href: `/assuntos/${dossie.id}`,
      terms: [
        dossie.titulo,
        dossie.resumo,
        dossie.objetivoPolitico,
        dossie.estado,
        dossie.prioridade,
        ...dossie.tags,
      ],
    }),
  );

  const documentos = documentosUnicos(listarDocumentosLocais()).map(
    (documento): UniversalSearchResult => ({
      id: documento.id,
      type: "documentos",
      title: documento.titulo,
      description: documento.notas || documento.tipo,
      meta: documento.estado,
      href: `/sessoes/${documento.assembleiaId}/documentos/${documento.id}`,
      terms: [
        documento.titulo,
        documento.tipo,
        documento.estado,
        documento.notas ?? "",
        documento.ficheiroNome ?? "",
        documento.data,
      ],
    }),
  );

  const notas = listarTodasNotasDossie().map((nota): UniversalSearchResult => {
    const dossie = obterDossie(nota.dossieId);

    return {
      id: nota.id,
      type: "notas",
      title: dossie ? `Nota · ${dossie.titulo}` : "Nota de assunto",
      description: nota.conteudo,
      meta: dossie?.titulo,
      href: `/assuntos/${nota.dossieId}`,
      terms: [nota.conteudo, dossie?.titulo ?? "", dossie?.resumo ?? "", ...(dossie?.tags ?? [])],
    };
  });

  const timeline = listarTodosEventosTimelineDossie().map((evento): UniversalSearchResult => {
    const dossie = obterDossie(evento.dossieId);

    return {
      id: evento.id,
      type: "timeline",
      title: evento.titulo,
      description: evento.descricao,
      meta: dossie ? `${dossie.titulo} · ${evento.tipo}` : evento.tipo,
      href: `/assuntos/${evento.dossieId}`,
      terms: [
        evento.titulo,
        evento.descricao,
        evento.tipo,
        evento.data,
        dossie?.titulo ?? "",
        dossie?.resumo ?? "",
        dossie?.objetivoPolitico ?? "",
        ...(dossie?.tags ?? []),
      ],
    };
  });

  return [...assembleias, ...dossies, ...documentos, ...notas, ...timeline];
}

export function pesquisarUniversal(query: string): UniversalSearchGroup[] {
  const results = buildIndex().filter((result) => matches(result, query));

  return groupOrder
    .map((type) => ({
      type,
      label: groupLabels[type],
      results: results.filter((result) => result.type === type).slice(0, 6),
    }))
    .filter((group) => group.results.length > 0);
}
