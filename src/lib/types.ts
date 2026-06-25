export type EstadoAssembleia = "preparacao" | "analise" | "concluida";

export type TipoDocumento =
  | "Convocatória"
  | "Ata"
  | "PPI"
  | "Execução da Receita"
  | "Execução da Despesa"
  | "Relatório Trimestral";

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
  nome: string;
  tipo: TipoDocumento;
  data: string;
  paginas: number;
}
