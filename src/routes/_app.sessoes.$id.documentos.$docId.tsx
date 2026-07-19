import { createFileRoute } from "@tanstack/react-router";
import { LegacyRedirect } from "./-legacy-redirect";

export const Route = createFileRoute("/_app/sessoes/$id/documentos/$docId")({
  component: SessaoDocumentoRedirect,
});

function SessaoDocumentoRedirect() {
  const { id, docId } = Route.useParams();
  return (
    <LegacyRedirect to="/documentos/$docId?origem=sessao&sessaoId=$id" params={{ id, docId }} />
  );
}
