export async function executarMutacaoConfirmada<T>(input: {
  persistirRemoto: () => Promise<unknown>;
  confirmarLocal: () => T;
}) {
  await input.persistirRemoto();
  return input.confirmarLocal();
}

export class ContextoUtilizadorAlteradoErro extends Error {
  constructor() {
    super("AUTH_CONTEXT_CHANGED");
    this.name = "ContextoUtilizadorAlteradoErro";
  }
}

export async function executarMutacaoIsolada<T>(input: {
  userId: string;
  persistirRemoto: (userId: string) => Promise<unknown>;
  obterUserIdAtivo: () => Promise<string | undefined>;
  confirmarLocal: (userId: string) => T;
}) {
  await input.persistirRemoto(input.userId);
  if ((await input.obterUserIdAtivo()) !== input.userId) {
    throw new ContextoUtilizadorAlteradoErro();
  }
  return input.confirmarLocal(input.userId);
}

export async function executarHidratacaoIsolada<T>(input: {
  userId: string;
  carregarRemoto: (userId: string) => Promise<T>;
  obterUserIdAtivo: () => Promise<string | undefined>;
  confirmarLocal: (userId: string, value: T) => void;
  isAtual?: () => boolean;
}) {
  const value = await input.carregarRemoto(input.userId);
  if (input.isAtual && !input.isAtual()) return undefined;
  if ((await input.obterUserIdAtivo()) !== input.userId) return undefined;
  if (input.isAtual && !input.isAtual()) return undefined;
  input.confirmarLocal(input.userId, value);
  return value;
}

export function criarCoordenadorHidratacaoPorOwner() {
  let geracaoAtual = 0;
  const emCurso = new Map<string, { geracao: number; promise: Promise<void> }>();

  return function executar(input: {
    userId: string;
    hidratar: (geracao: number, isAtual: () => boolean) => Promise<void>;
  }) {
    const existente = emCurso.get(input.userId);
    if (existente?.geracao === geracaoAtual) return existente.promise;

    const geracao = ++geracaoAtual;
    const promise = input
      .hidratar(geracao, () => geracao === geracaoAtual)
      .finally(() => {
        if (emCurso.get(input.userId)?.geracao === geracao) emCurso.delete(input.userId);
      });
    emCurso.set(input.userId, { geracao, promise });
    return promise;
  };
}
