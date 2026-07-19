import type {
  AcompanhamentoPolitico,
  EstadoAcompanhamentoPolitico,
  TipoAcompanhamentoPolitico,
} from "@/lib/types";

export type AcompanhamentoPoliticoInput = {
  tipo: TipoAcompanhamentoPolitico;
  data: string;
  descricao: string;
  documentoCriadoId?: string;
  destinatario?: string;
  prazo?: string;
  proximaAcaoEm?: string;
  estado?: EstadoAcompanhamentoPolitico;
};

export function ordenarAcompanhamentos(
  eventos: AcompanhamentoPolitico[],
): AcompanhamentoPolitico[] {
  return [...eventos].sort(
    (a, b) =>
      b.data.localeCompare(a.data) ||
      b.createdAt.localeCompare(a.createdAt) ||
      b.id.localeCompare(a.id),
  );
}

export function obterEstadoAtualAcompanhamento(eventos: AcompanhamentoPolitico[]) {
  return ordenarAcompanhamentos(eventos)[0]?.estado ?? "a_preparar";
}

export function estadoAposAcontecimento(
  input: AcompanhamentoPoliticoInput,
  estadoAtual: EstadoAcompanhamentoPolitico = "a_preparar",
): EstadoAcompanhamentoPolitico {
  if (input.estado) return input.estado;
  if (input.tipo === "resolucao") return "resolvido";
  if (input.tipo === "resposta") return "resposta_recebida";
  if (input.tipo === "entrega") return "a_aguardar";
  if (
    input.tipo === "insistencia" ||
    input.tipo === "regresso_sessao" ||
    input.tipo === "comunicacao_publica"
  ) {
    return input.proximaAcaoEm || input.prazo ? "a_aguardar" : "exige_acao";
  }
  return estadoAtual;
}

export function acompanhamentoEncerrado(estado: EstadoAcompanhamentoPolitico) {
  return estado === "resolvido" || estado === "encerrado_sem_resolucao";
}
