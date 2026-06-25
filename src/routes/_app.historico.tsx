import { createFileRoute, Link } from "@tanstack/react-router";
import { TopBar } from "@/components/layout/TopBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { assembleias, formatarData, getDocumentosByAssembleia } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/historico")({
  head: () => ({
    meta: [
      { title: "Histórico — Tribuno" },
      {
        name: "description",
        content: "Cronologia das assembleias municipais já realizadas.",
      },
    ],
  }),
  component: HistoricoPage,
});

function HistoricoPage() {
  const concluidas = assembleias
    .filter((a) => a.estado === "concluida")
    .sort((a, b) => b.data.localeCompare(a.data));

  return (
    <>
      <TopBar breadcrumb="Histórico" />
      <main className="px-8 py-10 max-w-4xl">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Histórico
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Cronologia das assembleias já concluídas.
          </p>
        </div>

        <ol className="relative border-l border-border ml-3">
          {concluidas.map((a) => (
            <li key={a.id} className="mb-6 ml-6">
              <span className="absolute -left-1.5 mt-2 h-3 w-3 rounded-full border-2 border-background bg-primary" />
              <Link
                to="/assembleias/$id"
                params={{ id: a.id }}
                className="block rounded-xl border border-border bg-card p-5 shadow-card hover:shadow-elevated hover:border-foreground/15 transition-all"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs text-muted-foreground">
                    {formatarData(a.data)}
                  </span>
                  <StatusBadge estado={a.estado} />
                </div>
                <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
                  {a.nome}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {a.local} · {getDocumentosByAssembleia(a.id).length} documentos
                </p>
              </Link>
            </li>
          ))}
        </ol>
      </main>
    </>
  );
}
