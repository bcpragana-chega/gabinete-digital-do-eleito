import type { EstrategiaSessao } from "@/lib/estrategia-store";
import type { PontoOrdemTrabalhos } from "@/lib/pontos-store";
import type { Assembleia, Documento, DocumentoCriado, Dossie } from "@/lib/types";

type MaterialPreparationInput = {
  sessao: Assembleia;
  documentos: Documento[];
  pontos: PontoOrdemTrabalhos[];
  estrategia: EstrategiaSessao;
  assuntos: Dossie[];
  documentosPoliticos: DocumentoCriado[];
};

function ordenarPorId<T extends { id: string }>(items: T[]) {
  return [...items].sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Representa apenas conteúdo com impacto na preparação. Timestamps técnicos,
 * campos de UI e metadados de sincronização ficam deliberadamente de fora.
 */
export function criarAssinaturaMaterialPreparacao(input: MaterialPreparationInput) {
  const { sessao, estrategia } = input;

  return JSON.stringify({
    sessao: {
      nome: sessao.nome,
      tipo: sessao.tipo ?? "",
      orgao: sessao.orgao ?? "",
      data: sessao.data,
      hora: sessao.hora,
      local: sessao.local,
      notas: sessao.notas ?? "",
    },
    documentos: ordenarPorId(input.documentos).map((documento) => ({
      id: documento.id,
      titulo: documento.titulo,
      descricao: documento.descricao ?? "",
      tipo: documento.tipo,
      data: documento.data,
      estado: documento.estado,
      importante: documento.importante ?? false,
      ficheiro: [
        documento.storagePath ?? "",
        documento.ficheiroNome ?? "",
        documento.ficheiroTamanho ?? 0,
        documento.checksum ?? "",
      ],
      textoExtraido: documento.textoExtraido ?? "",
      resumo: documento.resumo ?? "",
      notas: documento.notas ?? "",
      tags: [...(documento.tags ?? [])].sort(),
      estadoAnalise: documento.estadoAnalise ?? "",
      analiseInstitucional: documento.analiseInstitucional ?? null,
      archivedAt: documento.archivedAt ?? "",
    })),
    pontos: ordenarPorId(input.pontos).map((ponto) => ({
      id: ponto.id,
      numero: ponto.numero,
      titulo: ponto.titulo,
      descricao: ponto.descricao,
      estado: ponto.estado,
      prioridade: ponto.prioridade,
      objetivoPolitico: ponto.objetivoPolitico,
      posicaoPolitica: ponto.posicaoPolitica ?? "",
      mensagemPrincipal: ponto.mensagemPrincipal,
      notas: ponto.notas,
      riscos: ponto.riscos,
      linhaIntervencao: ponto.linhaIntervencao,
      notasInternas: ponto.notasInternas,
      sentidoVoto: ponto.sentidoVoto,
      documentos: [...ponto.documentos].sort(),
      perguntas: ponto.perguntas,
      acoes: ponto.acoes,
      documentosACriar: [...ponto.documentosACriar].sort(),
      tempoEstimado: ponto.tempoEstimado ?? null,
      archivedAt: ponto.archivedAt ?? "",
    })),
    estrategia: {
      objetivoPolitico: estrategia.objetivoPolitico,
      mensagemPrincipal: estrategia.mensagemPrincipal,
      naoFazer: estrategia.naoFazer,
      adversariosPrevisiveis: estrategia.adversariosPrevisiveis,
      notasLivres: estrategia.notasLivres,
    },
    assuntos: ordenarPorId(input.assuntos).map((assunto) => ({
      id: assunto.id,
      titulo: assunto.titulo,
      estado: assunto.estado,
      prioridade: assunto.prioridade,
      objetivoPolitico: assunto.objetivoPolitico,
      resumo: assunto.resumo,
      tags: [...assunto.tags].sort(),
      archivedAt: assunto.archivedAt ?? "",
    })),
    documentosPoliticos: ordenarPorId(input.documentosPoliticos).map((documento) => ({
      id: documento.id,
      tipo: documento.tipo,
      titulo: documento.titulo,
      conteudo: documento.conteudo,
      conteudoJson: documento.conteudoJson ?? null,
      resumo: documento.resumo ?? "",
      notas: documento.notas ?? "",
      tags: [...(documento.tags ?? [])].sort(),
      assuntoId: documento.assuntoId ?? "",
      pontoId: documento.pontoId ?? "",
      assembleiaId: documento.assembleiaId ?? "",
      estado: documento.estado,
      archivedAt: documento.archivedAt ?? "",
    })),
  });
}
