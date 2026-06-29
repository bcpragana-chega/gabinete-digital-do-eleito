import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ChevronLeft,
  FileText,
  ListChecks,
  SearchCheck,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { DocumentoCard } from "@/components/documentos/DocumentoCard";
import { AdicionarDocumentoSheet } from "@/components/documentos/AdicionarDocumentoSheet";
import { useDocumentosDaAssembleia } from "@/lib/documentos-store";
import { useAssembleia } from "@/lib/assembleias-store";

export const Route = createFileRoute(
  "/_app/assembleias/$id/preparacao/documentos",
)({
  head: () => ({
    meta: [
      { title: "Documentos — Preparação — Tribuno" },
      {
        name: "description",
        content: "Gestão dos documentos da preparação da assembleia.",
      },
    ],
  }),
  component: PreparacaoDocumentosPage,
});

function PreparacaoDocumentosPage() {
  const { id } = Route.useParams();
  const assembleia = useAssembleia(id);
  const documentos = useDocumentosDaAssembleia(id);

  if (!assembleia) {
    return (
      <>
        <TopBar breadcrumb="Documentos" />
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
            <span className="text-foreground">Documentos</span>
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
                <FileText className="h-5 w-5" strokeWidth={1.75} />
              </div>

              <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
                Documentos
              </h1>

              <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
                Carregue aqui a convocatória, atas, relatórios, propostas e
                restantes documentos necessários para preparar a assembleia.
              </p>
            </div>

            <AdicionarDocumentoSheet assembleiaId={id} />
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <FileText className="h-4 w-4" strokeWidth={1.75} />
              </div>

              <div>
                <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
                  Documentos carregados
                </h2>
                <p className="text-xs text-muted-foreground">
                  {documentos.length}{" "}
                  {documentos.length === 1 ? "documento" : "documentos"} nesta
                  preparação.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <ListChecks className="h-4 w-4" strokeWidth={1.75} />
              </div>

              <div>
                <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
                  Pontos identificados
                </h2>
                <p className="text-xs text-muted-foreground">
                  Ainda não foram criados pontos da ordem de trabalhos.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <SearchCheck className="h-4 w-4" strokeWidth={1.75} />
              </div>

              <div>
                <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
                  Estado da análise
                </h2>
                <p className="text-xs text-muted-foreground">
                  Por analisar.
                </p>
              </div>
            </div>
          </section>
        </div>

        <section>
          <div className="flex items-end justify-between mb-4 gap-4 flex-wrap">
            <div>
              <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
                Documentos da preparação
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {documentos.length} documentos disponíveis
              </p>
            </div>
          </div>

          {documentos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-8 shadow-card">
              <h3 className="font-display text-xl font-semibold tracking-tight text-foreground">
                Ainda não existem documentos
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Comece por carregar a convocatória, atas, relatórios ou propostas
                que pretende analisar.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {documentos.map((documento) => (
                <DocumentoCard key={documento.id} documento={documento} />
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}