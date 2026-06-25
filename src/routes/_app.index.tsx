import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Calendar,
  MapPin,
  FileText,
  AlertCircle,
  ListChecks,
  Landmark,
  ArrowRight,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { StatCard } from "@/components/cards/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  getProximaAssembleia,
  getDocumentosByAssembleia,
  formatarData,
} from "@/lib/mock-data";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [
      { title: "Gabinete — Tribuno" },
      {
        name: "description",
        content:
          "Gabinete digital do eleito local: próxima assembleia, documentos, alertas e ações pendentes.",
      },
      { property: "og:title", content: "Gabinete — Tribuno" },
      {
        property: "og:description",
        content: "Gabinete digital para eleitos locais em Portugal.",
      },
    ],
  }),
  component: GabinetePage,
});

function diasAte(iso: string): number {
  const alvo = new Date(iso + "T00:00:00").getTime();
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((alvo - hoje.getTime()) / 86400000));
}

function GabinetePage() {
  const proxima = getProximaAssembleia();
  const numDocs = getDocumentosByAssembleia(proxima.id).length;

  return (
    <>
      <TopBar breadcrumb="Gabinete" />
      <main className="px-8 py-10 max-w-7xl">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Bom dia, João.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Aqui está o panorama do seu mandato esta semana.
          </p>
        </div>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-card mb-8">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Próxima Assembleia
                </span>
                <StatusBadge estado={proxima.estado} />
              </div>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
                {proxima.nome}
              </h2>
              <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" strokeWidth={1.75} />
                  <span>
                    {formatarData(proxima.data)} · {proxima.hora}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" strokeWidth={1.75} />
                  <span>{proxima.local}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" strokeWidth={1.75} />
                  <span>{numDocs} documentos carregados</span>
                </div>
              </dl>
            </div>
            <Link
              to="/assembleias/$id"
              params={{ id: proxima.id }}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Abrir Assembleia
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
          <StatCard icon={FileText} label="Documentos" value={numDocs} hint="Na próxima sessão" />
          <StatCard
            icon={AlertCircle}
            label="Alertas"
            value={3}
            hint="Requerem revisão"
            tone="alerta"
          />
          <StatCard
            icon={ListChecks}
            label="Ações Pendentes"
            value={7}
            hint="Para esta semana"
            tone="preparacao"
          />
          <StatCard
            icon={Landmark}
            label="Próxima Assembleia"
            value={diasAte(proxima.data)}
            hint="dias até à sessão"
            tone="analise"
          />
        </section>

        <section>
          <h3 className="font-display text-lg font-semibold tracking-tight text-foreground mb-4">
            Atividade recente
          </h3>
          <div className="rounded-xl border border-border bg-card divide-y divide-border shadow-card">
            {[
              {
                texto: "Convocatória adicionada à Assembleia de Julho",
                quando: "há 2 horas",
              },
              { texto: "Relatório Trimestral marcado para revisão", quando: "ontem" },
              { texto: "Ata da sessão de Abril foi aprovada", quando: "há 3 dias" },
              { texto: "PPI atualizado pela Câmara Municipal", quando: "há 5 dias" },
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-4 px-5 py-3.5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 shrink-0" />
                  <span className="text-sm text-foreground truncate">{item.texto}</span>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{item.quando}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
