import { createFileRoute } from "@tanstack/react-router";
import { LegacyRedirect } from "./-legacy-redirect";

export const Route = createFileRoute("/_app/assembleias/$id/preparacao/documentos-a-criar")({
  component: PreparacaoDocumentosACriarRedirect,
});

function PreparacaoDocumentosACriarRedirect() {
  const { id } = Route.useParams();

  return <LegacyRedirect to="/sessoes/$id/preparacao/documentos-a-criar" params={{ id }} />;
}
