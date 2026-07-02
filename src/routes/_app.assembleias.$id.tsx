import { useState } from "react";
import {
  createFileRoute,
  Link,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import {
  Calendar,
  MapPin,
  Clock,
  ArrowRight,
  ChevronLeft,
  Sparkles,
  Archive,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatarData } from "@/lib/mock-data";
import { arquivarAssembleia, useAssembleia } from "@/lib/assembleias-store";
import { EditarAssembleiaDialog } from "@/components/assembleias/EditarAssembleiaDialog";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/assembleias/$id")({
  head: () => ({
    meta: [
      { title: "Assembleia — Tribuno" },
      {
        name: "description",
        content:
          "Detalhe da sessão, preparação e acompanhamento da assembleia municipal.",
      },
    ],
  }),
  component: AssembleiaDetailPage,
});

function AssembleiaDetailPage() {
  const { id } = Route.useParams();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const assembleia = useAssembleia(id);
  const [confirmarArquivo, setConfirmarArquivo] = useState(false);

  const isSubRoute = pathname.includes(`/assembleias/${id}/`);

  if (isSubRoute) {
    return <Outlet />;
  }

  if (!assembleia) {
    return (
      <>
        <TopBar breadcrumb="Assembleias" />
        <main className="px-8 py-10 max-w-7xl">
          <Link
            to="/assembleias"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Todas as assembleias
          </Link>

          <section className="rounded-2xl border border-border bg-card p-8 shadow-card">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              Assembleia não encontrada
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Esta assembleia pode ter sido removida ou ainda não estar
              disponível neste navegador.
            </p>
          </section>
        </main>
      </>
    );
  }

  function arquivar() {
    if (!assembleia) return;

    if (!confirmarArquivo) {
      setConfirmarArquivo(true);
      return;
    }

    arquivarAssembleia(assembleia.id);
    setConfirmarArquivo(false);
  }

  const estaArquivada = assembleia.estado === "arquivada";

  return (
    <>
      <TopBar
        breadcrumb={
          <span>
            <Link
              to="/assembleias"
              className="hover:text-foreground transition-colors"
            >
              Assembleias
            </Link>
            <span className="mx-2 text-muted-foreground/60">/</span>
            <span className="text-foreground">{assembleia.nome}</span>
          </span>
        }
      />
      <main className="px-8 py-10 max-w-7xl">
        <Link
          to="/assembleias"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Todas as assembleias
        </Link>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="min-w-0">
              <StatusBadge estado={assembleia.estado} />
              <h1 className="mt-3 font-display text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
                {assembleia.nome}
              </h1>
              <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" strokeWidth={1.75} />
                  <span>{formatarData(assembleia.data)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" strokeWidth={1.75} />
                  <span>{assembleia.hora}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" strokeWidth={1.75} />
                  <span>{assembleia.local}</span>
                </div>
              </dl>
            </div>

            <div className="flex gap-3 flex-wrap">
              <EditarAssembleiaDialog assembleia={assembleia} />

              {!estaArquivada && (
                <Button variant="secondary" onClick={arquivar}>
                  <Archive className="mr-2 h-4 w-4" />
                  {confirmarArquivo ? "Confirmar arquivo" : "Arquivar"}
                </Button>
              )}

              <Link
                to="/assembleias/$id/preparacao"
                params={{ id }}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
              >
                <Sparkles className="h-4 w-4" strokeWidth={1.75} />
                Preparar Assembleia
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {confirmarArquivo && (
            <p className="mt-4 text-sm text-muted-foreground">
              Clique novamente em{" "}
              <span className="font-medium text-foreground">
                Confirmar arquivo
              </span>{" "}
              para arquivar esta assembleia.
            </p>
          )}
        </section>
      </main>
    </>
  );
}