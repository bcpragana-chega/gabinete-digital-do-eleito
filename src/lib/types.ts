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
