export type EstrategiaSessao = {
  assembleiaId: string;
  objetivoPolitico: string;
  mensagemPrincipal: string;
  naoFazer: string;
  adversariosPrevisiveis: string;
  notasLivres: string;
};

const STORAGE_KEY = "tribuno-estrategia-sessao";

const estrategiaVazia = (assembleiaId: string): EstrategiaSessao => ({
  assembleiaId,
  objetivoPolitico: "",
  mensagemPrincipal: "",
  naoFazer: "",
  adversariosPrevisiveis: "",
  notasLivres: "",
});

function lerTodasEstrategias(): EstrategiaSessao[] {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) return [];

  try {
    return JSON.parse(raw) as EstrategiaSessao[];
  } catch {
    return [];
  }
}

function guardarTodasEstrategias(estrategias: EstrategiaSessao[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(estrategias));
}

export function obterEstrategiaDaAssembleia(
  assembleiaId: string,
): EstrategiaSessao {
  const estrategias = lerTodasEstrategias();
  const estrategia = estrategias.find(
    (item) => item.assembleiaId === assembleiaId,
  );

  return estrategia ?? estrategiaVazia(assembleiaId);
}

export function guardarEstrategiaDaAssembleia(
  assembleiaId: string,
  data: Omit<EstrategiaSessao, "assembleiaId">,
) {
  const estrategias = lerTodasEstrategias();

  const novaEstrategia: EstrategiaSessao = {
    assembleiaId,
    ...data,
  };

  const restantes = estrategias.filter(
    (item) => item.assembleiaId !== assembleiaId,
  );

  guardarTodasEstrategias([novaEstrategia, ...restantes]);

  return novaEstrategia;
}