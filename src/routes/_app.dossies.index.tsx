import { createFileRoute } from "@tanstack/react-router";
import { LegacyRedirect } from "./-legacy-redirect";

export const Route = createFileRoute("/_app/dossies/")({
  component: DossiesRedirect,
});

function DossiesRedirect() {
  return <LegacyRedirect to="/assuntos" />;
}
