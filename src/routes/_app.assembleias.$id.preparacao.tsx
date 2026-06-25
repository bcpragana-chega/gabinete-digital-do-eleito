import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  ChevronLeft,
  Target,
  MessageCircleQuestion,
  ListChecks,
  FilePlus2,
  type LucideIcon,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { getAssembleia, formatarData } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/assembleias/$id/preparacao")({
  loader: ({ params }) => {
    const assembleia = getAssembleia(params.id);
    if (!assembleia) throw notFound();
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

const areas: {
  icon: LucideIcon;
  titulo: string;
  descricao: string;
  exemplos: string[];
}[] = [
  {
    icon: Target,
    titulo: "Prioridades",
    descricao: "Os temas centrais que pretende defender nesta sessão.",
    exemplos: [
      "Defesa da revisão do PPI",
      "Acompanhamento da execução orçamental",
      "Posicionamento sobre o orçamento suplementar",
    ],
  },
  {
    icon: MessageCircleQuestion,
    titulo: "Perguntas sugeridas",
    descricao: "Perguntas que poderá dirigir ao executivo durante a sessão.",
    exemplos: [
      "Qual a taxa de execução da despesa de capital?",
      "Quando entra em vigor o plano de mobilidade?",
      "Qual o ponto de situação das obras estruturantes?",
    ],
  },
  {
    icon: ListChecks,
    titulo: "Ações pendentes",
    descricao: "Tarefas a concluir antes da sessão.",
    exemplos: [
      "Rever ata da sessão anterior",
      "Reunir com o grupo municipal",
      "Validar dados da execução da receita",
    ],
  },
  {
    icon: FilePlus2,
    titulo: "Documentos a criar",
    descricao: "Moções, requerimentos e recomendações a apresentar.",
    exemplos: [
      "Moção sobre transportes escolares",
      "Requerimento sobre habitação acessível",
      "Recomendação sobre arborização urbana",
    ],
  },
];

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

        <div className="mb-8">
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

        <div className="grid gap-5 md:grid-cols-2">
          {areas.map((area) => {
            const Icon = area.icon;
            return (
              <section
                key={area.titulo}
                className="rounded-2xl border border-border bg-card p-6 shadow-card"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                  </div>
                  <div>
                    <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
                      {area.titulo}
                    </h2>
                    <p className="text-xs text-muted-foreground">{area.descricao}</p>
                  </div>
                </div>

                <ul className="space-y-2 mb-4">
                  {area.exemplos.map((ex, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2.5 rounded-md border border-dashed border-border bg-background/50 px-3 py-2.5 text-sm text-foreground"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground/50 shrink-0" />
                      <span>{ex}</span>
                    </li>
                  ))}
                </ul>

                <div className="text-xs text-muted-foreground italic">
                  Sugestões automáticas disponíveis em fase futura.
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </>
  );
}
