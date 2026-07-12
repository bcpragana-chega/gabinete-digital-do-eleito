import { createFileRoute } from "@tanstack/react-router";
import { LegacyRedirect } from "./-legacy-redirect";

export const Route = createFileRoute("/_app/dossies/$dossieId/documentos/$documentoId")({
  component: DossieDocumentoRedirect,
});

function DossieDocumentoRedirect() {
  const { documentoId } = Route.useParams();
  return <LegacyRedirect to="/documentos/$documentoId" params={{ documentoId }} />;
}
