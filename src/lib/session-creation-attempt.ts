export type TentativaCriacaoSessao<S> = {
  sessaoId: string;
  sessao?: S;
  pontosConfirmados: Set<string>;
};

export async function executarTentativaCriacaoSessao<S, P>(input: {
  tentativa: TentativaCriacaoSessao<S>;
  pontos: Array<{ id: string; value: P }>;
  criarSessao: (id: string) => Promise<S>;
  criarPonto: (sessao: S, ponto: P, id: string) => Promise<unknown>;
}) {
  const tentativa = input.tentativa;
  try {
    if (!tentativa.sessao) {
      tentativa.sessao = await input.criarSessao(tentativa.sessaoId);
    }
    for (const ponto of input.pontos) {
      if (tentativa.pontosConfirmados.has(ponto.id)) continue;
      await input.criarPonto(tentativa.sessao, ponto.value, ponto.id);
      tentativa.pontosConfirmados.add(ponto.id);
    }
    return { concluida: true as const, tentativa };
  } catch (error) {
    return { concluida: false as const, tentativa, error };
  }
}
