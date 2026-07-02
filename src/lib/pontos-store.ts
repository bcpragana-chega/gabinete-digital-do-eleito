export type NivelPrioridade = "Alta" | "Média" | "Baixa";

export type EstadoPonto = "Por preparar" | "Em preparação" | "Preparado" | "Concluído";

export type SentidoVoto = "A favor" | "Contra" | "Abstenção" | "Livre" | "Por decidir";

export type PontoOrdemTrabalhos = {
  id: string;
  assembleiaId: string;
  numero: number;
  titulo: string;
  descricao: string;
  estado: EstadoPonto;
  prioridade: NivelPrioridade;
  objetivoPolitico: string;
  mensagemPrincipal: string;
  notas: string;
  riscos: string;
  linhaIntervencao: string;
  notasInternas: string;
  sentidoVoto: SentidoVoto;
  documentos: string[];
  perguntas: string[];
  acoes: string[];
  documentosACriar: string[];
  tempoEstimado?: number;
};

const STORAGE_KEY = "tribuno-pontos-ordem-trabalhos";

function gerarId() {
  return `ponto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function lerPontos(): PontoOrdemTrabalhos[] {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) return [];

  try {
    return JSON.parse(raw) as PontoOrdemTrabalhos[];
  } catch {
    return [];
  }
}

function guardarPontos(pontos: PontoOrdemTrabalhos[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pontos));
}

export function obterPontosDaAssembleia(assembleiaId: string): PontoOrdemTrabalhos[] {
  return lerPontos()
    .filter((ponto) => ponto.assembleiaId === assembleiaId)
    .sort((a, b) => a.numero - b.numero);
}

export function obterPontoPorId(
  assembleiaId: string,
  pontoId: string,
): PontoOrdemTrabalhos | undefined {
  return obterPontosDaAssembleia(assembleiaId).find((ponto) => ponto.id === pontoId);
}

export function adicionarPonto(
  assembleiaId: string,
  data: Pick<PontoOrdemTrabalhos, "titulo" | "descricao" | "prioridade"> & {
    tempoEstimado?: number;
  },
) {
  const pontos = lerPontos();
  const pontosDaAssembleia = pontos.filter((ponto) => ponto.assembleiaId === assembleiaId);

  const proximoNumero =
    pontosDaAssembleia.length > 0
      ? Math.max(...pontosDaAssembleia.map((ponto) => ponto.numero)) + 1
      : 1;

  const novoPonto: PontoOrdemTrabalhos = {
    id: gerarId(),
    assembleiaId,
    numero: proximoNumero,
    titulo: data.titulo,
    descricao: data.descricao,
    estado: "Por preparar",
    prioridade: data.prioridade,
    objetivoPolitico: "",
    mensagemPrincipal: "",
    notas: "",
    riscos: "",
    linhaIntervencao: "",
    notasInternas: "",
    sentidoVoto: "Por decidir",
    documentos: [],
    perguntas: [],
    acoes: [],
    documentosACriar: [],
    tempoEstimado: data.tempoEstimado,
  };

  guardarPontos([novoPonto, ...pontos]);

  return novoPonto;
}

export function atualizarPonto(
  pontoId: string,
  data: Partial<Omit<PontoOrdemTrabalhos, "id" | "assembleiaId" | "numero">>,
) {
  const pontos = lerPontos();

  const pontosAtualizados = pontos.map((ponto) =>
    ponto.id === pontoId
      ? {
          ...ponto,
          ...data,
        }
      : ponto,
  );

  guardarPontos(pontosAtualizados);

  return pontosAtualizados.find((ponto) => ponto.id === pontoId);
}

export function removerPonto(id: string) {
  const pontos = lerPontos();

  guardarPontos(pontos.filter((ponto) => ponto.id !== id));
}
