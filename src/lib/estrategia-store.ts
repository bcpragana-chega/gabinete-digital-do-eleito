import { guardarJSONPorUtilizador, lerJSONPorUtilizador } from "./user-storage";

export type EstrategiaSessao = {
  assembleiaId: string;
  objetivoPolitico: string;
  mensagemPrincipal: string;
  naoFazer: string;
  adversariosPrevisiveis: string;
  notasLivres: string;
};

const STORAGE_KEY = "tribuno:estrategia";

const estrategiaVazia = (assembleiaId: string): EstrategiaSessao => ({
  assembleiaId,
  objetivoPolitico: "",
  mensagemPrincipal: "",
  naoFazer: "",
  adversariosPrevisiveis: "",
  notasLivres: "",
});

function lerTodasEstrategias(): EstrategiaSessao[] {
  const parsed = lerJSONPorUtilizador<EstrategiaSessao[]>(STORAGE_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

function guardarTodasEstrategias(estrategias: EstrategiaSessao[]) {
  guardarJSONPorUtilizador(STORAGE_KEY, estrategias);
}

export function obterEstrategiaDaAssembleia(assembleiaId: string): EstrategiaSessao {
  const estrategias = lerTodasEstrategias();
  const estrategia = estrategias.find((item) => item.assembleiaId === assembleiaId);

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

  const restantes = estrategias.filter((item) => item.assembleiaId !== assembleiaId);

  guardarTodasEstrategias([novaEstrategia, ...restantes]);

  return novaEstrategia;
}
