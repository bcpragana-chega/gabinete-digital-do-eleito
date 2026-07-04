import { useEffect, useState } from "react";
import { adicionarEventoAutomaticoTimelineDossie } from "./dossie-timeline-store";
import type { CategoriaRelacionadoDossie, DossieRelacionado } from "./types";
import { guardarJSONPorUtilizador, lerJSONPorUtilizador } from "./user-storage";

const STORAGE_KEY = "tribuno:relacionados";
const EVENT_NAME = "tribuno:dossie-relacionados";

export type DossieRelacionadoInput = {
  categoria: CategoriaRelacionadoDossie;
  nome: string;
  descricao: string;
  tipo: string;
};

function gerarId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function lerRelacionadosLocais(): DossieRelacionado[] {
  const parsed = lerJSONPorUtilizador<DossieRelacionado[]>(STORAGE_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

function guardarRelacionadosLocais(relacionados: DossieRelacionado[]) {
  guardarJSONPorUtilizador(STORAGE_KEY, relacionados);
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function listarRelacionadosDossie(dossieId: string): DossieRelacionado[] {
  return lerRelacionadosLocais()
    .filter((item) => item.dossieId === dossieId)
    .sort((a, b) => {
      const dataA = a.updatedAt ?? a.createdAt;
      const dataB = b.updatedAt ?? b.createdAt;
      return dataB.localeCompare(dataA);
    });
}

export function adicionarRelacionadoDossie(
  dossieId: string,
  input: DossieRelacionadoInput,
): DossieRelacionado {
  const agora = new Date().toISOString();
  const relacionado: DossieRelacionado = {
    id: `relacionado-${gerarId()}`,
    dossieId,
    ...input,
    createdAt: agora,
    updatedAt: agora,
  };

  guardarRelacionadosLocais([...lerRelacionadosLocais(), relacionado]);

  if (input.categoria === "compromissos") {
    adicionarEventoAutomaticoTimelineDossie(dossieId, {
      titulo: "Compromisso criado",
      descricao: `${input.nome}: ${input.descricao}`,
      tipo: "compromisso",
      origemTipo: "compromisso",
      origemId: relacionado.id,
      origemHref: `/dossies/${dossieId}`,
    });
  }

  return relacionado;
}

export function editarRelacionadoDossie(
  id: string,
  input: DossieRelacionadoInput,
): DossieRelacionado | undefined {
  const relacionados = lerRelacionadosLocais();
  const atualizados = relacionados.map((item) =>
    item.id === id
      ? {
          ...item,
          ...input,
          updatedAt: new Date().toISOString(),
        }
      : item,
  );

  guardarRelacionadosLocais(atualizados);

  return atualizados.find((item) => item.id === id);
}

export function apagarRelacionadoDossie(id: string) {
  guardarRelacionadosLocais(lerRelacionadosLocais().filter((item) => item.id !== id));
}

export function useRelacionadosDossie(dossieId: string): DossieRelacionado[] {
  const [relacionados, setRelacionados] = useState<DossieRelacionado[]>([]);

  useEffect(() => {
    const atualizar = () => {
      setRelacionados(listarRelacionadosDossie(dossieId));
    };

    atualizar();

    window.addEventListener(EVENT_NAME, atualizar);
    window.addEventListener("storage", atualizar);

    return () => {
      window.removeEventListener(EVENT_NAME, atualizar);
      window.removeEventListener("storage", atualizar);
    };
  }, [dossieId]);

  return relacionados;
}
