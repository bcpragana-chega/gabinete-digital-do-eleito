import {
  apagarPontoRemoto,
  carregarPontosLocais,
  carregarPontosRemotos,
  guardarPontoRemoto,
  reordenarPontosRemotos,
  guardarPontosLocais as persistirPontosLocais,
} from "@/lib/pontos-repository";
import { executarHidratacaoIsolada, executarMutacaoIsolada } from "@/lib/confirmed-mutation";
import { obterUtilizadorSupabaseValidado } from "@/lib/supabase";

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
  posicaoPolitica?: string;
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
  archivedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

const EVENT_NAME = "tribuno:pontos";
let hidratacaoAtual = 0;

function gerarId() {
  return `ponto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function lerPontos(userId?: string): PontoOrdemTrabalhos[] {
  return carregarPontosLocais(userId);
}

function guardarPontos(pontos: PontoOrdemTrabalhos[], userId?: string) {
  persistirPontosLocais(pontos, userId);
  window.dispatchEvent(new Event(EVENT_NAME));
}

async function obterUserIdValidado() {
  const user = await obterUtilizadorSupabaseValidado();
  if (!user?.id) throw new Error("AUTH_REQUIRED");
  return user.id;
}

async function guardarPontoRemotamente(userId: string, ponto: PontoOrdemTrabalhos) {
  await guardarPontoRemoto(userId, ponto);
}

export async function carregarPontosRemotosSeDisponivel() {
  try {
    const hidratacaoId = ++hidratacaoAtual;
    const userId = await obterUserIdValidado();
    await executarHidratacaoIsolada({
      userId,
      carregarRemoto: carregarPontosRemotos,
      obterUserIdAtivo: async () => (await obterUtilizadorSupabaseValidado())?.id,
      isAtual: () => hidratacaoId === hidratacaoAtual,
      confirmarLocal: (ownerId, resposta) => {
        const remotos = resposta ?? [];
        const locaisPorId = new Map(lerPontos(ownerId).map((ponto) => [ponto.id, ponto]));
        const hidratados = remotos.map((remoto) => ({
          ...remoto,
          documentos: locaisPorId.get(remoto.id)?.documentos ?? remoto.documentos,
          perguntas: locaisPorId.get(remoto.id)?.perguntas ?? remoto.perguntas,
          acoes: locaisPorId.get(remoto.id)?.acoes ?? remoto.acoes,
          documentosACriar: locaisPorId.get(remoto.id)?.documentosACriar ?? remoto.documentosACriar,
          notas: locaisPorId.get(remoto.id)?.notas ?? remoto.notas,
        }));
        guardarPontos(hidratados, ownerId);
      },
    });
  } catch {
    console.warn("[Tribuno] Carregamento remoto de pontos falhou.", {
      operacao: "PONTOS_LOAD_FALHOU",
    });
  }
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

export async function adicionarPonto(
  assembleiaId: string,
  data: Pick<PontoOrdemTrabalhos, "titulo" | "descricao" | "prioridade"> & {
    tempoEstimado?: number;
  },
  options?: { id?: string },
) {
  const userId = await obterUserIdValidado();
  const pontos = lerPontos(userId);
  const pontosDaAssembleia = pontos.filter((ponto) => ponto.assembleiaId === assembleiaId);
  const agora = new Date().toISOString();

  const proximoNumero =
    pontosDaAssembleia.length > 0
      ? Math.max(...pontosDaAssembleia.map((ponto) => ponto.numero)) + 1
      : 1;

  const novoPonto: PontoOrdemTrabalhos = {
    id: options?.id ?? gerarId(),
    assembleiaId,
    numero: proximoNumero,
    titulo: data.titulo,
    descricao: data.descricao,
    estado: "Por preparar",
    prioridade: data.prioridade,
    objetivoPolitico: "",
    posicaoPolitica: "",
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
    createdAt: agora,
    updatedAt: agora,
  };

  return executarMutacaoIsolada({
    userId,
    persistirRemoto: (ownerId) => guardarPontoRemotamente(ownerId, novoPonto),
    obterUserIdAtivo: async () => (await obterUtilizadorSupabaseValidado())?.id,
    confirmarLocal: (ownerId) => {
      const atuais = lerPontos(ownerId);
      guardarPontos([novoPonto, ...atuais.filter((item) => item.id !== novoPonto.id)], ownerId);
      return novoPonto;
    },
  });
}

export async function atualizarPonto(
  pontoId: string,
  data: Partial<Omit<PontoOrdemTrabalhos, "id" | "assembleiaId" | "numero">>,
) {
  const userId = await obterUserIdValidado();
  const pontos = lerPontos(userId);

  const pontosAtualizados = pontos.map((ponto) =>
    ponto.id === pontoId
      ? {
          ...ponto,
          ...data,
          updatedAt: new Date().toISOString(),
        }
      : ponto,
  );

  const atualizado = pontosAtualizados.find((ponto) => ponto.id === pontoId);
  if (!atualizado) return undefined;
  return executarMutacaoIsolada({
    userId,
    persistirRemoto: (ownerId) => guardarPontoRemotamente(ownerId, atualizado),
    obterUserIdAtivo: async () => (await obterUtilizadorSupabaseValidado())?.id,
    confirmarLocal: (ownerId) => {
      guardarPontos(pontosAtualizados, ownerId);
      return atualizado;
    },
  });
}

export async function removerPonto(id: string) {
  const userId = await obterUserIdValidado();
  const pontos = lerPontos(userId);
  return executarMutacaoIsolada({
    userId,
    persistirRemoto: () => apagarPontoRemoto(id),
    obterUserIdAtivo: async () => (await obterUtilizadorSupabaseValidado())?.id,
    confirmarLocal: (ownerId) =>
      guardarPontos(
        pontos.filter((ponto) => ponto.id !== id),
        ownerId,
      ),
  });
}

export async function atualizarPontoConfirmado(
  pontoId: string,
  data: Partial<Omit<PontoOrdemTrabalhos, "id" | "assembleiaId" | "numero">>,
) {
  const userId = await obterUserIdValidado();
  const atual = lerPontos(userId).find((ponto) => ponto.id === pontoId);
  if (!atual) return undefined;
  const atualizado = { ...atual, ...data, updatedAt: new Date().toISOString() };
  await guardarPontoRemoto(userId, atualizado);
  if ((await obterUtilizadorSupabaseValidado())?.id !== userId) {
    throw new Error("AUTH_CONTEXT_CHANGED");
  }
  guardarPontos(
    lerPontos(userId).map((ponto) => (ponto.id === pontoId ? atualizado : ponto)),
    userId,
  );
  return atualizado;
}

export async function removerPontoConfirmado(id: string) {
  const userId = await obterUserIdValidado();
  await apagarPontoRemoto(id);
  if ((await obterUtilizadorSupabaseValidado())?.id !== userId) {
    throw new Error("AUTH_CONTEXT_CHANGED");
  }
  guardarPontos(
    lerPontos(userId).filter((ponto) => ponto.id !== id),
    userId,
  );
}

export async function reordenarPontosConfirmado(assembleiaId: string, idsOrdenados: string[]) {
  const userId = await obterUserIdValidado();
  const todos = lerPontos(userId);
  const ordenados = criarPontosReordenados(todos, assembleiaId, idsOrdenados);
  await reordenarPontosRemotos(assembleiaId, idsOrdenados);
  if ((await obterUtilizadorSupabaseValidado())?.id !== userId) {
    throw new Error("AUTH_CONTEXT_CHANGED");
  }
  const ids = new Set(idsOrdenados);
  guardarPontos([...todos.filter((ponto) => !ids.has(ponto.id)), ...ordenados], userId);
  return ordenados;
}

export function criarPontosReordenados(
  todos: PontoOrdemTrabalhos[],
  assembleiaId: string,
  idsOrdenados: string[],
) {
  const porId = new Map(todos.map((ponto) => [ponto.id, ponto]));
  const ordenados = idsOrdenados.map((id, index) => {
    const ponto = porId.get(id);
    if (!ponto || ponto.assembleiaId !== assembleiaId) throw new Error("PONTO_ORDEM_INVALIDA");
    return { ...ponto, numero: index + 1, updatedAt: new Date().toISOString() };
  });
  return ordenados;
}
