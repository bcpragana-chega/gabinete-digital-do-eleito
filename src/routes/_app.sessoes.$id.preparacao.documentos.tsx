import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, FileText, ListChecks, SearchCheck } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { DocumentoCard } from "@/components/documentos/DocumentoCard";
import { AdicionarDocumentoSheet } from "@/components/documentos/AdicionarDocumentoSheet";
import { DashboardMetric } from "@/components/ui/DashboardMetric";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { PreparationGuidancePanel } from "@/components/preparacao/PreparationGuidancePanel";
import { useDocumentosDaAssembleia } from "@/lib/documentos-store";
import { useAssembleia } from "@/lib/assembleias-store";

export const Route = createFileRoute("/_app/sessoes/$id/preparacao/documentos")({
  head: () => ({
    meta: [
      { title: "Documentos — Preparação — Tribuno" },
      {
        name: "description",
        content: "Gestão dos documentos da preparação da sessão.",
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
            to="/sessoes"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Todas as sessões
          </Link>

          <EmptyState
            title="Sessão não encontrada"
            description="Esta área guarda os documentos de preparação da Sessão. A Sessão não está disponível neste dispositivo."
            action={<Button asChild><Link to="/sessoes">Ir para Sessões</Link></Button>}
          />
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar
        breadcrumb={
          <span>
            <Link to="/sessoes" className="hover:text-foreground transition-colors">
              Sessões
            </Link>
            <span className="mx-2 text-muted-foreground/60">/</span>
            <Link
              to="/sessoes/$id"
              params={{ id }}
              className="hover:text-foreground transition-colors"
            >
              {assembleia.nome}
            </Link>
            <span className="mx-2 text-muted-foreground/60">/</span>
            <Link
              to="/sessoes/$id/preparacao"
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
          to="/sessoes/$id/preparacao"
          params={{ id }}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Voltar à preparação
        </Link>

        <PageHeader
          icon={FileText}
          title="Documentos"
          description="Carregue aqui a convocatória, atas, relatórios e propostas para preparar a sessão com contexto completo."
          actions={<AdicionarDocumentoSheet assembleiaId={id} />}
        />

        <PreparationGuidancePanel assembleiaId={id} className="mb-6" />

        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <DashboardMetric
            label="Documentos carregados"
            value={documentos.length}
            icon={FileText}
            description={`${documentos.length === 1 ? "documento" : "documentos"} nesta preparação.`}
          />
          <DashboardMetric
            label="Pontos identificados"
            value="0"
            icon={ListChecks}
            description="Ainda não foram criados pontos da ordem de trabalhos."
          />
          <DashboardMetric label="Estado da análise" value="Por analisar" icon={SearchCheck} />
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
            <EmptyState
              title="Ainda não existem documentos nesta Sessão"
              description="Os documentos orientam decisões e intervenções. Adicione o primeiro documento para iniciar a análise."
              action={<AdicionarDocumentoSheet assembleiaId={id} />}
            />
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
