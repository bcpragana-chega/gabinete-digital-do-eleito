import { createFileRoute } from "@tanstack/react-router";
import { LegacyRedirect } from "./-legacy-redirect";

export const Route = createFileRoute("/_app/caixa-de-entrada")({
  component: BibliotecaRedirect,
});

function BibliotecaRedirect() {
  return <LegacyRedirect to="/biblioteca" />;
}
