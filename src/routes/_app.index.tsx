import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Calendar, FileText, Landmark, NotebookText } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { WorkspaceSection } from "@/components/ui/workspace";
import { formatarData } from "@/lib/mock-data";
import { useAssembleias } from "@/lib/assembleias-store";
import { useDocumentosDaAssembleia } from "@/lib/documentos-store";
import { useDossies } from "@/lib/dossies-store";
import { primeiroNome, saudacaoPorHora, useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [
      { title: "Hoje — Tribuno" },
      {
        name: "description",
        content: "O que precisa de fazer hoje: sessões, documentos e assuntos importantes.",
      },
      { property: "og:title", content: "Hoje — Tribuno" },
      {
        property: "og:description",
        content: "Apoio ao mandato para eleitos locais em Portugal.",
      },
    ],
  }),
  component: GabinetePage,
});

const agenda = [
  { periodo: "Hoje", texto: "Rever documentos recebidos" },
  { periodo: "Amanhã", texto: "Preparar próxima sessão" },
  { periodo: "Esta semana", texto: "Atualizar assuntos prioritários" },
];

function GabinetePage() {
  const { displayName } = useAuth();
  const assembleias = useAssembleias();
  const dossiesAtivos = useDossies()
    .filter((dossie) => !dossie.archivedAt)
    .slice(0, 4);
  const ativas = assembleias.filter((assembleia) => assembleia.estado !== "arquivada");
  const proxima =
    ativas
      .filter((assembleia) => assembleia.estado !== "concluida")
      .sort((a, b) => `${a.data}T${a.hora}`.localeCompare(`${b.data}T${b.hora}`))[0] ??
    ativas.slice().sort((a, b) => `${b.data}T${b.hora}`.localeCompare(`${a.data}T${a.hora}`))[0];

  const documentos = useDocumentosDaAssembleia(proxima?.id ?? "");
  const documentosPorAnalisar = documentos.length;
  const acoesImportantes = [proxima, documentosPorAnalisar > 0, dossiesAtivos.length > 0].filter(
    Boolean,
  ).length;

  return (
    <>
      <TopBar breadcrumb="Hoje" />
      <main className="min-h-screen bg-background">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-9">
          <header className="max-w-2xl">
            <h1 className="font-display text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
              {saudacaoPorHora()}, {primeiroNome(displayName)}.
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {acoesImportantes > 0
                ? `Hoje tens ${acoesImportantes} ${acoesImportantes === 1 ? "ação importante" : "ações importantes"}.`
                : "Começa por criar a tua primeira sessão ou assunto."}
            </p>
          </header>

          <Card className="overflow-hidden p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
                  <Landmark className="h-4 w-4" strokeWidth={1.75} />
                  Fazer agora
                </div>
                <h2 className="line-clamp-2 break-words font-display text-xl font-semibold leading-7 text-foreground sm:text-2xl">
                  {proxima ? proxima.nome : "Criar primeira sessão"}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  {proxima
                    ? `${documentosPorAnalisar} documentos por analisar antes da preparação.`
                    : "Ainda não existem sessões nesta conta."}
                </p>
              </div>

              {proxima ? (
                <Button asChild size="lg" className="w-full sm:w-auto sm:min-w-36">
                  <Link to="/assembleias/$id" params={{ id: proxima.id }}>
                    Continuar
                    <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
                  </Link>
                </Button>
              ) : (
                <Button asChild size="lg" className="w-full sm:w-auto sm:min-w-36">
                  <Link to="/assembleias">
                    Criar sessão
                    <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
                  </Link>
                </Button>
              )}
            </div>
          </Card>

          <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-5">
              <WorkspaceSection title="A seguir">
                <div className="grid gap-3 sm:grid-cols-2">
                  <NextActionCard
                    icon={FileText}
                    title="Rever documentos"
                    description={
                      documentosPorAnalisar > 0
                        ? `${documentosPorAnalisar} documentos aguardam análise.`
                        : "Não há documentos por rever."
                    }
                    to={proxima ? "/assembleias/$id" : "/caixa-de-entrada"}
                    params={proxima ? { id: proxima.id } : undefined}
                  />
                  <NextActionCard
                    icon={NotebookText}
                    title="Atualizar assunto"
                    description="Registar evolução num tema em acompanhamento."
                    to="/dossies"
                  />
                </div>
              </WorkspaceSection>

              <WorkspaceSection title="Assuntos em acompanhamento">
                <div className="grid gap-3 sm:grid-cols-2">
                  {dossiesAtivos.length === 0 ? (
                    <Link
                      to="/dossies"
                      className="group min-w-0 rounded-2xl border border-border/80 bg-muted/25 p-4 transition-colors hover:bg-muted/40 sm:col-span-2"
                    >
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold text-foreground">
                            Criar primeiro assunto
                          </h3>
                          <p className="mt-1 truncate text-sm leading-6 text-muted-foreground">
                            Ainda não existem assuntos nesta conta.
                          </p>
                        </div>
                        <ArrowRight
                          className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                          strokeWidth={1.75}
                        />
                      </div>
                    </Link>
                  ) : (
                    dossiesAtivos.map((dossie) => (
                      <Link
                        key={dossie.id}
                        to="/dossies"
                        className="group min-w-0 rounded-2xl border border-border/80 bg-muted/25 p-4 transition-colors hover:bg-muted/40"
                      >
                        <div className="flex min-w-0 items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-semibold text-foreground">
                              {dossie.titulo}
                            </h3>
                            <p className="mt-1 truncate text-sm leading-6 text-muted-foreground">
                              {dossie.resumo || "Assunto em acompanhamento."}
                            </p>
                          </div>
                          <ArrowRight
                            className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                            strokeWidth={1.75}
                          />
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </WorkspaceSection>
            </div>

            <WorkspaceSection title="Próximas sessões" className="lg:self-start">
              <div className="space-y-0">
                {agenda.map((item) => (
                  <div
                    key={item.periodo}
                    className="relative border-l border-border pb-5 pl-4 last:pb-0"
                  >
                    <span className="absolute -left-1.5 top-1 h-3 w-3 rounded-full border border-border bg-card" />
                    <div className="text-xs font-medium text-muted-foreground">{item.periodo}</div>
                    <p className="mt-1 text-sm leading-6 text-foreground">{item.texto}</p>
                  </div>
                ))}
                {proxima && (
                  <div className="mt-4 rounded-2xl border border-border/80 bg-muted/25 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Calendar className="h-4 w-4" strokeWidth={1.75} />
                      Próxima sessão
                    </div>
                    <p className="mt-2 line-clamp-2 break-words text-sm font-semibold leading-6 text-foreground">
                      {formatarData(proxima.data)} · {proxima.hora}
                    </p>
                  </div>
                )}
              </div>
            </WorkspaceSection>
          </section>
        </div>
      </main>
    </>
  );
}

type NextActionCardProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  to: string;
  params?: Record<string, string>;
};

function NextActionCard({ icon: Icon, title, description, to, params }: NextActionCardProps) {
  return (
    <Card className="flex min-w-0 flex-col border-border/80 bg-muted/25 p-4 shadow-none transition-colors hover:bg-muted/40">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-border/80 bg-muted/40 text-muted-foreground">
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-foreground">{title}</h3>
          <p className="mt-1 line-clamp-2 break-words text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      <Button asChild variant="secondary" className={cn("mt-4 w-full justify-center sm:w-fit")}>
        <Link to={to as never} params={params as never}>
          Abrir
          <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
        </Link>
      </Button>
    </Card>
  );
}
