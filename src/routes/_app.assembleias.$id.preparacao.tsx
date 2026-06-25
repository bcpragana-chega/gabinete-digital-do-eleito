import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ChevronLeft,
  Target,
  MessageCircleQuestion,
  ListChecks,
  FilePlus2,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { getAssembleia, formatarData } from "@/lib/mock-data";
import {
  acoesMock,
  documentosACriarMock,
  perguntasMock,
  prioridadesMock,
} from "@/lib/mock-preparacao";
import { SecaoPreparacao } from "@/components/preparacao/SecaoPreparacao";
import { PrioridadeCard } from "@/components/preparacao/PrioridadeCard";
import { PerguntaCard } from "@/components/preparacao/PerguntaCard";
import { AcaoCard } from "@/components/preparacao/AcaoCard";
import { DocumentoACriarCard } from "@/components/preparacao/DocumentoACriarCard";

export const Route = createFileRoute("/_app/assembleias/$id/preparacao")({
  loader: ({ params }) => {
    const assembleia = getAssembleia(params.id) ?? {
      id: params.id,
      nome: "Assembleia Municipal",
      data: "2026-07-14",
      hora: "21:00",
      local: "Salão Nobre dos Paços do Concelho",
      estado: "preparacao" as const,
    };
    return { assembleia };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: `Preparação — ${loaderData?.assembleia.nome ?? "Assembleia"} — Tribuno`,
      },
      {
        name: "description",
        content:
          "Prepare a assembleia: prioridades, perguntas sugeridas, ações pendentes e documentos a criar.",
      },
    ],
  }),
  component: PreparacaoPage,
});

function PreparacaoPage() {
  const { id } = Route.useParams();
  const { assembleia } = Route.useLoaderData();

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

        <div className="mb-10">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
            Preparação da Assembleia
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            {assembleia.nome}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {formatarData(assembleia.data)} · {assembleia.hora} · {assembleia.local}
          </p>
        </div>

        <SecaoPreparacao
          icon={Target}
          titulo="Prioridades da Assembleia"
          descricao="Os temas centrais que pretende defender nesta sessão."
          total={prioridadesMock.length}
        >
          {prioridadesMock.map((item) => (
            <PrioridadeCard key={item.id} item={item} />
          ))}
        </SecaoPreparacao>

        <SecaoPreparacao
          icon={MessageCircleQuestion}
          titulo="Perguntas sugeridas"
          descricao="Perguntas que poderá dirigir ao executivo durante a sessão."
          total={perguntasMock.length}
        >
          {perguntasMock.map((item) => (
            <PerguntaCard key={item.id} item={item} />
          ))}
        </SecaoPreparacao>

        <SecaoPreparacao
          icon={ListChecks}
          titulo="Ações pendentes"
          descricao="Tarefas a concluir antes da sessão."
          total={acoesMock.length}
        >
          {acoesMock.map((item) => (
            <AcaoCard key={item.id} item={item} />
          ))}
        </SecaoPreparacao>

        <SecaoPreparacao
          icon={FilePlus2}
          titulo="Documentos a criar"
          descricao="Moções, requerimentos e recomendações a apresentar."
          total={documentosACriarMock.length}
        >
          {documentosACriarMock.map((item) => (
            <DocumentoACriarCard key={item.id} item={item} />
          ))}
        </SecaoPreparacao>
      </main>
    </>
  );
}
