import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/assuntos/$dossieId")({
  component: AssuntoLayout,
});

function AssuntoLayout() {
  return <Outlet />;
}
