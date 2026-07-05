import { createFileRoute } from "@tanstack/react-router";
import { LegacyRedirect } from "./-legacy-redirect";

export const Route = createFileRoute("/_app/assembleias/$id/preparacao/estrategia")({
  component: PreparacaoEstrategiaRedirect,
});

function PreparacaoEstrategiaRedirect() {
  const { id } = Route.useParams();

  return <LegacyRedirect to="/sessoes/$id/preparacao/estrategia" params={{ id }} />;
}
