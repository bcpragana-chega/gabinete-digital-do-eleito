import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { ChevronLeft, FileText, ClipboardList, ListOrdered, FilePlus2 } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatarData } from "@/lib/mock-data";
import { useAssembleia } from "@/lib/assembleias-store";
import { PreparacaoAreaCard } from "@/components/preparacao/PreparacaoAreaCard";

export const Route = createFileRoute("/_app/assembleias/$id/preparacao")({
  head: () => ({
    meta: [
      { title: "Preparação — Assembleia — Tribuno" },
      {
        name: "description",
        content:
          "Prepare a assembleia: documentos, estratégia, pontos da ordem de trabalhos e documentos a criar.",
      },
    ],
  }),
  component: PreparacaoPage,
});

function PreparacaoPage() {
  const { id } = Route.useParams();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const assembleia = useAssembleia(id);

  const isSubRoute = pathname.includes(`/assembleias/${id}/preparacao/`);

  if (isSubRoute) {
    return <Outlet />;
  }

  if (!assembleia) {
    return (
      <>
        <TopBar breadcrumb="Preparação" />
        <main className="px-8 py-10 max-w-7xl">
          <Link
            to="/assembleias"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Todas as assembleias
          </Link>

          <EmptyState
            title="Assembleia não encontrada"
            description="Esta assembleia pode ter sido removida ou ainda não estar disponível neste navegador."
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
            <span className="text-foreground">Preparação</span>
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

        <PageHeader
          icon={ClipboardList}
          eyebrow="Preparação"
          title={assembleia.nome}
          description={`${formatarData(assembleia.data)} · ${assembleia.hora} · ${assembleia.local}`}
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <PreparacaoAreaCard
            icon={FileText}
            titulo="Documentos"
            descricao="Carregar, organizar e consultar os documentos da sessão."
            to="/assembleias/$id/preparacao/documentos"
            params={{ id }}
          />

          <PreparacaoAreaCard
            icon={ClipboardList}
            titulo="Estratégia da Sessão"
            descricao="Objetivos, mensagens-chave, riscos e notas gerais da assembleia."
            to="/assembleias/$id/preparacao/estrategia"
            params={{ id }}
          />

          <PreparacaoAreaCard
            icon={ListOrdered}
            titulo="Pontos da Ordem de Trabalhos"
            descricao="Preparar cada ponto com notas, perguntas, ações e documentos associados."
            to="/assembleias/$id/preparacao/pontos"
            params={{ id }}
          />

          <PreparacaoAreaCard
            icon={FilePlus2}
            titulo="Documentos a Criar"
            descricao="Moções, recomendações, requerimentos, declarações de voto e intervenções."
            to="/assembleias/$id/preparacao/documentos-a-criar"
            params={{ id }}
          />
        </div>
      </main>
    </>
  );
}
