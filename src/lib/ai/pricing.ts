export type ModeloPrecoAi = {
  inputPerMillionTokens: number;
  outputPerMillionTokens: number;
};

const PRECOS_POR_MODELO: Record<string, ModeloPrecoAi> = {
  "gpt-5.5": {
    inputPerMillionTokens: 5,
    outputPerMillionTokens: 30,
  },
  "gpt-5.4": {
    inputPerMillionTokens: 2.5,
    outputPerMillionTokens: 15,
  },
  "gpt-5.4-mini": {
    inputPerMillionTokens: 0.75,
    outputPerMillionTokens: 4.5,
  },
  "gpt-5.4-nano": {
    inputPerMillionTokens: 0.2,
    outputPerMillionTokens: 1.25,
  },
};

const ALIAS_DE_MODELO: Record<string, string> = {
  "gpt-5-mini": "gpt-5.4-mini",
  "gpt-5-nano": "gpt-5.4-nano",
  "gpt-5": "gpt-5.4",
};

export function normalizarModeloAi(modelo: string) {
  const limpo = modelo.trim().toLowerCase();
  return ALIAS_DE_MODELO[limpo] ?? limpo;
}

export function obterPrecoModeloAi(modelo: string) {
  return PRECOS_POR_MODELO[normalizarModeloAi(modelo)];
}

export function calcularCustoEstimadoAi(params: {
  modelo: string;
  inputTokens?: number;
  outputTokens?: number;
}) {
  const preco = obterPrecoModeloAi(params.modelo);
  const inputTokens = Math.max(0, Math.trunc(params.inputTokens ?? 0));
  const outputTokens = Math.max(0, Math.trunc(params.outputTokens ?? 0));

  if (!preco) {
    return {
      input: 0,
      output: 0,
      total: 0,
      temPrecoConfigurado: false,
    };
  }

  const input = (inputTokens / 1_000_000) * preco.inputPerMillionTokens;
  const output = (outputTokens / 1_000_000) * preco.outputPerMillionTokens;

  return {
    input,
    output,
    total: input + output,
    temPrecoConfigurado: true,
  };
}
