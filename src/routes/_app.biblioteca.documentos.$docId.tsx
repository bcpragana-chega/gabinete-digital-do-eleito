import { createFileRoute } from "@tanstack/react-router";
import { DocumentoDetalhePage } from "./_app.sessoes.$id.documentos.$docId";

export const Route = createFileRoute("/_app/biblioteca/documentos/$docId")({
  head: () => ({
    meta: [
      { title: "Documento — Biblioteca — Tribuno" },
      {
        name: "description",
        content: "Detalhe de documento da Biblioteca.",
      },
    ],
  }),
  component: BibliotecaDocumentoPage,
});

function BibliotecaDocumentoPage() {
  const { docId } = Route.useParams();
  return <DocumentoDetalhePage contextoId="biblioteca" docId={docId} />;
}
