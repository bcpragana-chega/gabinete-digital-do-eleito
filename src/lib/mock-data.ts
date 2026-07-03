import type {
  Assembleia,
  Documento,
  EstadoDocumento,
  TipoDocumento,
} from "./types";

export const assembleias: Assembleia[] = [
  {
    id: "ord-2026-jul",
    nome: "Sessão municipal ordinária — Julho",
    data: "2026-07-14",
    hora: "21:00",
    local: "Salão Nobre dos Paços do Concelho",
    estado: "preparacao",
  },
  {
    id: "ext-2026-orc",
    nome: "Sessão extraordinária — Orçamento Suplementar",
    data: "2026-07-02",
    hora: "18:30",
    local: "Auditório Municipal",
    estado: "analise",
  },
  {
    id: "ord-2026-jun",
    nome: "Sessão municipal ordinária — 2.º trimestre",
    data: "2026-06-20",
    hora: "21:00",
    local: "Salão Nobre dos Paços do Concelho",
    estado: "concluida",
  },
  {
    id: "ord-2026-abr",
    nome: "Sessão municipal ordinária — Abril",
    data: "2026-04-25",
    hora: "21:00",
    local: "Salão Nobre dos Paços do Concelho",
    estado: "concluida",
  },
  {
    id: "ext-2026-pdm",
    nome: "Sessão extraordinária — Revisão do PDM",
    data: "2026-03-12",
    hora: "20:00",
    local: "Centro Cultural",
    estado: "concluida",
  },
  {
    id: "ord-2026-fev",
    nome: "Sessão municipal ordinária — Fevereiro",
    data: "2026-02-27",
    hora: "21:00",
    local: "Salão Nobre dos Paços do Concelho",
    estado: "concluida",
  },
];

const tiposBase: TipoDocumento[] = [
  "Convocatória",
  "Ata",
  "PPI",
  "Execução da Receita",
  "Execução da Despesa",
  "Relatório",
];

const estadosBase: EstadoDocumento[] = [
  "Revisto",
  "Por rever",
  "Importante",
  "Revisto",
  "Por rever",
  "Revisto",
];

export const documentos: Documento[] = assembleias.flatMap((a) =>
  tiposBase.map((tipo, idx) => ({
    id: `${a.id}-${idx}`,
    assembleiaId: a.id,
    titulo: `${tipo} — ${formatarDataCurta(a.data)}`,
    tipo,
    data: a.data,
    estado: estadosBase[idx],
    paginas: 6 + ((idx * 7) % 24),
    createdAt: `${a.data}T09:00:00.000Z`,
  })),
);

export function getAssembleia(id: string): Assembleia | undefined {
  return assembleias.find((a) => a.id === id);
}

export function getDocumentosByAssembleia(assembleiaId: string): Documento[] {
  return documentos.filter((d) => d.assembleiaId === assembleiaId);
}

export function getDocumento(id: string): Documento | undefined {
  return documentos.find((d) => d.id === id);
}

export function getProximaAssembleia(): Assembleia {
  const futuras = [...assembleias]
    .filter((a) => a.estado !== "concluida")
    .sort((a, b) => a.data.localeCompare(b.data));
  return futuras[0] ?? assembleias[0];
}

export function formatarData(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function formatarDataCurta(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
