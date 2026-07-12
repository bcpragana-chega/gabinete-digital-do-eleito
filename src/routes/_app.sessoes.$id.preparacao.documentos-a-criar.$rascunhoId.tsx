import { createFileRoute } from "@tanstack/react-router";
import { LegacyRedirect } from "./-legacy-redirect";

export const Route = createFileRoute("/_app/sessoes/$id/preparacao/documentos-a-criar/$rascunhoId")(
  {
    component: DocumentoCriadoDaSessaoRedirect,
  },
);

function DocumentoCriadoDaSessaoRedirect() {
  const { rascunhoId } = Route.useParams();
  return <LegacyRedirect to="/documentos/$documentoId" params={{ documentoId: rascunhoId }} />;
}
