import {
  guardarJSONParaUtilizador,
  lerJSONParaUtilizador,
  removerJSONParaUtilizador,
} from "@/lib/user-storage";

const STORAGE_KEY = "tribuno:tentativa-criacao-sessao";

export type TentativaCriacaoSessao = {
  tentativaId: string;
  sessaoId: string;
  sessaoConfirmada: boolean;
  pontosConfirmados: Set<string>;
  documentosConfirmados: Set<string>;
};

type TentativaCriacaoSessaoPersistida<Draft> = {
  tentativaId: string;
  sessaoId: string;
  sessaoConfirmada: boolean;
  pontosConfirmados: string[];
  documentosConfirmados: string[];
  draft: Draft;
  updatedAt: string;
};

export function guardarTentativaCriacaoSessao<Draft>(
  userId: string,
  tentativa: TentativaCriacaoSessao,
  draft: Draft,
) {
  guardarJSONParaUtilizador<TentativaCriacaoSessaoPersistida<Draft>>(STORAGE_KEY, userId, {
    tentativaId: tentativa.tentativaId,
    sessaoId: tentativa.sessaoId,
    sessaoConfirmada: tentativa.sessaoConfirmada,
    pontosConfirmados: [...tentativa.pontosConfirmados],
    documentosConfirmados: [...tentativa.documentosConfirmados],
    draft,
    updatedAt: new Date().toISOString(),
  });
}

export function carregarTentativaCriacaoSessao<Draft>(userId: string) {
  const persistida = lerJSONParaUtilizador<TentativaCriacaoSessaoPersistida<Draft> | undefined>(
    STORAGE_KEY,
    userId,
    undefined,
  );
  if (!persistida?.tentativaId || !persistida.sessaoId || !persistida.draft) return undefined;
  return {
    tentativa: {
      tentativaId: persistida.tentativaId,
      sessaoId: persistida.sessaoId,
      sessaoConfirmada: Boolean(persistida.sessaoConfirmada),
      pontosConfirmados: new Set(persistida.pontosConfirmados ?? []),
      documentosConfirmados: new Set(persistida.documentosConfirmados ?? []),
    } satisfies TentativaCriacaoSessao,
    draft: persistida.draft,
  };
}

export function removerTentativaCriacaoSessao(userId: string) {
  removerJSONParaUtilizador(STORAGE_KEY, userId);
}

export async function executarTentativaCriacaoSessao<P, D>(input: {
  tentativa: TentativaCriacaoSessao;
  pontos: Array<{ id: string; value: P }>;
  documentos: Array<{ id: string; value: D }>;
  criarSessao: (id: string) => Promise<unknown>;
  criarPonto: (sessaoId: string, ponto: P, id: string) => Promise<unknown>;
  criarDocumento: (sessaoId: string, documento: D, id: string) => Promise<unknown>;
  onProgress?: (tentativa: TentativaCriacaoSessao) => void;
}) {
  const tentativa = input.tentativa;
  try {
    if (!tentativa.sessaoConfirmada) {
      await input.criarSessao(tentativa.sessaoId);
      tentativa.sessaoConfirmada = true;
      input.onProgress?.(tentativa);
    }
    for (const ponto of input.pontos) {
      if (tentativa.pontosConfirmados.has(ponto.id)) continue;
      await input.criarPonto(tentativa.sessaoId, ponto.value, ponto.id);
      tentativa.pontosConfirmados.add(ponto.id);
      input.onProgress?.(tentativa);
    }
    for (const documento of input.documentos) {
      if (tentativa.documentosConfirmados.has(documento.id)) continue;
      await input.criarDocumento(tentativa.sessaoId, documento.value, documento.id);
      tentativa.documentosConfirmados.add(documento.id);
      input.onProgress?.(tentativa);
    }
    return { concluida: true as const, tentativa };
  } catch (error) {
    return { concluida: false as const, tentativa, error };
  }
}
