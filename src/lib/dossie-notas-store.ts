import { useEffect, useState } from "react";
import { adicionarEventoAutomaticoTimelineDossie } from "./dossie-timeline-store";
import type { DossieNota } from "./types";
import { guardarJSONPorUtilizador, lerJSONPorUtilizador } from "./user-storage";

const STORAGE_KEY = "tribuno:notas";
const EVENT_NAME = "tribuno:dossie-notas";

function gerarId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function lerNotasLocais(): DossieNota[] {
  const parsed = lerJSONPorUtilizador<DossieNota[]>(STORAGE_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

function guardarNotasLocais(notas: DossieNota[]) {
  guardarJSONPorUtilizador(STORAGE_KEY, notas);
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function listarNotasDossie(dossieId: string): DossieNota[] {
  return lerNotasLocais()
    .filter((nota) => nota.dossieId === dossieId)
    .sort((a, b) => {
      const dataA = a.updatedAt ?? a.createdAt;
      const dataB = b.updatedAt ?? b.createdAt;
      return dataB.localeCompare(dataA);
    });
}

export function listarTodasNotasDossie(): DossieNota[] {
  return lerNotasLocais().sort((a, b) => {
    const dataA = a.updatedAt ?? a.createdAt;
    const dataB = b.updatedAt ?? b.createdAt;
    return dataB.localeCompare(dataA);
  });
}

export function adicionarNotaDossie(dossieId: string, conteudo: string): DossieNota {
  const agora = new Date().toISOString();
  const nota: DossieNota = {
    id: `nota-${gerarId()}`,
    dossieId,
    conteudo,
    createdAt: agora,
    updatedAt: agora,
  };

  guardarNotasLocais([...lerNotasLocais(), nota]);
  adicionarEventoAutomaticoTimelineDossie(dossieId, {
    titulo: "Nota criada",
    descricao: conteudo,
    tipo: "nota",
    origemTipo: "nota",
    origemId: nota.id,
    origemHref: `/dossies/${dossieId}`,
  });

  return nota;
}

export function editarNotaDossie(id: string, conteudo: string): DossieNota | undefined {
  const notas = lerNotasLocais();
  const atualizadas = notas.map((nota) =>
    nota.id === id
      ? {
          ...nota,
          conteudo,
          updatedAt: new Date().toISOString(),
        }
      : nota,
  );

  guardarNotasLocais(atualizadas);

  const notaAtualizada = atualizadas.find((nota) => nota.id === id);
  if (notaAtualizada) {
    adicionarEventoAutomaticoTimelineDossie(notaAtualizada.dossieId, {
      titulo: "Nota editada",
      descricao: conteudo,
      tipo: "nota",
      origemTipo: "nota",
      origemId: notaAtualizada.id,
      origemHref: `/dossies/${notaAtualizada.dossieId}`,
    });
  }

  return notaAtualizada;
}

export function apagarNotaDossie(id: string) {
  guardarNotasLocais(lerNotasLocais().filter((nota) => nota.id !== id));
}

export function useNotasDossie(dossieId: string): DossieNota[] {
  const [notas, setNotas] = useState<DossieNota[]>([]);

  useEffect(() => {
    const atualizar = () => {
      setNotas(listarNotasDossie(dossieId));
    };

    atualizar();

    window.addEventListener(EVENT_NAME, atualizar);
    window.addEventListener("storage", atualizar);

    return () => {
      window.removeEventListener(EVENT_NAME, atualizar);
      window.removeEventListener("storage", atualizar);
    };
  }, [dossieId]);

  return notas;
}
