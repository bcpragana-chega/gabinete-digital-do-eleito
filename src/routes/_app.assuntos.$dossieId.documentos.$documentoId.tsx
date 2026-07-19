import { createFileRoute } from "@tanstack/react-router";
import { LegacyRedirect } from "./-legacy-redirect";

export const Route = createFileRoute("/_app/assuntos/$dossieId/documentos/$documentoId")({
  component: DocumentoDoAssuntoRedirect,
});

function DocumentoDoAssuntoRedirect() {
  const { dossieId, documentoId } = Route.useParams();
  return (
    <LegacyRedirect
      to="/documentos/$documentoId?origem=assunto&assuntoId=$dossieId"
      params={{ dossieId, documentoId }}
    />
  );
}
