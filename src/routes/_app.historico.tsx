import { createFileRoute, Link } from "@tanstack/react-router";
import { TopBar } from "@/components/layout/TopBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatarData } from "@/lib/mock-data";
import { useDocumentosDaAssembleia } from "@/lib/documentos-store";
import { useAssembleias } from "@/lib/assembleias-store";

export const Route = createFileRoute("/_app/historico")({
  head: () => ({
    meta: [
      { title: "O que aconteceu — Tribuno" },
      {
        name: "description",
        content: "O que já aconteceu no mandato.",
      },
    ],
  }),
  component: HistoricoPage,
});

function HistoricoItem({ assembleia }: { assembleia: ReturnType<typeof useAssembleias>[number] }) {
  const docs = useDocumentosDaAssembleia(assembleia.id);

  return (
    <li className="mb-6 ml-6">
      <span className="absolute -left-1.5 mt-2 h-3 w-3 rounded-full border-2 border-background bg-primary" />
      <Link
        to="/sessoes/$id"
        params={{ id: assembleia.id }}
        className="block rounded-xl border border-border bg-card p-5 shadow-card hover:shadow-elevated hover:border-foreground/15 transition-all"
      >
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs text-muted-foreground">{formatarData(assembleia.data)}</span>
          <StatusBadge estado={assembleia.estado} />
        </div>
        <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
          {assembleia.nome}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {assembleia.local} · {docs.length} documentos
        </p>
      </Link>
    </li>
  );
}

function HistoricoPage() {
  const assembleias = useAssembleias();

  const historico = assembleias
    .filter((a) => a.estado === "concluida" || a.estado === "arquivada")
    .sort((a, b) => b.data.localeCompare(a.data));

  return (
    <>
      <TopBar breadcrumb="O que aconteceu" />
      <main className="px-8 py-10 max-w-4xl">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            O que aconteceu
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Sessões concluídas e arquivadas.</p>
        </div>

        {historico.length === 0 ? (
          <section className="rounded-2xl border border-border bg-card p-8 shadow-card">
            <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
              Ainda não há sessões concluídas
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              As sessões concluídas ou arquivadas aparecerão aqui automaticamente.
            </p>
          </section>
        ) : (
          <ol className="relative border-l border-border ml-3">
            {historico.map((a) => (
              <HistoricoItem key={a.id} assembleia={a} />
            ))}
          </ol>
        )}
      </main>
    </>
  );
}
