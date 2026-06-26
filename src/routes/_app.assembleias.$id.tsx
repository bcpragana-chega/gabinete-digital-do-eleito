import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  Calendar,
  MapPin,
  Clock,
  ArrowRight,
  ChevronLeft,
  Sparkles,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DocumentoCard } from "@/components/documentos/DocumentoCard";
import { AdicionarDocumentoSheet } from "@/components/documentos/AdicionarDocumentoSheet";
import { getAssembleia, formatarData } from "@/lib/mock-data";
import { useDocumentosDaAssembleia } from "@/lib/documentos-store";

export const Route = createFileRoute("/_app/assembleias/$id")({
  loader: ({ params }) => {
    const assembleia = getAssembleia(params.id);
    if (!assembleia) throw notFound();
    return { assembleia };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.assembleia.nome ?? "Assembleia"} — Tribuno` },
      {
        name: "description",
        content:
          "Detalhe da sessão: documentos, preparação e acompanhamento da assembleia municipal.",
      },
    ],
  }),
  component: AssembleiaDetailPage,
});

function AssembleiaDetailPage() {
  const { id } = Route.useParams();
  const { assembleia } = Route.useLoaderData();
  const docs = useDocumentosDaAssembleia(id);

  return (
    <>
      <TopBar
        breadcrumb={
          <span>
            <Link to="/assembleias" className="hover:text-foreground transition-colors">
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

        <section className="rounded-2xl border border-border bg-card p-6 shadow-card mb-8">
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
        </section>

        <section>
          <div className="flex items-end justify-between mb-4 gap-4 flex-wrap">
            <div>
              <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
                Documentos da sessão
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {docs.length} documentos disponíveis
              </p>
            </div>
            <AdicionarDocumentoSheet assembleiaId={id} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {docs.map((d) => (
              <DocumentoCard key={d.id} documento={d} />
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
