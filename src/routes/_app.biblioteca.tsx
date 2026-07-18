import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BarChart3,
  ChevronRight,
  ClipboardList,
  FileText,
  Handshake,
  Landmark,
  Newspaper,
  NotebookText,
  Scale,
  Search,
  X,
  type LucideIcon,
} from "lucide-react";
import { AdicionarBibliotecaWizard } from "@/components/biblioteca/AdicionarBibliotecaWizard";
import { InstitutionalDocumentIntake } from "@/components/documentos/InstitutionalDocumentIntake";
import { TopBar } from "@/components/layout/TopBar";
import { StatusBadge } from "@/components/ui/common";
import { EmptyState } from "@/components/ui/feedback";
import { Input } from "@/components/ui/input";
import { WorkspaceLayout, WorkspacePage, WorkspaceSection } from "@/components/ui/workspace";
import { useAssembleias } from "@/lib/assembleias-store";
import {
  categoriaDocumentoBiblioteca,
  filtrarItensBiblioteca,
  ordenarItensBiblioteca,
  separadorDaCategoria,
  type CategoriaBiblioteca,
  type EstadoBiblioteca,
  type SeparadorBiblioteca,
} from "@/lib/biblioteca-ux";
import { listarDossiesAssociadosAoDocumento } from "@/lib/dossie-documentos-store";
import { useDossies } from "@/lib/dossies-store";
import { useDocumentos } from "@/lib/documentos-store";
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
  { id: "por-tratar", label: "Por analisar" },
  { id: "leis", label: "Leis e regulamentos" },
  { id: "programas", label: "Programas eleitorais" },
  { id: "atas", label: "Atas" },
  { id: "relatorios", label: "Relatórios" },
  { id: "outros", label: "Outros" },
] as const;

type SeparadorId = (typeof separadores)[number]["id"] & SeparadorBiblioteca;

const visuaisCategoria: Record<
  CategoriaBiblioteca,
  { icon: LucideIcon; label: CategoriaBiblioteca }
> = {
  "Lei ou regulamento": { icon: Scale, label: "Lei ou regulamento" },
  "Programa eleitoral": { icon: Landmark, label: "Programa eleitoral" },
  Ata: { icon: ClipboardList, label: "Ata" },
  Relatório: { icon: BarChart3, label: "Relatório" },
  Contrato: { icon: Handshake, label: "Contrato" },
  Notícia: { icon: Newspaper, label: "Notícia" },
  Outro: { icon: FileText, label: "Outro" },
};

function documentosUnicos(documentos: Documento[]) {
  const porId = new Map<string, Documento>();
  documentos.forEach((documento) => porId.set(documento.id, documento));
  return Array.from(porId.values());
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
  return "por analisar";
}

function estadoTone(estado: EstadoBiblioteca) {
  if (estado === "analisado") return "success";
  if (estado === "arquivado") return "muted";
  return "warning";
}

function BibliotecaPage() {
  const [separadorAtivo, setSeparadorAtivo] = useState<SeparadorId>("todos");
  const [pesquisa, setPesquisa] = useState("");
  useInboxDocumentos();
  const assembleias = useAssembleias();
  const dossies = useDossies();

  const documentos = documentosUnicos(useDocumentos());
  const itensBiblioteca = ordenarItensBiblioteca(
    documentos.map((documento) => ({
      documento,
      estado: estadoDocumento(documento),
      categoria: categoriaDocumentoBiblioteca(documento),
      assunto: nomeAssunto(documento),
      sessao: nomeSessao(documento),
    })),
  );

  const porTratar = itensBiblioteca.filter((item) => item.estado === "por analisar").length;

  const documentosVisiveis = filtrarItensBiblioteca(itensBiblioteca, {
    pesquisa,
    separador: separadorAtivo,
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
    return itensBiblioteca.filter((item) => separadorDaCategoria(item.categoria) === separador)
      .length;
  }

  function mensagemEstadoVazio() {
    if (documentos.length === 0) {
      return {
        title: "A Biblioteca ainda está vazia",
        description: "Adicione o primeiro documento para começar o arquivo do mandato.",
      };
    }

    if (pesquisa.trim()) {
      return {
        title: "Nenhum documento encontrado",
        description: "Experimente outro termo ou selecione um filtro diferente.",
      };
    }

    if (separadorAtivo === "por-tratar") {
      return {
        title: "Não há documentos por analisar",
        description: "Os documentos pendentes de análise aparecerão aqui.",
      };
    }

    return {
      title: "Sem documentos nesta categoria",
      description: "Escolha outro filtro para consultar o arquivo.",
    };
  }

  const estadoVazio = mensagemEstadoVazio();
  const pesquisaAtiva = pesquisa.trim().length > 0;

  return (
    <>
      <TopBar
        breadcrumb="Biblioteca"
        actions={
          <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
            <AdicionarBibliotecaWizard />
            <div className="[&>button]:w-full sm:[&>button]:w-auto">
              <InstitutionalDocumentIntake
                triggerLabel="Compreender PDF"
                triggerVariant="secondary"
              />
            </div>
          </div>
        }
      />
      <WorkspacePage>
        <WorkspaceLayout>
          <WorkspaceSection>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-xl">
                <label htmlFor="pesquisa-biblioteca" className="sr-only">
                  Pesquisar na Biblioteca
                </label>
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="pesquisa-biblioteca"
                  type="search"
                  value={pesquisa}
                  onChange={(event) => setPesquisa(event.target.value)}
                  placeholder="Pesquisar por título, tipo, Assunto ou Sessão"
                  className="bg-background pl-9 pr-10"
                />
                {pesquisaAtiva && (
                  <button
                    type="button"
                    onClick={() => setPesquisa("")}
                    aria-label="Limpar pesquisa"
                    className="absolute right-1.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="shrink-0 text-sm text-muted-foreground" aria-live="polite">
                {pesquisaAtiva
                  ? `${documentosVisiveis.length} de ${documentos.length}`
                  : `${documentos.length} ${documentos.length === 1 ? "documento" : "documentos"}`}
              </p>
            </div>

            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <div className="mt-4 flex w-max min-w-full items-center gap-2 sm:w-auto sm:min-w-0 sm:flex-wrap">
                {separadores.map((separador) => (
                  <button
                    key={separador.id}
                    type="button"
                    onClick={() => setSeparadorAtivo(separador.id)}
                    aria-pressed={separadorAtivo === separador.id}
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
                title={estadoVazio.title}
                description={estadoVazio.description}
              />
            ) : (
              <div className="mt-6 grid gap-3">
                {documentosVisiveis.map(({ documento, estado, categoria, assunto, sessao }) => {
                  const CategoriaIcon = visuaisCategoria[categoria].icon;

                  return (
                    <article
                      key={documento.id}
                      className="group relative min-w-0 rounded-2xl border border-border bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md"
                    >
                      <Link
                        to="/biblioteca/documentos/$docId"
                        params={{ docId: documento.id }}
                        aria-label={`Abrir documento: ${documento.titulo}`}
                        className="absolute inset-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2"
                      />

                      <div className="pointer-events-none relative flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border/80 bg-muted/60 text-muted-foreground transition-colors group-hover:text-foreground">
                            <CategoriaIcon className="h-5 w-5" strokeWidth={1.75} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-muted-foreground">
                              {visuaisCategoria[categoria].label}
                            </p>
                            <h2 className="mt-0.5 line-clamp-2 text-base font-semibold leading-6 text-foreground sm:text-[17px]">
                              {documento.titulo}
                            </h2>

                            <div className="mt-3 flex flex-wrap gap-2 text-xs">
                              {assunto && (
                                <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted/60 px-2.5 py-1.5 font-medium text-foreground/80">
                                  <NotebookText className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="line-clamp-1">{assunto}</span>
                                </span>
                              )}
                              {sessao && (
                                <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted/60 px-2.5 py-1.5 font-medium text-foreground/80">
                                  <Landmark className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="line-clamp-1">{sessao}</span>
                                </span>
                              )}
                              {!assunto && !sessao && (
                                <span className="py-1 text-muted-foreground">
                                  Sem ligação institucional
                                </span>
                              )}
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                              <StatusBadge tone="muted" dot={false}>
                                {documento.tipo}
                              </StatusBadge>
                              <StatusBadge tone={estadoTone(estado)}>{estado}</StatusBadge>
                              <StatusBadge tone="muted" dot={false}>
                                {formatarData(documento.data)}
                              </StatusBadge>
                            </div>
                          </div>
                        </div>

                        <div className="relative z-10 flex w-full items-center justify-between gap-2 lg:w-auto lg:justify-end">
                          {documento.ficheiroTipo === "application/pdf" &&
                            documento.estadoAnalise !== "confirmado" && (
                              <div className="pointer-events-auto">
                                <InstitutionalDocumentIntake documentoInicial={documento} />
                              </div>
                            )}
                          <span className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                            Abrir documento
                            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                          </span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </WorkspaceSection>
        </WorkspaceLayout>
      </WorkspacePage>
    </>
  );
}
