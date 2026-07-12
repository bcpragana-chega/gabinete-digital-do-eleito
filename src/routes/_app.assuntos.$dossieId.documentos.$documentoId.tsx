import { createFileRoute } from "@tanstack/react-router";
import { LegacyRedirect } from "./-legacy-redirect";

export const Route = createFileRoute("/_app/assuntos/$dossieId/documentos/$documentoId")({
  component: DocumentoDoAssuntoRedirect,
});

function DocumentoDoAssuntoRedirect() {
  const { documentoId } = Route.useParams();
  return <LegacyRedirect to="/documentos/$documentoId" params={{ documentoId }} />;
}
