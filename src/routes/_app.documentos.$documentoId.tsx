import { createFileRoute } from "@tanstack/react-router";
import { DocumentoCriadoDetalhe } from "@/components/documentos/DocumentoCriadoDetalhe";
import { DocumentoRecebidoDetalhe } from "@/components/documentos/DocumentoRecebidoDetalhe";
import type { DocumentoOrigemSearch } from "@/components/documentos/DocumentoContextoNavegacao";
import { useDocumento } from "@/lib/documentos-store";

export const Route = createFileRoute("/_app/documentos/$documentoId")({
  validateSearch: (search: Record<string, unknown>): DocumentoOrigemSearch => ({
    origem: typeof search.origem === "string" ? search.origem : undefined,
    sessaoId: typeof search.sessaoId === "string" ? search.sessaoId : undefined,
    assuntoId: typeof search.assuntoId === "string" ? search.assuntoId : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Documento — Tribuno" },
      { name: "description", content: "Detalhe canónico de documento no Tribuno." },
    ],
  }),
  component: DocumentoDetalhePage,
});

function DocumentoDetalhePage() {
  const { documentoId } = Route.useParams();
  const origem = Route.useSearch();
  const documentoRecebido = useDocumento(documentoId);

  return documentoRecebido ? (
    <DocumentoRecebidoDetalhe documento={documentoRecebido} origem={origem} />
  ) : (
    <DocumentoCriadoDetalhe documentoId={documentoId} origem={origem} />
  );
}
