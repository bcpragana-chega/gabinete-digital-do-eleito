import { useMemo, useState } from "react";
import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { ArrowRight, ChevronLeft, ListOrdered } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { AdicionarPontoDialog } from "@/components/preparacao/AdicionarPontoDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAssembleia } from "@/lib/assembleias-store";
import { obterPontosDaAssembleia } from "@/lib/pontos-store";

export const Route = createFileRoute("/_app/assembleias/$id/preparacao/pontos")({
  head: () => ({
    meta: [
      { title: "Pontos — Preparação — Tribuno" },
      {
        name: "description",
        content: "Pontos da ordem de trabalhos da assembleia.",
      },
    ],
  }),
  component: PreparacaoPontosPage,
});

function PreparacaoPontosPage() {
  const { id } = Route.useParams();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const assembleia = useAssembleia(id);
  const [versao, setVersao] = useState(0);

  const pontos = useMemo(() => obterPontosDaAssembleia(id), [id, versao]);

  const isSubRoute = pathname.includes(`/assembleias/${id}/preparacao/pontos/`);

  function atualizarPontos() {
    setVersao((valor) => valor + 1);
  }

  function abrirPonto(pontoId: string) {
    navigate({
      to: "/assembleias/$id/preparacao/pontos/$pontoId",
      params: {
        id,
        pontoId,
      },
    });
  }

  if (isSubRoute) {
    return <Outlet />;
  }

  if (!assembleia) {
    return (
      <>
        <TopBar breadcrumb="Pontos" />
        <main className="px-8 py-10 max-w-7xl">
          <Link
            to="/assembleias"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Todas as assembleias
          </Link>

          <EmptyState title="Sessão não encontrada" />
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar breadcrumb="Pontos" />

      <main className="px-8 py-10 max-w-7xl">
        <Link
          to="/assembleias/$id/preparacao"
          params={{ id }}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Voltar à preparação
        </Link>

        <PageHeader
          icon={ListOrdered}
          title="Pontos da Ordem de Trabalhos"
          description="Organize aqui os pontos da sessão e prepare notas, perguntas, ações, sentido de voto e documentos associados a cada ponto."
          actions={<AdicionarPontoDialog assembleiaId={id} onAdicionar={atualizarPontos} />}
        />

        {pontos.length === 0 ? (
          <EmptyState title="Ainda não existem pontos" />
        ) : (
          <section className="grid gap-4 md:grid-cols-2">
            {pontos.map((ponto) => (
              <button
                key={ponto.id}
                type="button"
                onClick={() => abrirPonto(ponto.id)}
                className="group block text-left"
              >
                <article className="rounded-2xl border border-border bg-card p-5 shadow-card transition-all group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-md">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Ponto {ponto.numero}
                      </div>
                      <h2 className="mt-2 font-display text-xl font-semibold tracking-tight text-foreground">
                        {ponto.titulo}
                      </h2>
                    </div>

                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </div>

                  {ponto.descricao && (
                    <p className="mt-3 text-sm text-muted-foreground">{ponto.descricao}</p>
                  )}
                </article>
              </button>
            ))}
          </section>
        )}
      </main>
    </>
  );
}
