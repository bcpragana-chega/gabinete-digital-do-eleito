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
import { DocumentoEstadoBadge } from "@/components/documentos/DocumentoEstadoBadge";
import { DocumentoPreview } from "@/components/documentos/DocumentoPreview";
import { getAssembleia, formatarData } from "@/lib/mock-data";
import { useDocumento } from "@/lib/documentos-store";

export const Route = createFileRoute("/_app/assembleias/$id/documentos/$docId")({
  loader: ({ params }) => {
    const assembleia = getAssembleia(params.id);
    if (!assembleia) throw notFound();
    return { assembleia };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.assembleia.nome ?? "Documento"} — Tribuno` },
      {
        name: "description",
        content: "Detalhe do documento da assembleia municipal.",
      },
    ],
  }),
  component: DocumentoPage,
});

function DocumentoPage() {
  const { id, docId } = Route.useParams();
  const { assembleia } = Route.useLoaderData();
  const documento = useDocumento(docId);

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
            <span className="text-foreground truncate">
              {documento?.tipo ?? "Documento"}
            </span>
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

        {!documento ? (
          <section className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
            Documento não encontrado.
          </section>
        ) : (
          <>
            <section className="rounded-2xl border border-border bg-card p-6 shadow-card mb-8">
              <div className="flex items-start gap-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <FileText className="h-6 w-6" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {documento.tipo}
                    </span>
                    <DocumentoEstadoBadge estado={documento.estado} />
                  </div>
                  <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-foreground">
                    {documento.titulo}
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Data do documento: {formatarData(documento.data)}
                    {typeof documento.paginas === "number"
                      ? ` · ${documento.paginas} páginas`
                      : ""}
                    {documento.ficheiroNome
                      ? ` · ${documento.ficheiroNome}`
                      : ""}
                  </p>
                  {documento.notas && (
                    <p className="mt-3 text-sm text-foreground/80 whitespace-pre-line">
                      {documento.notas}
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-6 shadow-card mb-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <FileText className="h-4 w-4" strokeWidth={1.75} />
                </div>
                <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
                  Pré-visualização
                </h2>
              </div>
              <DocumentoPreview ficheiroNome={documento.ficheiroNome} />
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
          </>
        )}
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
