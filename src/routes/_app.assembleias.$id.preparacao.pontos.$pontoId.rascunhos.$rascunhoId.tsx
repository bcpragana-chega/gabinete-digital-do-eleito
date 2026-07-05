import { createFileRoute } from "@tanstack/react-router";
import { LegacyRedirect } from "./-legacy-redirect";

export const Route = createFileRoute(
  "/_app/assembleias/$id/preparacao/pontos/$pontoId/rascunhos/$rascunhoId",
)({
  component: PreparacaoPontoRascunhoRedirect,
});

function PreparacaoPontoRascunhoRedirect() {
  const { id, pontoId, rascunhoId } = Route.useParams();

  return (
    <LegacyRedirect
      to="/sessoes/$id/preparacao/pontos/$pontoId/rascunhos/$rascunhoId"
      params={{ id, pontoId, rascunhoId }}
    />
  );
}
