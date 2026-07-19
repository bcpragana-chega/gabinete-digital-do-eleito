import { createFileRoute } from "@tanstack/react-router";
import { LegacyRedirect } from "./-legacy-redirect";

export const Route = createFileRoute("/_app/biblioteca/documentos/$docId")({
  component: BibliotecaDocumentoRedirect,
});

function BibliotecaDocumentoRedirect() {
  const { docId } = Route.useParams();
  return <LegacyRedirect to="/documentos/$docId?origem=biblioteca" params={{ docId }} />;
}
