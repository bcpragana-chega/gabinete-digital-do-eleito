import { createFileRoute } from "@tanstack/react-router";
import { LegacyRedirect } from "./-legacy-redirect";

export const Route = createFileRoute(
  "/_app/assembleias/$id/preparacao/pontos/$pontoId/rascunhos/$rascunhoId",
)({
  component: PreparacaoPontoRascunhoRedirect,
});

function PreparacaoPontoRascunhoRedirect() {
  const { rascunhoId } = Route.useParams();

  return <LegacyRedirect to="/documentos/$documentoId" params={{ documentoId: rascunhoId }} />;
}
