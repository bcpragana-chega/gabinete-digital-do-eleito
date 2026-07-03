export type EstadoAssembleia = "preparacao" | "analise" | "concluida" | "arquivada";

export type TipoDocumento =
  | "Convocatória"
  | "Ata"
  | "Orçamento"
  | "Execução da Receita"
  | "Execução da Despesa"
  | "PPI"
  | "Relatório"
  | "Regulamento"
  | "Proposta"
  | "Declaração de voto"
  | "Outro";

export type EstadoDocumento = "Por rever" | "Revisto" | "Importante" | "Arquivado";

export type TipoDocumentoCriado = "Moção" | "Recomendação" | "Requerimento" | "Declaração de voto";

export type EstadoDocumentoCriado = "rascunho" | "em revisão" | "final";

export type EstadoDossie = "ativo" | "em acompanhamento" | "concluido";

export type PrioridadeDossie = "Baixa" | "Média" | "Alta" | "Crítica";

export interface Assembleia {
  id: string;
  nome: string;
  data: string;
  hora: string;
  local: string;
  estado: EstadoAssembleia;
}

export interface Documento {
  id: string;
  assembleiaId: string;
  titulo: string;
  tipo: TipoDocumento;
  data: string;
  estado: EstadoDocumento;
  ficheiroNome?: string;
  ficheiroTipo?: string;
  paginas?: number;
  notas?: string;
  createdAt: string;
}

export interface DocumentoCriado {
  id: string;
  tipo: TipoDocumentoCriado;
  titulo: string;
  conteudo: string;
  pontoId: string;
  assembleiaId: string;
  estado: EstadoDocumentoCriado;
  createdAt: string;
  updatedAt?: string;
}

export interface Dossie {
  id: string;
  titulo: string;
  estado: EstadoDossie;
  prioridade: PrioridadeDossie;
  objetivoPolitico: string;
  resumo: string;
  tags: string[];
  createdAt: string;
  updatedAt?: string;
  archivedAt?: string;
}

export interface DossieNota {
  id: string;
  dossieId: string;
  conteudo: string;
  createdAt: string;
  updatedAt?: string;
}

export type TipoEventoTimelineDossie =
  | "nota"
  | "documento"
  | "assembleia"
  | "compromisso"
  | "reunião"
  | "outro";

export interface DossieTimelineEvento {
  id: string;
  dossieId: string;
  titulo: string;
  descricao: string;
  data: string;
  tipo: TipoEventoTimelineDossie;
  automatico?: boolean;
  origemTipo?: string;
  origemId?: string;
  origemHref?: string;
  createdAt: string;
  updatedAt?: string;
}

export type CategoriaRelacionadoDossie =
  | "documentos"
  | "assembleias"
  | "pessoas"
  | "entidades"
  | "compromissos";

export interface DossieRelacionado {
  id: string;
  dossieId: string;
  categoria: CategoriaRelacionadoDossie;
  nome: string;
  descricao: string;
  tipo: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DossieDocumentoRelacionado {
  id: string;
  dossieId: string;
  documentoId: string;
  createdAt: string;
}

export interface DossieAssembleiaRelacionada {
  id: string;
  dossieId: string;
  assembleiaId: string;
  createdAt: string;
}

export type TipoObjetoTribuno =
  | "assunto"
  | "sessao"
  | "documento"
  | "ponto"
  | "documento_criado"
  | "evento";

export type TipoRelacaoTribuno =
  | "associado_a"
  | "discutido_em"
  | "usado_em"
  | "produzido_em"
  | "relacionado_com"
  | "gerou"
  | "citado_em";

export interface ReferenciaObjetoTribuno {
  tipo: TipoObjetoTribuno;
  id: string;
}

export interface RelacaoTribuno {
  id: string;
  origemTipo: TipoObjetoTribuno;
  origemId: string;
  destinoTipo: TipoObjetoTribuno;
  destinoId: string;
  tipoRelacao: TipoRelacaoTribuno;
  createdAt: string;
  updatedAt: string;
}

export type EstadoInboxDocumento = "Novo" | "Em análise" | "Tratado";

export interface DocumentoInboxItem {
  documentoId: string;
  estado: EstadoInboxDocumento;
  dossieId?: string;
  assembleiaId?: string;
  archivedAt?: string;
  updatedAt?: string;
}
