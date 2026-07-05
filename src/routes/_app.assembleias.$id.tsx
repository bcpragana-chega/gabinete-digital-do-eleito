import { createFileRoute } from "@tanstack/react-router";
import { LegacyRedirect } from "./-legacy-redirect";

export const Route = createFileRoute("/_app/assembleias/$id")({
  component: AssembleiaRedirect,
});

function AssembleiaRedirect() {
  const { id } = Route.useParams();

  return <LegacyRedirect to="/sessoes/$id" params={{ id }} />;
}
