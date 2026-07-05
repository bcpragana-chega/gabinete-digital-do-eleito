import { createFileRoute } from "@tanstack/react-router";
import { LegacyRedirect } from "./-legacy-redirect";

export const Route = createFileRoute("/_app/assembleias/$id/preparacao/pontos")({
  component: PreparacaoPontosRedirect,
});

function PreparacaoPontosRedirect() {
  const { id } = Route.useParams();

  return <LegacyRedirect to="/sessoes/$id/preparacao/pontos" params={{ id }} />;
}
