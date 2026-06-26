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
import { formatarData } from "@/lib/mock-data";
import { useAssembleias } from "@/lib/assembleias-store";
import { useDocumentosDaAssembleia } from "@/lib/documentos-store";

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
  const assembleias = useAssembleias();

  const ativas = assembleias.filter((a) => a.estado !== "arquivada");

  const proxima =
    ativas
      .filter((a) => a.estado !== "concluida")
      .sort((a, b) => `${a.data}T${a.hora}`.localeCompare(`${b.data}T${b.hora}`))[0] ??
    ativas
      .slice()
      .sort((a, b) => `${b.data}T${b.hora}`.localeCompare(`${a.data}T${a.hora}`))[0];

  const docsProxima = useDocumentosDaAssembleia(proxima?.id ?? "");

  const assembleiasEmPreparacao = ativas.filter((a) => a.estado === "preparacao").length;
  const assembleiasConcluidas = assembleias.filter((a) => a.estado === "concluida").length;
  const assembleiasArquivadas = assembleias.filter((a) => a.estado === "arquivada").length;

  const atividadeRecente = assembleias
    .slice()
    .sort((a, b) => `${b.data}T${b.hora}`.localeCompare(`${a.data}T${a.hora}`))
    .slice(0, 4);

  return (
    <>
      <TopBar breadcrumb="Gabinete" />
      <main className="px-8 py-10 max-w-7xl">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Bom dia, Benjamin.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Aqui está o panorama do seu mandato esta semana.
          </p>
        </div>

        {proxima ? (
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
                    <span>{docsProxima.length} documentos carregados</span>
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
        ) : (
          <section className="rounded-2xl border border-border bg-card p-6 shadow-card mb-8">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              Ainda não existem assembleias
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Crie a primeira assembleia para começar a organizar o mandato.
            </p>
          </section>
        )}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
          <StatCard
            icon={FileText}
            label="Documentos"
            value={docsProxima.length}
            hint="Na próxima sessão"
          />
          <StatCard
            icon={AlertCircle}
            label="Em preparação"
            value={assembleiasEmPreparacao}
            hint="Assembleias ativas"
            tone="preparacao"
          />
          <StatCard
            icon={ListChecks}
            label="Concluídas"
            value={assembleiasConcluidas}
            hint="No histórico"
            tone="analise"
          />
          <StatCard
            icon={Landmark}
            label="Arquivadas"
            value={assembleiasArquivadas}
            hint="Guardadas em histórico"
          />
        </section>

        <section>
          <h3 className="font-display text-lg font-semibold tracking-tight text-foreground mb-4">
            Atividade recente
          </h3>

          {atividadeRecente.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-5 shadow-card">
              <p className="text-sm text-muted-foreground">
                Ainda não existe atividade recente.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card divide-y divide-border shadow-card">
              {atividadeRecente.map((item) => (
                <Link
                  key={item.id}
                  to="/assembleias/$id"
                  params={{ id: item.id }}
                  className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 shrink-0" />
                    <span className="text-sm text-foreground truncate">{item.nome}</span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatarData(item.data)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}