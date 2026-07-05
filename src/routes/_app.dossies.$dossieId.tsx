import { createFileRoute } from "@tanstack/react-router";
import { LegacyRedirect } from "./-legacy-redirect";

export const Route = createFileRoute("/_app/dossies/$dossieId")({
  component: DossieRedirect,
});

function DossieRedirect() {
  const { dossieId } = Route.useParams();

  return <LegacyRedirect to="/assuntos/$dossieId" params={{ dossieId }} />;
}
