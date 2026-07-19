export type EstadoAssembleia = "preparacao" | "analise" | "concluida" | "arquivada";
export type EstadoPreparacaoSessao = "em_preparacao" | "pronta";

export type TipoDocumento =
  | "Convocatória"
  | "Ata"
  | "Orçamento"
  | "Execução da Receita"
  | "Execução da Despesa"
  | "PPI"
  | "Relatório"
  | "Regulamento"
  | "Contrato"
  | "Proposta"
  | "Declaração de voto"
  | "Outro";

export type EstadoDocumento = "Por rever" | "Revisto" | "Importante" | "Arquivado";
export type EstadoAnaliseDocumento =
  | "nao_analisado"
  | "a_analisar"
  | "analisado"
  | "necessita_confirmacao"
  | "confirmado"
  | "erro";

export type TipoDocumentoCriado =
  | "Moção"
  | "Recomendação"
  | "Requerimento"
  | "Declaração de voto"
  | "Intervenção"
  | "Outro documento";

export type EstadoDocumentoCriado =
  | "rascunho"
  | "em revisão"
  | "final"
  | "pronto"
  | "apresentado"
  | "arquivado";

export type EstadoDossie = "ativo" | "em acompanhamento" | "concluido";

export type PrioridadeDossie = "Baixa" | "Média" | "Alta" | "Crítica";

export interface Assembleia {
  id: string;
  nome: string;
  tipo?: string;
  orgao?: string;
  data: string;
  hora: string;
  local: string;
  estado: EstadoAssembleia;
  preparacaoEstado?: EstadoPreparacaoSessao;
  dadosConfirmadosEm?: string;
  revisaoFinalConfirmadaEm?: string;
  prontaEm?: string;
  notas?: string;
  createdAt?: string;
  updatedAt?: string;
  archivedAt?: string;
}

export interface Documento {
  id: string;
  assembleiaId: string;
  titulo: string;
  descricao?: string;
  tipo: TipoDocumento;
  data: string;
  estado: EstadoDocumento;
  origem?: string;
  origemTipo?: string;
  origemRef?: string;
  storageBucket?: string;
  storagePath?: string;
  ficheiroNome?: string;
  ficheiroTipo?: string;
  ficheiroTamanho?: number;
  paginas?: number;
  checksum?: string;
  textoExtraido?: string;
  resumo?: string;
  notas?: string;
  tags?: string[];
  assuntoOrigemId?: string;
  assembleiaOrigemId?: string;
  pontoOrigemId?: string;
  recebidoEm?: string;
  analisadoEm?: string;
  estadoAnalise?: EstadoAnaliseDocumento;
  analiseInstitucional?: AnaliseDocumentoInstitucional;
  analiseInstitucionalEm?: string;
  analiseInstitucionalVersao?: number;
  archivedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export type TipoDocumentoInstitucional =
  | "convocatoria"
  | "ordem_trabalhos"
  | "ata"
  | "documento_financeiro"
  | "proposta"
  | "regulamento"
  | "outro"
  | "desconhecido";

export interface ConclusaoImpactoMandato {
  descricao: string;
  referenciaDocumento?: string;
  confianca: number;
}

export interface AcaoImpactoMandato extends ConclusaoImpactoMandato {
  tipo: "exigida" | "recomendada" | "informativa";
  prazo?: string;
}

export interface ImpactoMandatoDocumento {
  relevancia: "alta" | "media" | "baixa" | "indeterminada";
  justificacaoRelevancia: string;
  referenciaDocumento?: string;
  confianca: number;
  alteracoesDecisoes: ConclusaoImpactoMandato[];
  acoes: AcaoImpactoMandato[];
  proximaAcao?: ConclusaoImpactoMandato;
}

export interface AnaliseDocumentoInstitucional {
  tipoDocumento: TipoDocumentoInstitucional;
  confiancaGlobal: number;
  sessao?: {
    orgao?: string;
    entidade?: string;
    tipo?: "ordinaria" | "extraordinaria" | "desconhecida";
    data?: string;
    hora?: string;
    local?: string;
  };
  pontosOrdemTrabalhos: Array<{
    numero?: number;
    titulo: string;
    descricao?: string;
    confianca: number;
  }>;
  informacaoRelevante: Array<{
    titulo: string;
    descricao: string;
    referenciaDocumento?: string;
  }>;
  camposIncertos: Array<{ campo: string; motivo: string }>;
  resumoCompreensao: string;
  impactoMandato?: ImpactoMandatoDocumento;
}

export interface DocumentoCriado {
  id: string;
  tipo: TipoDocumentoCriado;
  titulo: string;
  conteudo: string;
  conteudoJson?: unknown;
  formatoConteudo?: string;
  resumo?: string;
  notas?: string;
  tags?: string[];
  origem?: string;
  origemPrompt?: string;
  iaModelo?: string;
  iaMetadata?: unknown;
  assuntoId?: string;
  pontoId?: string;
  assembleiaId?: string;
  documentoFinalId?: string;
  estado: EstadoDocumentoCriado;
  createdAt: string;
  updatedAt?: string;
  archivedAt?: string;
  finalizadoEm?: string;
  apresentadoEm?: string;
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

export interface AssuntoPontoRelacionado {
  id: string;
  assuntoId: string;
  pontoId: string;
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

export type TipoHistoricoEvento =
  | "documento"
  | "nota"
  | "estrategia"
  | "posicao"
  | "pergunta"
  | "documento-criado"
  | "ia";

export interface HistoricoEvento {
  id: string;
  pontoId: string;
  data: string;
  tipo: TipoHistoricoEvento;
  acao: string;
  descricao: string;
  autor: string;
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
