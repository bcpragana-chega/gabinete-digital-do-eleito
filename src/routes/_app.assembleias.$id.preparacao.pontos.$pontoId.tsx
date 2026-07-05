import { createFileRoute } from "@tanstack/react-router";
import { LegacyRedirect } from "./-legacy-redirect";

export const Route = createFileRoute("/_app/assembleias/$id/preparacao/pontos/$pontoId")({
  component: PreparacaoPontoRedirect,
});

function PreparacaoPontoRedirect() {
  const { id, pontoId } = Route.useParams();

  return <LegacyRedirect to="/sessoes/$id/preparacao/pontos/$pontoId" params={{ id, pontoId }} />;
}
