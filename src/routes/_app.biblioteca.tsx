import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Archive,
  BookOpen,
  CheckCircle2,
  FileText,
  Inbox,
  Landmark,
  NotebookText,
} from "lucide-react";
import { AdicionarBibliotecaWizard } from "@/components/biblioteca/AdicionarBibliotecaWizard";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/cards";
import { StatusBadge } from "@/components/ui/common";
import { EmptyState } from "@/components/ui/feedback";
import {
  WorkspaceHeader,
  WorkspaceLayout,
  WorkspaceMetrics,
  WorkspaceSection,
} from "@/components/ui/workspace";
import { useAssembleias } from "@/lib/assembleias-store";
import { listarDossiesAssociadosAoDocumento } from "@/lib/dossie-documentos-store";
import { useDossies } from "@/lib/dossies-store";
import { listarDocumentosLocais } from "@/lib/documentos-store";
import { obterInboxDocumento, useInboxDocumentos } from "@/lib/inbox-store";
import type { Documento } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/biblioteca")({
  head: () => ({
    meta: [
      { title: "Biblioteca — Tribuno" },
      {
        name: "description",
        content: "Documentos, leis, atas e referências do mandato.",
      },
    ],
  }),
  component: BibliotecaPage,
});

const separadores = [
  { id: "todos", label: "Todos" },
  { id: "por-tratar", label: "Por tratar" },
  { id: "leis", label: "Leis e regulamentos" },
  { id: "programas", label: "Programas eleitorais" },
  { id: "atas", label: "Atas" },
  { id: "relatorios", label: "Relatórios" },
  { id: "outros", label: "Outros" },
] as const;

type SeparadorId = (typeof separadores)[number]["id"];
type EstadoBiblioteca = "por tratar" | "analisado" | "arquivado";

function documentosUnicos(documentos: Documento[]) {
  const porId = new Map<string, Documento>();
  documentos.forEach((documento) => porId.set(documento.id, documento));
  return Array.from(porId.values()).sort((a, b) => b.data.localeCompare(a.data));
}

function formatarData(data?: string) {
  if (!data) return "Sem data";

  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(data));
}

function estadoDocumento(documento: Documento): EstadoBiblioteca {
  const inbox = obterInboxDocumento(documento.id);

  if (inbox.archivedAt || documento.estado === "Arquivado") return "arquivado";
  if (inbox.estado === "Tratado" || documento.estado === "Revisto") return "analisado";
  return "por tratar";
}

function estadoTone(estado: EstadoBiblioteca) {
  if (estado === "analisado") return "success";
  if (estado === "arquivado") return "muted";
  return "warning";
}

function categoriaDocumento(documento: Documento): SeparadorId {
  const categoria = documento.notas?.match(/\[Biblioteca: ([^\]]+)\]/)?.[1];

  if (categoria === "Lei ou regulamento") return "leis";
  if (categoria === "Programa eleitoral") return "programas";
  if (categoria === "Ata") return "atas";
  if (categoria === "Relatório") return "relatorios";
  if (categoria === "Contrato" || categoria === "Notícia" || categoria === "Outro") return "outros";

  if (documento.tipo === "Ata") return "atas";
  if (documento.tipo === "Relatório") return "relatorios";
  if (documento.tipo === "Regulamento") return "leis";
  if (documento.tipo === "Outro") return "outros";
  return "outros";
}

function BibliotecaPage() {
  const [separadorAtivo, setSeparadorAtivo] = useState<SeparadorId>("todos");
  const inboxItems = useInboxDocumentos();
  const assembleias = useAssembleias();
  const dossies = useDossies();

  const documentos = documentosUnicos(listarDocumentosLocais());

  const documentosComEstado = documentos.map((documento) => ({
    documento,
    estado: estadoDocumento(documento),
  }));

  const porTratar = documentosComEstado.filter((item) => item.estado === "por tratar").length;
  const analisados = documentosComEstado.filter((item) => item.estado === "analisado").length;
  const arquivados = documentosComEstado.filter((item) => item.estado === "arquivado").length;

  const documentosVisiveis = documentosComEstado.filter(({ documento, estado }) => {
    if (separadorAtivo === "todos") return true;
    if (separadorAtivo === "por-tratar") return estado === "por tratar";
    return categoriaDocumento(documento) === separadorAtivo;
  });

  function nomeSessao(documento: Documento) {
    const inbox = obterInboxDocumento(documento.id);
    const assembleiaId = inbox.assembleiaId ?? documento.assembleiaId;
    return assembleias.find((assembleia) => assembleia.id === assembleiaId)?.nome;
  }

  function nomeAssunto(documento: Documento) {
    const inbox = obterInboxDocumento(documento.id);
    const relacao = listarDossiesAssociadosAoDocumento(documento.id)[0];
    const dossieId = inbox.dossieId ?? relacao?.dossieId;
    return dossies.find((dossie) => dossie.id === dossieId)?.titulo;
  }

  function contagemSeparador(separador: SeparadorId) {
    if (separador === "todos") return documentos.length;
    if (separador === "por-tratar") return porTratar;
    return documentos.filter((documento) => categoriaDocumento(documento) === separador).length;
  }

  return (
    <>
      <TopBar breadcrumb="Biblioteca" />
      <main className="min-h-screen bg-transparent">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          <WorkspaceLayout
            header={
              <WorkspaceHeader
                icon={BookOpen}
                eyebrow="Biblioteca"
                title="Biblioteca"
                description="Documentos, leis, atas e referências do mandato."
                className="bg-card p-4 sm:p-7"
                actions={<AdicionarBibliotecaWizard />}
              />
            }
          >
            <WorkspaceMetrics>
              <MetricCard icon={FileText} label="Documentos" value={documentos.length} />
              <MetricCard icon={Inbox} label="Por tratar" value={porTratar} />
              <MetricCard icon={CheckCircle2} label="Analisados" value={analisados} />
              <MetricCard icon={Archive} label="Arquivados" value={arquivados} />
            </WorkspaceMetrics>

            <WorkspaceSection>
              <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                <div className="flex w-max min-w-full items-center gap-2 sm:w-auto sm:min-w-0 sm:flex-wrap">
                  {separadores.map((separador) => (
                    <button
                      key={separador.id}
                      type="button"
                      onClick={() => setSeparadorAtivo(separador.id)}
                      className={cn(
                        "inline-flex h-9 items-center gap-2 rounded-full px-3 text-sm font-medium transition-colors",
                        separadorAtivo === separador.id
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                      )}
                    >
                      {separador.label}
                      <span className="rounded-full bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground ring-1 ring-border/50">
                        {contagemSeparador(separador.id)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {documentosVisiveis.length === 0 ? (
                <EmptyState
                  className="mt-6"
                  title="Nada nesta vista"
                  description="Quando existirem documentos deste tipo, aparecerão aqui."
                />
              ) : (
                <div className="mt-6 grid gap-3">
                  {documentosVisiveis.map(({ documento, estado }) => {
                    const assunto = nomeAssunto(documento);
                    const sessao = nomeSessao(documento);

                    return (
                      <article
                        key={documento.id}
                        className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-card transition-colors hover:border-foreground/15"
                      >
                        <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/80 bg-muted/60 text-muted-foreground">
                              <FileText className="h-4 w-4" strokeWidth={1.75} />
                            </div>
                            <div className="min-w-0">
                              <h2 className="line-clamp-2 text-sm font-semibold leading-6 text-foreground">
                                {documento.titulo}
                              </h2>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <StatusBadge tone="muted" dot={false}>
                                  {documento.tipo}
                                </StatusBadge>
                                <StatusBadge tone={estadoTone(estado)}>{estado}</StatusBadge>
                                <StatusBadge tone="muted" dot={false}>
                                  {formatarData(documento.data)}
                                </StatusBadge>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                {assunto && (
                                  <span className="inline-flex items-center gap-1">
                                    <NotebookText className="h-3.5 w-3.5" />
                                    {assunto}
                                  </span>
                                )}
                                {sessao && (
                                  <span className="inline-flex items-center gap-1">
                                    <Landmark className="h-3.5 w-3.5" />
                                    {sessao}
                                  </span>
                                )}
                                {!assunto && !sessao && <span>Sem ligação</span>}
                              </div>
                            </div>
                          </div>

                          {sessao ? (
                            <Button
                              asChild
                              variant="secondary"
                              size="sm"
                              className="w-full lg:w-auto"
                            >
                              <Link
                                to="/sessoes/$id/documentos/$docId"
                                params={{ id: documento.assembleiaId, docId: documento.id }}
                              >
                                Abrir
                              </Link>
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              disabled
                              className="w-full lg:w-auto"
                            >
                              Abrir
                            </Button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </WorkspaceSection>
          </WorkspaceLayout>
        </div>
      </main>
    </>
  );
}
