import { createFileRoute } from "@tanstack/react-router";
import { LegacyRedirect } from "./-legacy-redirect";

export const Route = createFileRoute("/_app/dossies/$dossieId/documentos/$documentoId")({
  component: DossieDocumentoRedirect,
});

function DossieDocumentoRedirect() {
  const { dossieId, documentoId } = Route.useParams();
  return (
    <LegacyRedirect
      to="/documentos/$documentoId?origem=assunto&assuntoId=$dossieId"
      params={{ dossieId, documentoId }}
    />
  );
}
