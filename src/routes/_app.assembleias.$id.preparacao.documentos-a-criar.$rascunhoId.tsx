import { createFileRoute } from "@tanstack/react-router";
import { LegacyRedirect } from "./-legacy-redirect";

export const Route = createFileRoute(
  "/_app/assembleias/$id/preparacao/documentos-a-criar/$rascunhoId",
)({
  component: PreparacaoDocumentoRedirect,
});

function PreparacaoDocumentoRedirect() {
  const { id, rascunhoId } = Route.useParams();

  return (
    <LegacyRedirect
      to="/documentos/$documentoId?origem=sessao&sessaoId=$id"
      params={{ documentoId: rascunhoId, id }}
    />
  );
}
