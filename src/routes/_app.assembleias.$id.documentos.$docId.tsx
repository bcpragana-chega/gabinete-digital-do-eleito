import { createFileRoute } from "@tanstack/react-router";
import { LegacyRedirect } from "./-legacy-redirect";

export const Route = createFileRoute("/_app/assembleias/$id/documentos/$docId")({
  component: AssembleiaDocumentoRedirect,
});

function AssembleiaDocumentoRedirect() {
  const { id, docId } = Route.useParams();

  return <LegacyRedirect to="/sessoes/$id/documentos/$docId" params={{ id, docId }} />;
}
