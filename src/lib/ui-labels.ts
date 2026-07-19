import type { EstadoDocumento } from "@/lib/types";
import type { EstadoInboxDocumento } from "@/lib/types";

export const TERMS = {
  sessao: "Sessão",
  sessoes: "Sessões",
  assunto: "Assunto",
  assuntos: "Assuntos",
  caixaEntrada: "Biblioteca",
} as const;

export function labelEstadoDocumento(estado: EstadoDocumento) {
  return estado;
}

export function labelEstadoInbox(estado: EstadoInboxDocumento) {
  if (estado === "Tratado") return "Analisado";
  return estado;
}
