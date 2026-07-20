import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Search, X } from "lucide-react";
import { AdicionarBibliotecaWizard } from "@/components/biblioteca/AdicionarBibliotecaWizard";
import { InstitutionalDocumentIntake } from "@/components/documentos/InstitutionalDocumentIntake";
import { useProductHelpPageState } from "@/components/help/ProductHelpPageState";
import { TopBar } from "@/components/layout/TopBar";
import { StatusBadge } from "@/components/ui/common";
import { EmptyState } from "@/components/ui/feedback";
import { Input } from "@/components/ui/input";
import { WorkspacePage } from "@/components/ui/workspace";
import { useAssembleias } from "@/lib/assembleias-store";
import {
  categoriaDocumentoBiblioteca,
  filtrarItensBiblioteca,
  ordenarItensBiblioteca,
  separadorDaCategoria,
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
  { id: "por-tratar", label: "Por rever" },
  { id: "leis", label: "Leis e regulamentos" },
  { id: "programas", label: "Programas eleitorais" },
  { id: "atas", label: "Atas" },
  { id: "relatorios", label: "Relatórios" },
  { id: "outros", label: "Outros" },
] as const;

type SeparadorId = (typeof separadores)[number]["id"] & SeparadorBiblioteca;

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
  if (documento.archivedAt) return "Arquivado";
  if (documento.estado === "Revisto") return "Revisto";
  return "Por rever";
}

function estadoTone(estado: EstadoBiblioteca) {
  if (estado === "Revisto") return "success";
  if (estado === "Arquivado") return "muted";
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

  const porTratar = itensBiblioteca.filter((item) => item.estado === "Por rever").length;

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
        title: "Não há documentos por rever",
        description: "Os documentos pendentes de revisão humana aparecerão aqui.",
      };
    }

    return {
      title: "Sem documentos nesta categoria",
      description: "Escolha outro filtro para consultar o arquivo.",
    };
  }

  const estadoVazio = mensagemEstadoVazio();
  const pesquisaAtiva = pesquisa.trim().length > 0;

  useProductHelpPageState({
    emptyState: documentosVisiveis.length === 0,
    primaryAction: "Adicionar e analisar PDF",
    currentStatus: documentos.length === 0 ? "Por iniciar" : "Com documentos",
    nextStep:
      documentos.length === 0
        ? "Adicionar um documento ou analisar e organizar um PDF"
        : porTratar > 0
          ? "Rever os documentos por rever"
          : "Pesquisar ou filtrar a Biblioteca",
    summaryFacts: [
      `${documentos.length} documentos na Biblioteca`,
      `${porTratar} documentos por rever`,
      `${documentosVisiveis.length} documentos visíveis no filtro atual`,
    ],
  });

  return (
    <>
      <TopBar
        title={`Biblioteca (${documentos.length})`}
        description=""
        actions={
          <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
            <div className="[&>button]:w-full sm:[&>button]:w-auto">
              <InstitutionalDocumentIntake
                triggerLabel="Adicionar e analisar PDF"
                triggerVariant="primary"
              />
            </div>
            <AdicionarBibliotecaWizard />
          </div>
        }
        showUtilities={false}
      />

      <div className="sticky top-14 z-30 border-b border-border/60 bg-background/95 backdrop-blur-lg md:top-16">
        <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center gap-2 px-4 py-2 sm:px-5 lg:px-6">
          <div className="order-1 relative w-full sm:max-w-sm">
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
              className="h-8 bg-background/0 pl-9 pr-10 text-xs"
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

          <p className="order-2 ml-auto shrink-0 text-xs text-muted-foreground" aria-live="polite">
            {pesquisaAtiva ? `${documentosVisiveis.length} de ${documentos.length}` : ""}
          </p>

          <div className="order-3 -mx-1 flex min-w-0 flex-1 basis-full items-center gap-0.5 overflow-x-auto px-1">
            {separadores.map((separador) => (
              <button
                key={separador.id}
                type="button"
                onClick={() => setSeparadorAtivo(separador.id)}
                aria-pressed={separadorAtivo === separador.id}
                className={cn(
                  "inline-flex h-7 shrink-0 items-center gap-1.5 rounded px-2 text-xs font-medium transition-colors",
                  separadorAtivo === separador.id
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                {separador.label}
                <span className="text-[10px] font-normal tabular-nums text-muted-foreground">
                  {contagemSeparador(separador.id)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <WorkspacePage>
        <section aria-label="Lista de documentos">
          {documentosVisiveis.length === 0 ? (
            <EmptyState title={estadoVazio.title} description={estadoVazio.description} />
          ) : (
            <DocumentosList itens={documentosVisiveis} />
          )}
        </section>
      </WorkspacePage>
    </>
  );
}

type ItemBiblioteca = ReturnType<typeof ordenarItensBiblioteca>[number];

const listGrid =
  "grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 md:grid-cols-[minmax(14rem,2fr)_minmax(8rem,.9fr)_minmax(10rem,1.2fr)_minmax(7rem,.7fr)_minmax(8rem,.8fr)]";

function DocumentosList({ itens }: { itens: ItemBiblioteca[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border/70 bg-card">
      <div
        className={cn(
          listGrid,
          "hidden min-h-8 items-center border-b border-border/70 bg-muted/25 px-3 text-[10px] font-medium uppercase tracking-wide text-muted-foreground md:grid",
        )}
        aria-hidden="true"
      >
        <span>Documento</span>
        <span>Tipo</span>
        <span>Associado a</span>
        <span>Data</span>
        <span>Ação</span>
      </div>

      <div className="divide-y divide-border/60">
        {itens.map((item) => (
          <DocumentoRow key={item.documento.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function DocumentoRow({ item }: { item: ItemBiblioteca }) {
  const { documento, estado, categoria, assunto, sessao } = item;
  const acaoAbrir = estado === "Por rever" ? "Rever documento" : "Abrir documento";
  const podeAnalisar =
    documento.ficheiroTipo === "application/pdf" && documento.estadoAnalise !== "confirmado";
  const associacoes = [assunto, sessao].filter(Boolean).join(" · ") || "Sem associação";

  return (
    <article
      className={cn(
        listGrid,
        "group relative min-h-14 items-center gap-y-1.5 px-3 py-2.5 transition-colors hover:bg-muted/35 focus-within:bg-muted/45 md:min-h-12 md:py-2",
      )}
    >
      <Link
        to="/documentos/$documentoId"
        params={{ documentoId: documento.id }}
        search={{ origem: "biblioteca" }}
        aria-label={`Abrir documento: ${documento.titulo}`}
        className="absolute inset-0 z-0 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/30"
      />

      <div className="pointer-events-none relative min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          <h2 className="truncate text-sm font-semibold leading-5 text-foreground">
            {documento.titulo}
          </h2>
          <StatusBadge
            tone={estadoTone(estado)}
            className="hidden h-5 shrink-0 border-transparent bg-background/0 px-1.5 py-0 text-[10px] md:inline-flex"
          >
            {estado}
          </StatusBadge>
          {documento.importante && (
            <StatusBadge
              tone="warning"
              className="hidden h-5 shrink-0 border-transparent bg-background/0 px-1.5 py-0 text-[10px] lg:inline-flex"
            >
              Importante
            </StatusBadge>
          )}
        </div>
        <p className="truncate text-[11px] text-muted-foreground md:hidden">
          {categoria} · {documento.tipo}
        </p>
      </div>

      <StatusBadge
        tone={estadoTone(estado)}
        className="pointer-events-none relative h-5 max-w-32 justify-self-end truncate border-transparent bg-background/0 px-1.5 py-0 text-[10px] md:hidden"
      >
        {estado}
      </StatusBadge>

      <div className="pointer-events-none relative hidden min-w-0 md:block">
        <span className="block truncate text-xs text-foreground/80">{categoria}</span>
        <span className="block truncate text-[11px] text-muted-foreground">{documento.tipo}</span>
      </div>

      <span className="pointer-events-none relative hidden truncate text-xs text-muted-foreground md:block">
        {associacoes}
      </span>

      <time
        dateTime={documento.data}
        className="pointer-events-none relative hidden truncate text-xs tabular-nums text-muted-foreground md:block"
      >
        {formatarData(documento.data)}
      </time>

      <div className="relative z-10 col-span-2 flex min-w-0 items-center gap-2 md:col-span-1">
        {podeAnalisar && (
          <div className="shrink-0">
            <InstitutionalDocumentIntake documentoInicial={documento} />
          </div>
        )}
        <span className="pointer-events-none ml-auto inline-flex min-w-0 items-center gap-1 text-xs font-semibold text-foreground">
          <span className="truncate">{acaoAbrir}</span>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
        </span>
      </div>
    </article>
  );
}
