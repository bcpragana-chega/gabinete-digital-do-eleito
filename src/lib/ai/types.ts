import type { DocumentoCriado, TipoDocumentoCriado } from "@/lib/types";
import type { BaseJuridicaInstitucional } from "@/lib/ai/legal-basis";
import type { ResolvedInstitutionalContext } from "@/lib/ai/institutional-context";

export type JsonSerializable =
  | string
  | number
  | boolean
  | null
  | JsonSerializable[]
  | { [key: string]: JsonSerializable };

export type DocumentoCriadoSerializavel = Omit<DocumentoCriado, "conteudoJson" | "iaMetadata"> & {
  conteudoJson?: JsonSerializable;
  iaMetadata?: JsonSerializable;
};

export type DadosEntradaGeracaoDocumento = {
  userId: string;
  assuntoId: string;
  sessaoId?: string;
  tipo: TipoDocumentoCriado;
  titulo: string;
  conteudoInicial: string;
  documentosRelacionadosIds?: string[];
  assuntoNotas?: string[];
  assuntoTimeline?: string[];
};

export type PerfilInstitucionalContexto = {
  nome: string;
  cargo: string;
  orgao: string;
  organizacao: string;
  territorio?: string;
  municipio?: string;
  freguesia?: string;
  partido?: string;
  assinatura?: string;
};

export type AssuntoContexto = {
  id: string;
  titulo: string;
  descricao?: string;
  objetivo?: string;
  prioridade?: string;
  estado?: string;
  tags: string[];
  notas: string[];
  timeline: string[];
  createdAt?: string;
  updatedAt?: string;
  historico: string[];
};

export type SessaoContexto = {
  id: string;
  data?: string;
  hora?: string;
  tipo?: string;
  orgao?: string;
  ordemTrabalhos?: string;
  observacoes?: string;
};

export type DocumentoRelacionadoContexto = {
  id: string;
  tipo: string;
  titulo: string;
  conteudo?: string;
  resumo?: string;
  notas?: string;
  criadoEm?: string;
  atualizadoEm?: string;
};

export type AnexoTextualContexto = {
  id: string;
  titulo: string;
  tipo?: string;
  textoExtraido: string;
  resumo?: string;
  notas?: string;
};

export type ContextoGeracaoDocumento = {
  entrada: Omit<DadosEntradaGeracaoDocumento, "userId">;
  perfil: PerfilInstitucionalContexto;
  assunto: AssuntoContexto;
  sessao?: SessaoContexto;
  baseJuridica: BaseJuridicaInstitucional;
  institutionalContext: ResolvedInstitutionalContext;
  documentosRelacionados: DocumentoRelacionadoContexto[];
  anexosTextuais: AnexoTextualContexto[];
};

export type PedidoGeracaoAi = {
  systemPrompt: string;
  userPrompt: string;
  timeoutMs?: number;
  maxOutputTokens?: number;
};

export type UsoTokensAi = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

export type RespostaGeracaoAi = {
  texto: string;
  modelo: string;
  provider: string;
  usage?: UsoTokensAi;
  metadata?: Record<string, unknown>;
};

export interface AiProvider {
  readonly name: string;
  gerarDocumento(input: PedidoGeracaoAi): Promise<RespostaGeracaoAi>;
}

export type ResultadoGeracaoDocumento =
  | {
      ok: true;
      documento: DocumentoCriadoSerializavel;
    }
  | {
      ok: false;
      code: string;
      message: string;
    };
