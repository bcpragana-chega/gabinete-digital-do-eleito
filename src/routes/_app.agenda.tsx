import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Clock, Landmark, MapPin } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { EntityCard } from "@/components/ui/cards";
import { SectionTitle, StatusBadge } from "@/components/ui/common";
import { EmptyState } from "@/components/ui/feedback";
import { WorkspaceHeader, WorkspaceLayout, WorkspaceSection } from "@/components/ui/workspace";
import { useAssembleias } from "@/lib/assembleias-store";
import { formatarData } from "@/lib/mock-data";

export const Route = createFileRoute("/_app/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda — Tribuno" },
      {
        name: "description",
        content: "Próximas datas importantes do mandato.",
      },
    ],
  }),
  component: AgendaPage,
});

function AgendaPage() {
  const hoje = new Date().toISOString().slice(0, 10);
  const assembleias = useAssembleias();
  const proximas = assembleias
    .filter((assembleia) => assembleia.data >= hoje && assembleia.estado !== "arquivada")
    .sort((a, b) => `${a.data}T${a.hora}`.localeCompare(`${b.data}T${b.hora}`));

  return (
    <>
      <TopBar breadcrumb="Agenda" />
      <main className="min-h-screen bg-transparent">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          <WorkspaceLayout
            header={
              <WorkspaceHeader
                icon={CalendarDays}
                eyebrow="Agenda"
                title="Agenda"
                description="Próximas datas que precisam da sua atenção."
                className="bg-card p-4 sm:p-7"
              />
            }
          >
            <WorkspaceSection>
              <SectionTitle
                icon={CalendarDays}
                title="Próximas sessões"
                description="Datas importantes já registadas."
              />
              {proximas.length === 0 ? (
                <EmptyState
                  className="mt-5"
                  title="Ainda não existem sessões na Agenda"
                  description="A Agenda ajuda a antecipar preparação e prazos. Crie ou atualize uma Sessão para ver as próximas datas aqui."
                  action={
                    <Button asChild>
                      <Link to="/sessoes">Ir para Sessões</Link>
                    </Button>
                  }
                />
              ) : (
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  {proximas.map((assembleia) => (
                    <EntityCard
                      key={assembleia.id}
                      icon={Landmark}
                      eyebrow={formatarData(assembleia.data)}
                      title={assembleia.nome}
                      description={assembleia.local}
                      meta={
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge tone="muted" dot={false}>
                            <Clock className="h-3 w-3" />
                            {assembleia.hora}
                          </StatusBadge>
                          <StatusBadge tone="muted" dot={false}>
                            <MapPin className="h-3 w-3" />
                            {assembleia.local}
                          </StatusBadge>
                        </div>
                      }
                      actions={
                        <Button asChild variant="secondary" size="sm">
                          <Link to="/sessoes/$id" params={{ id: assembleia.id }}>
                            Abrir
                          </Link>
                        </Button>
                      }
                    />
                  ))}
                </div>
              )}
            </WorkspaceSection>
          </WorkspaceLayout>
        </div>
      </main>
    </>
  );
}
