export type NivelPrioridade = "Alta" | "Média" | "Baixa";

export type EstadoPrioridade = "Por preparar" | "Preparado" | "Acompanhar";
export type EstadoAcao = "Pendente" | "Em curso" | "Concluída";
export type TipoDocumento =
  | "Moção"
  | "Recomendação"
  | "Requerimento"
  | "Declaração de voto"
  | "Intervenção";

export type PrioridadeAssembleia = {
  id: string;
  assembleiaId: string;
  titulo: string;
  prioridade: NivelPrioridade;
  descricao: string;
  documentos: string[];
  estado: EstadoPrioridade;
};

export type PerguntaSugerida = {
  id: string;
  assembleiaId: string;
  tema: string;
  pergunta: string;
  prioridade: NivelPrioridade;
  documentos: string[];
};

export type AcaoPendente = {
  id: string;
  assembleiaId: string;
  tarefa: string;
  estado: EstadoAcao;
  prazo?: string;
};

export type DocumentoACriar = {
  id: string;
  assembleiaId: string;
  tipo: TipoDocumento;
  motivo: string;
  prioridade: NivelPrioridade;
};

const STORAGE_KEY = "tribuno-preparacao";

type PreparacaoStore = {
  prioridades: PrioridadeAssembleia[];
  perguntas: PerguntaSugerida[];
  acoes: AcaoPendente[];
  documentosACriar: DocumentoACriar[];
};

const storeVazio: PreparacaoStore = {
  prioridades: [],
  perguntas: [],
  acoes: [],
  documentosACriar: [],
};

function gerarId(prefixo: string) {
  return `${prefixo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function lerStore(): PreparacaoStore {
  if (typeof window === "undefined") return storeVazio;

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) return storeVazio;

  try {
    return JSON.parse(raw) as PreparacaoStore;
  } catch {
    return storeVazio;
  }
}

function guardarStore(store: PreparacaoStore) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function obterPreparacaoDaAssembleia(assembleiaId: string) {
  const store = lerStore();

  return {
    prioridades: store.prioridades.filter((item) => item.assembleiaId === assembleiaId),
    perguntas: store.perguntas.filter((item) => item.assembleiaId === assembleiaId),
    acoes: store.acoes.filter((item) => item.assembleiaId === assembleiaId),
    documentosACriar: store.documentosACriar.filter(
      (item) => item.assembleiaId === assembleiaId,
    ),
  };
}

export function adicionarPrioridade(
  assembleiaId: string,
  data: Omit<PrioridadeAssembleia, "id" | "assembleiaId">,
) {
  const store = lerStore();

  const novaPrioridade: PrioridadeAssembleia = {
    id: gerarId("prioridade"),
    assembleiaId,
    ...data,
  };

  guardarStore({
    ...store,
    prioridades: [novaPrioridade, ...store.prioridades],
  });

  return novaPrioridade;
}

export function adicionarPergunta(
  assembleiaId: string,
  data: Omit<PerguntaSugerida, "id" | "assembleiaId">,
) {
  const store = lerStore();

  const novaPergunta: PerguntaSugerida = {
    id: gerarId("pergunta"),
    assembleiaId,
    ...data,
  };

  guardarStore({
    ...store,
    perguntas: [novaPergunta, ...store.perguntas],
  });

  return novaPergunta;
}

export function adicionarAcao(
  assembleiaId: string,
  data: Omit<AcaoPendente, "id" | "assembleiaId">,
) {
  const store = lerStore();

  const novaAcao: AcaoPendente = {
    id: gerarId("acao"),
    assembleiaId,
    ...data,
  };

  guardarStore({
    ...store,
    acoes: [novaAcao, ...store.acoes],
  });

  return novaAcao;
}

export function adicionarDocumentoACriar(
  assembleiaId: string,
  data: Omit<DocumentoACriar, "id" | "assembleiaId">,
) {
  const store = lerStore();

  const novoDocumento: DocumentoACriar = {
    id: gerarId("documento"),
    assembleiaId,
    ...data,
  };

  guardarStore({
    ...store,
    documentosACriar: [novoDocumento, ...store.documentosACriar],
  });

  return novoDocumento;
}

export function removerPrioridade(id: string) {
  const store = lerStore();

  guardarStore({
    ...store,
    prioridades: store.prioridades.filter((item) => item.id !== id),
  });
}

export function removerPergunta(id: string) {
  const store = lerStore();

  guardarStore({
    ...store,
    perguntas: store.perguntas.filter((item) => item.id !== id),
  });
}

export function removerAcao(id: string) {
  const store = lerStore();

  guardarStore({
    ...store,
    acoes: store.acoes.filter((item) => item.id !== id),
  });
}

export function removerDocumentoACriar(id: string) {
  const store = lerStore();

  guardarStore({
    ...store,
    documentosACriar: store.documentosACriar.filter((item) => item.id !== id),
  });
}