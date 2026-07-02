import { useEffect, useState } from "react";
import type { Dossie, EstadoDossie, PrioridadeDossie } from "./types";

const STORAGE_KEY = "tribuno.dossies.v1";
const EVENT_NAME = "tribuno:dossies";

export type DossieInput = {
  titulo: string;
  estado: EstadoDossie;
  prioridade: PrioridadeDossie;
  objetivoPolitico: string;
  resumo: string;
  tags: string[];
};

const dossiesIniciais: Dossie[] = [
  {
    id: "dossie-habitacao",
    titulo: "Habitação",
    estado: "ativo",
    prioridade: "Alta",
    objetivoPolitico: "Acompanhar respostas municipais e necessidades habitacionais do território.",
    resumo: "Dossiê para reunir problemas, documentos e compromissos relacionados com habitação.",
    tags: ["habitação", "território", "apoio social"],
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "dossie-centro-saude",
    titulo: "Centro de Saúde",
    estado: "em acompanhamento",
    prioridade: "Crítica",
    objetivoPolitico: "Garantir acompanhamento político e institucional das respostas de saúde local.",
    resumo: "Acompanhamento da evolução, respostas e entidades envolvidas no Centro de Saúde.",
    tags: ["saúde", "equipamento", "serviços públicos"],
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "dossie-iluminacao-publica",
    titulo: "Iluminação Pública",
    estado: "ativo",
    prioridade: "Média",
    objetivoPolitico: "Mapear pedidos, falhas e respostas sobre iluminação pública.",
    resumo: "Dossiê para organizar ocorrências, pedidos e seguimento sobre iluminação pública.",
    tags: ["iluminação", "segurança", "freguesias"],
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "dossie-orcamento-2027",
    titulo: "Orçamento 2027",
    estado: "ativo",
    prioridade: "Alta",
    objetivoPolitico: "Preparar análise política, técnica e documental do orçamento municipal.",
    resumo: "Dossiê de preparação e acompanhamento do ciclo orçamental de 2027.",
    tags: ["orçamento", "finanças", "2027"],
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

function isBrowser() {
  return typeof window !== "undefined";
}

function lerDossiesLocais(): Dossie[] {
  if (!isBrowser()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed;
  } catch {
    return [];
  }
}

function guardarDossiesLocais(dossies: Dossie[]) {
  if (!isBrowser()) return;

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dossies));
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function listarDossies(): Dossie[] {
  const locais = lerDossiesLocais();
  const idsLocais = new Set(locais.map((dossie) => dossie.id));
  const iniciaisVisiveis = dossiesIniciais.filter((dossie) => !idsLocais.has(dossie.id));

  return [...iniciaisVisiveis, ...locais].sort((a, b) => {
    const dataA = a.updatedAt ?? a.createdAt;
    const dataB = b.updatedAt ?? b.createdAt;
    return dataB.localeCompare(dataA);
  });
}

export function obterDossie(id: string): Dossie | undefined {
  return listarDossies().find((dossie) => dossie.id === id);
}

export function adicionarDossie(input: DossieInput): Dossie {
  const agora = new Date().toISOString();
  const novo: Dossie = {
    id: `dossie-${crypto.randomUUID()}`,
    ...input,
    createdAt: agora,
    updatedAt: agora,
  };

  const atuais = lerDossiesLocais();
  guardarDossiesLocais([...atuais, novo]);

  return novo;
}

export function editarDossie(id: string, input: DossieInput): Dossie | undefined {
  const todos = listarDossies();
  const atualizados = todos.map((dossie) =>
    dossie.id === id
      ? {
          ...dossie,
          ...input,
          updatedAt: new Date().toISOString(),
        }
      : dossie,
  );

  guardarDossiesLocais(atualizados);

  return atualizados.find((dossie) => dossie.id === id);
}

export function arquivarDossie(id: string): Dossie | undefined {
  const todos = listarDossies();
  const agora = new Date().toISOString();

  const atualizados = todos.map((dossie) =>
    dossie.id === id
      ? {
          ...dossie,
          archivedAt: agora,
          updatedAt: agora,
        }
      : dossie,
  );

  guardarDossiesLocais(atualizados);

  return atualizados.find((dossie) => dossie.id === id);
}

export function useDossies(): Dossie[] {
  const [dossies, setDossies] = useState<Dossie[]>([]);

  useEffect(() => {
    const atualizar = () => {
      setDossies(listarDossies());
    };

    atualizar();

    window.addEventListener(EVENT_NAME, atualizar);
    window.addEventListener("storage", atualizar);

    return () => {
      window.removeEventListener(EVENT_NAME, atualizar);
      window.removeEventListener("storage", atualizar);
    };
  }, []);

  return dossies;
}

export function useDossie(id: string): Dossie | undefined {
  const dossies = useDossies();

  return dossies.find((dossie) => dossie.id === id);
}
