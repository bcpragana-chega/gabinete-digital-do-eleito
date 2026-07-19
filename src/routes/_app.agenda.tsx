import { createFileRoute } from "@tanstack/react-router";
import { LegacyRedirect } from "./-legacy-redirect";

export const Route = createFileRoute("/_app/agenda")({
  component: AgendaRedirect,
});

function AgendaRedirect() {
  return <LegacyRedirect to="/sessoes" />;
}
