import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  ChevronLeft,
  FileText,
  Sparkles,
  AlertCircle,
  Link as LinkIcon,
  type LucideIcon,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { getAssembleia, getDocumento, formatarData } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/assembleias/$id/documentos/$docId")({
  loader: ({ params }) => {
    const assembleia = getAssembleia(params.id);
    const documento = getDocumento(params.docId);
    if (!assembleia || !documento) throw notFound();
    return { assembleia, documento };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.documento.nome ?? "Documento"} — Tribuno` },
      {
        name: "description",
        content: "Detalhe do documento da assembleia municipal.",
      },
    ],
  }),
  component: DocumentoPage,
});

function DocumentoPage() {
  const { id } = Route.useParams();
  const { assembleia, documento } = Route.useLoaderData();

  return (
    <>
      <TopBar
        breadcrumb={
          <span>
            <Link to="/assembleias" className="hover:text-foreground transition-colors">
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
            <span className="text-foreground truncate">{documento.tipo}</span>
          </span>
        }
      />
      <main className="px-8 py-10 max-w-7xl">
        <Link
          to="/assembleias/$id"
          params={{ id }}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Voltar à assembleia
        </Link>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-card mb-8">
          <div className="flex items-start gap-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <FileText className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {documento.tipo}
              </div>
              <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-foreground">
                {documento.nome}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Data do documento: {formatarData(documento.data)} · {documento.paginas} páginas
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-3">
          <ReservedSection
            icon={Sparkles}
            titulo="Análise"
            descricao="A análise automática deste documento será disponibilizada em fase futura."
            className="lg:col-span-2"
          />
          <ReservedSection
            icon={AlertCircle}
            titulo="Alertas"
            descricao="Os alertas sobre prazos, valores e inconsistências serão apresentados aqui."
          />
          <ReservedSection
            icon={LinkIcon}
            titulo="Documentos relacionados"
            descricao="Documentos com ligação a este (anexos, atas, propostas) serão listados nesta área."
            className="lg:col-span-3"
          />
        </div>
      </main>
    </>
  );
}

function ReservedSection({
  icon: Icon,
  titulo,
  descricao,
  className = "",
}: {
  icon: LucideIcon;
  titulo: string;
  descricao: string;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-border bg-card p-6 shadow-card ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </div>
        <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
          {titulo}
        </h2>
      </div>
      <div className="rounded-lg border border-dashed border-border bg-background/50 px-5 py-8 text-center">
        <p className="text-sm text-muted-foreground">{descricao}</p>
        <p className="mt-2 text-xs text-muted-foreground/70 italic">Disponível em fase futura</p>
      </div>
    </section>
  );
}
