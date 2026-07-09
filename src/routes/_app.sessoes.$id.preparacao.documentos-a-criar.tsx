import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, FilePlus2, FileText } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { PreparationGuidancePanel } from "@/components/preparacao/PreparationGuidancePanel";
import { useAssembleia } from "@/lib/assembleias-store";
import {
  listarDocumentosACriarDaAssembleia,
  subscreverDocumentosACriar,
} from "@/lib/documentos-a-criar-store";
import {
  carregarPontosRemotosSeDisponivel,
  obterPontosDaAssembleia,
  type PontoOrdemTrabalhos,
} from "@/lib/pontos-store";
import type { DocumentoCriado } from "@/lib/types";

export const Route = createFileRoute("/_app/sessoes/$id/preparacao/documentos-a-criar")({
  head: () => ({
    meta: [
      { title: "Documentos a Criar — Preparação — Tribuno" },
      {
        name: "description",
        content: "Central de rascunhos e documentos a criar da sessão.",
      },
    ],
  }),
  component: DocumentosACriarPage,
});

function DocumentosACriarPage() {
  const { id } = Route.useParams();
  const assembleia = useAssembleia(id);
  const [rascunhos, setRascunhos] = useState<DocumentoCriado[]>([]);
  const [versaoPontos, setVersaoPontos] = useState(0);

  const pontos = useMemo(() => obterPontosDaAssembleia(id), [id, versaoPontos]);
  const pontosPorId = useMemo(() => new Map(pontos.map((ponto) => [ponto.id, ponto])), [pontos]);

  useEffect(() => {
    void carregarPontosRemotosSeDisponivel().finally(() => {
      setVersaoPontos((valor) => valor + 1);
    });

    function carregarRascunhos() {
      setRascunhos(listarDocumentosACriarDaAssembleia(id));
    }

    carregarRascunhos();
    return subscreverDocumentosACriar(carregarRascunhos);
  }, [id]);

  if (!assembleia) {
    return (
      <>
        <TopBar breadcrumb="Documentos a Criar" />
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
            description="Os rascunhos são organizados por Sessão para apoiar intervenções e propostas."
            action={
              <Button asChild>
                <Link to="/sessoes">Ir para Sessões</Link>
              </Button>
            }
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
            <span className="text-foreground">Documentos a Criar</span>
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
          icon={FilePlus2}
          eyebrow="Preparação"
          title="Documentos a Criar"
          description="Central dos rascunhos criados para esta sessão, incluindo moções, recomendações, requerimentos e declarações de voto."
        />

        <PreparationGuidancePanel assembleiaId={id} className="mb-6" />

        {rascunhos.length === 0 ? (
          <EmptyState
            title="Ainda não existem rascunhos nesta Sessão"
            description="Esta área concentra os documentos políticos que vai apresentar. Crie um rascunho num ponto da ordem de trabalhos para aparecer aqui."
            action={
              <Button asChild>
                <Link to="/sessoes/$id/preparacao/pontos" params={{ id }}>
                  Ir para Pontos
                </Link>
              </Button>
            }
          />
        ) : (
          <section className="grid gap-4">
            {rascunhos.map((rascunho) => (
              <DocumentoACriarCentralCard
                key={rascunho.id}
                assembleiaId={id}
                rascunho={rascunho}
                ponto={rascunho.pontoId ? pontosPorId.get(rascunho.pontoId) : undefined}
              />
            ))}
          </section>
        )}
      </main>
    </>
  );
}

function DocumentoACriarCentralCard({
  assembleiaId,
  rascunho,
  ponto,
}: {
  assembleiaId: string;
  rascunho: DocumentoCriado;
  ponto?: PontoOrdemTrabalhos;
}) {
  const content = (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-card transition-colors hover:border-primary/40">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <FileText className="h-4 w-4" strokeWidth={1.75} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {rascunho.tipo}
            </span>
            <StatusBadge tone="muted">{rascunho.estado}</StatusBadge>
          </div>

          <h2 className="mt-1 font-display text-lg font-semibold tracking-tight text-foreground">
            {rascunho.titulo}
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            {ponto
              ? `Ponto ${ponto.numero} · ${ponto.titulo}`
              : rascunho.assuntoId
                ? "Documento vindo de um assunto"
                : "Documento geral da assembleia"}
          </p>
        </div>
      </div>
    </article>
  );

  if (rascunho.assuntoId) {
    return (
      <Link
        to="/assuntos/$dossieId/documentos/$documentoId"
        params={{ dossieId: rascunho.assuntoId, documentoId: rascunho.id }}
        className="block"
      >
        {content}
      </Link>
    );
  }

  if (!ponto) {
    return (
      <Link
        to="/sessoes/$id/preparacao/documentos-a-criar/$rascunhoId"
        params={{
          id: assembleiaId,
          rascunhoId: rascunho.id,
        }}
        className="block"
      >
        {content}
      </Link>
    );
  }

  return (
    <Link
      to="/sessoes/$id/preparacao/pontos/$pontoId/rascunhos/$rascunhoId"
      params={{
        id: assembleiaId,
        pontoId: ponto.id,
        rascunhoId: rascunho.id,
      }}
      className="block"
    >
      {content}
    </Link>
  );
}
