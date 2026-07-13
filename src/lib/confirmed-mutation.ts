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
