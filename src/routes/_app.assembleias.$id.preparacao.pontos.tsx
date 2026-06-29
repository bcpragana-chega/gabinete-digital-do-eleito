import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, ListOrdered } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { AdicionarPontoDialog } from "@/components/preparacao/AdicionarPontoDialog";
import { useAssembleia } from "@/lib/assembleias-store";
import { obterPontosDaAssembleia } from "@/lib/pontos-store";

export const Route = createFileRoute(
  "/_app/assembleias/$id/preparacao/pontos",
)({
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
  const assembleia = useAssembleia(id);
  const [versao, setVersao] = useState(0);

  const pontos = useMemo(() => obterPontosDaAssembleia(id), [id, versao]);

  function atualizarPontos() {
    setVersao((valor) => valor + 1);
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
            <Link
              to="/assembleias/$id"
              params={{ id }}
              className="hover:text-foreground transition-colors"
            >
              {assembleia.nome}
            </Link>
            <span className="mx-2 text-muted-foreground/60">/</span>
            <Link
              to="/assembleias/$id/preparacao"
              params={{ id }}
              className="hover:text-foreground transition-colors"
            >
              Preparação
            </Link>
            <span className="mx-2 text-muted-foreground/60">/</span>
            <span className="text-foreground">Pontos</span>
          </span>
        }
      />

      <main className="px-8 py-10 max-w-7xl">
        <Link
          to="/assembleias/$id/preparacao"
          params={{ id }}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Voltar à preparação
        </Link>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-card mb-8">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground mb-4">
                <ListOrdered className="h-5 w-5" strokeWidth={1.75} />
              </div>

              <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
                Pontos da Ordem de Trabalhos
              </h1>

              <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
                Organize aqui os pontos da sessão e prepare notas, perguntas,
                ações, sentido de voto e documentos associados a cada ponto.
              </p>
            </div>

            <AdicionarPontoDialog
              assembleiaId={id}
              onAdicionar={atualizarPontos}
            />
          </div>
        </section>

        {pontos.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-border bg-card p-8 shadow-card">
            <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
              Ainda não existem pontos
            </h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
              Crie manualmente os pontos da ordem de trabalhos. Mais tarde, o
              Tribuno poderá identificá-los automaticamente a partir da
              convocatória.
            </p>
          </section>
        ) : (
          <section className="grid gap-4 md:grid-cols-2">
            {pontos.map((ponto) => (
              <article
                key={ponto.id}
                className="rounded-2xl border border-border bg-card p-5 shadow-card"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Ponto {ponto.numero}
                    </div>
                    <h2 className="mt-2 font-display text-xl font-semibold tracking-tight text-foreground">
                      {ponto.titulo}
                    </h2>
                  </div>

                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    {ponto.prioridade}
                  </span>
                </div>

                {ponto.descricao && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {ponto.descricao}
                  </p>
                )}

                <div className="mt-5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full border border-border px-2.5 py-1">
                    {ponto.estado}
                  </span>
                  <span className="rounded-full border border-border px-2.5 py-1">
                    Voto: {ponto.sentidoVoto}
                  </span>
                  {ponto.tempoEstimado && (
                    <span className="rounded-full border border-border px-2.5 py-1">
                      {ponto.tempoEstimado} min
                    </span>
                  )}
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
    </>
  );
}