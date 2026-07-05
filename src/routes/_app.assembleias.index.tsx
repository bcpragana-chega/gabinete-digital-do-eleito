import { createFileRoute } from "@tanstack/react-router";
import { LegacyRedirect } from "./-legacy-redirect";

export const Route = createFileRoute("/_app/assembleias/")({
  component: AssembleiasRedirect,
});

function AssembleiasRedirect() {
  return <LegacyRedirect to="/sessoes" />;
}
