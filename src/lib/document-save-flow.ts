import type { DocumentoCriado } from "@/lib/types";

type FluxoGravacaoDocumento = {
  persistir: () => Promise<DocumentoCriado>;
  aoIniciar: () => void;
  aoConfirmar: (documento: DocumentoCriado) => void;
  aoFalhar: () => void;
};

export async function executarGravacaoConfirmadaDocumento(fluxo: FluxoGravacaoDocumento) {
  fluxo.aoIniciar();
  try {
    const persistido = await fluxo.persistir();
    fluxo.aoConfirmar(persistido);
    return persistido;
  } catch (error) {
    fluxo.aoFalhar();
    throw error;
  }
}
