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
  titulo: string;
  prioridade: NivelPrioridade;
  descricao: string;
  documentos: string[];
  estado: EstadoPrioridade;
};

export type PerguntaSugerida = {
  id: string;
  tema: string;
  pergunta: string;
  prioridade: NivelPrioridade;
  documentos: string[];
};

export type AcaoPendente = {
  id: string;
  tarefa: string;
  estado: EstadoAcao;
  prazo?: string;
};

export type DocumentoACriar = {
  id: string;
  tipo: TipoDocumento;
  motivo: string;
  prioridade: NivelPrioridade;
};

export const prioridadesMock: PrioridadeAssembleia[] = [
  {
    id: "p1",
    titulo: "Execução do PPI 2026",
    prioridade: "Alta",
    descricao:
      "Confrontar o executivo com o atraso na execução do Plano Plurianual de Investimentos, em particular nas rubricas de mobilidade e habitação.",
    documentos: [
      "Relatório de execução do PPI — 1.º semestre",
      "Mapa de compromissos plurianuais",
    ],
    estado: "Por preparar",
  },
  {
    id: "p2",
    titulo: "Centro Cultural D. Dinis",
    prioridade: "Alta",
    descricao:
      "Defender a calendarização firme da abertura do equipamento e exigir o cronograma de obra atualizado.",
    documentos: [
      "Caderno de encargos — Centro Cultural",
      "Ata da Comissão de Cultura — abril 2026",
    ],
    estado: "Preparado",
  },
  {
    id: "p3",
    titulo: "Transferências de capital para Juntas",
    prioridade: "Média",
    descricao:
      "Esclarecer os critérios de distribuição das transferências de capital às juntas de freguesia no segundo semestre.",
    documentos: ["Mapa de transferências — anexo IX do Orçamento"],
    estado: "Acompanhar",
  },
  {
    id: "p4",
    titulo: "Aquisição de terrenos para estacionamento",
    prioridade: "Baixa",
    descricao:
      "Acompanhar o processo de aquisição dos terrenos previstos para a bolsa de estacionamento dissuasor.",
    documentos: ["Proposta n.º 47/2026 — Câmara Municipal"],
    estado: "Acompanhar",
  },
];

export const perguntasMock: PerguntaSugerida[] = [
  {
    id: "q1",
    tema: "Execução do PPI",
    pergunta:
      "Qual a taxa de execução financeira do PPI à data de 30 de junho e que rubricas apresentam desvio superior a 25%?",
    prioridade: "Alta",
    documentos: ["Relatório de execução do PPI — 1.º semestre"],
  },
  {
    id: "q2",
    tema: "Transferências correntes",
    pergunta:
      "Que critérios objetivos sustentam o aumento das transferências correntes para a Freguesia da Sé face ao ano anterior?",
    prioridade: "Média",
    documentos: ["Mapa de transferências correntes — anexo VIII"],
  },
  {
    id: "q3",
    tema: "Novas instalações da Junta",
    pergunta:
      "Em que fase se encontra o processo de licenciamento das novas instalações da Junta de Freguesia de Santa Maria?",
    prioridade: "Média",
    documentos: ["Memorando técnico — DOM/2026/118"],
  },
  {
    id: "q4",
    tema: "Centro Cultural D. Dinis",
    pergunta:
      "Mantém-se a previsão de inauguração do Centro Cultural D. Dinis no 1.º trimestre de 2027?",
    prioridade: "Alta",
    documentos: ["Cronograma de obra — revisão 3"],
  },
];

export const acoesMock: AcaoPendente[] = [
  {
    id: "a1",
    tarefa: "Reunir com o grupo municipal para alinhar sentido de voto",
    estado: "Em curso",
    prazo: "10 jul 2026",
  },
  {
    id: "a2",
    tarefa: "Pedir parecer jurídico sobre a aquisição de terrenos para estacionamento",
    estado: "Pendente",
    prazo: "12 jul 2026",
  },
  {
    id: "a3",
    tarefa: "Consolidar dados de execução das transferências de capital",
    estado: "Pendente",
    prazo: "14 jul 2026",
  },
  {
    id: "a4",
    tarefa: "Rever ata da sessão anterior e propor correções",
    estado: "Concluída",
  },
];

export const documentosACriarMock: DocumentoACriar[] = [
  {
    id: "d1",
    tipo: "Moção",
    motivo:
      "Reforço da transparência na execução do PPI, com publicação trimestral de mapas detalhados por rubrica.",
    prioridade: "Alta",
  },
  {
    id: "d2",
    tipo: "Requerimento",
    motivo:
      "Acesso integral aos pareceres técnicos sobre a localização das novas instalações da Junta de Santa Maria.",
    prioridade: "Média",
  },
  {
    id: "d3",
    tipo: "Recomendação",
    motivo:
      "Definição de critérios objetivos e publicados para as transferências correntes às freguesias.",
    prioridade: "Média",
  },
  {
    id: "d4",
    tipo: "Declaração de voto",
    motivo:
      "Posição fundamentada sobre a proposta de aquisição de terrenos para estacionamento dissuasor.",
    prioridade: "Baixa",
  },
  {
    id: "d5",
    tipo: "Intervenção",
    motivo:
      "Balanço público da execução do Centro Cultural D. Dinis e exigência de cronograma vinculativo.",
    prioridade: "Alta",
  },
];
