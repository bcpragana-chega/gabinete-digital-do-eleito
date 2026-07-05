import { createFileRoute } from "@tanstack/react-router";
import { LegacyRedirect } from "./-legacy-redirect";

export const Route = createFileRoute("/_app/assembleias/$id/preparacao/documentos")({
  component: PreparacaoDocumentosRedirect,
});

function PreparacaoDocumentosRedirect() {
  const { id } = Route.useParams();

  return <LegacyRedirect to="/sessoes/$id/preparacao/documentos" params={{ id }} />;
}
