import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarDays,
  ChevronLeft,
  FileText,
  Sparkles,
  AlertCircle,
  X,
  type LucideIcon,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { DocumentoEstadoBadge } from "@/components/documentos/DocumentoEstadoBadge";
import { DocumentoPreview } from "@/components/documentos/DocumentoPreview";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatarData } from "@/lib/mock-data";
import { useAssembleia } from "@/lib/assembleias-store";
import { useDocumento, useDocumentos } from "@/lib/documentos-store";
import {
  criarRelacaoTribuno,
  removerRelacaoTribunoPorObjetos,
  useRelacoesPorObjeto,
} from "@/lib/relacoes-store";
import type { Documento, RelacaoTribuno } from "@/lib/types";

export const Route = createFileRoute("/_app/sessoes/$id/documentos/$docId")({
  head: () => ({
    meta: [
      { title: "Documento — Tribuno" },
      {
        name: "description",
        content: "Detalhe do documento da assembleia municipal.",
      },
    ],
  }),
  component: DocumentoPage,
});

function documentosUnicos(documentos: Documento[]) {
  const porId = new Map<string, Documento>();
  documentos.forEach((documento) => porId.set(documento.id, documento));
  return Array.from(porId.values()).sort((a, b) => b.data.localeCompare(a.data));
}

function isRelacaoEntreDocumentos(relacao: RelacaoTribuno) {
  return (
    relacao.origemTipo === "documento" &&
    relacao.destinoTipo === "documento" &&
    relacao.tipoRelacao === "relacionado_com"
  );
}

function outroDocumentoId(relacao: RelacaoTribuno, documentoId: string) {
  if (relacao.origemId === documentoId) return relacao.destinoId;
  if (relacao.destinoId === documentoId) return relacao.origemId;
  return undefined;
}

function DocumentoPage() {
  const { id, docId } = Route.useParams();
  const assembleia = useAssembleia(id);
  const documento = useDocumento(docId);
  const documentos = useDocumentos();
  const [documentoParaAssociar, setDocumentoParaAssociar] = useState("");
  const relacoesDoDocumento = useRelacoesPorObjeto("documento", docId);
  const documentosBiblioteca = useMemo(() => documentosUnicos(documentos), [documentos]);

  const relacoesDocumentos = useMemo(
    () => relacoesDoDocumento.filter(isRelacaoEntreDocumentos),
    [relacoesDoDocumento],
  );

  const documentosLigadosIds = useMemo(() => {
    return new Set(
      relacoesDocumentos
        .map((relacao) => outroDocumentoId(relacao, docId))
        .filter((documentoId): documentoId is string => Boolean(documentoId)),
    );
  }, [docId, relacoesDocumentos]);

  const documentosLigados = useMemo(
    () => documentosBiblioteca.filter((item) => documentosLigadosIds.has(item.id)),
    [documentosBiblioteca, documentosLigadosIds],
  );

  const documentosDisponiveis = useMemo(
    () =>
      documentosBiblioteca.filter(
        (item) => item.id !== docId && !documentosLigadosIds.has(item.id),
      ),
    [docId, documentosBiblioteca, documentosLigadosIds],
  );
  const isDocumentoBiblioteca = id === "biblioteca" || documento?.assembleiaId === "biblioteca";
  const nomeContexto = assembleia?.nome ?? (isDocumentoBiblioteca ? "Biblioteca" : "Sessão");

  function associarDocumento() {
    if (!documentoParaAssociar || documentoParaAssociar === docId) return;

    criarRelacaoTribuno({
      origemTipo: "documento",
      origemId: docId,
      destinoTipo: "documento",
      destinoId: documentoParaAssociar,
      tipoRelacao: "relacionado_com",
    });
    setDocumentoParaAssociar("");
  }

  function desassociarDocumento(documentoRelacionado: Documento) {
    const confirmado = window.confirm(
      `Remover a ligação ao documento "${documentoRelacionado.titulo}"?`,
    );
    if (!confirmado) return;

    removerRelacaoTribunoPorObjetos({
      origemTipo: "documento",
      origemId: docId,
      destinoTipo: "documento",
      destinoId: documentoRelacionado.id,
      tipoRelacao: "relacionado_com",
    });
    removerRelacaoTribunoPorObjetos({
      origemTipo: "documento",
      origemId: documentoRelacionado.id,
      destinoTipo: "documento",
      destinoId: docId,
      tipoRelacao: "relacionado_com",
    });
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
            {isDocumentoBiblioteca ? (
              <Link to="/biblioteca" className="hover:text-foreground transition-colors">
                Biblioteca
              </Link>
            ) : (
              <Link
                to="/sessoes/$id"
                params={{ id }}
                className="hover:text-foreground transition-colors"
              >
                {nomeContexto}
              </Link>
            )}
            <span className="mx-2 text-muted-foreground/60">/</span>
            <span className="text-foreground truncate">{documento?.tipo ?? "Documento"}</span>
          </span>
        }
      />
      <main className="px-8 py-10 max-w-7xl">
        {isDocumentoBiblioteca ? (
          <Link
            to="/biblioteca"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Voltar à Biblioteca
          </Link>
        ) : (
          <Link
            to="/sessoes/$id"
            params={{ id }}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Voltar à sessão
          </Link>
        )}

        {!documento ? (
          <section className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
            Documento não encontrado.
          </section>
        ) : (
          <>
            <section className="rounded-2xl border border-border bg-card p-6 shadow-card mb-8">
              <div className="flex items-start gap-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <FileText className="h-6 w-6" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {documento.tipo}
                    </span>
                    <DocumentoEstadoBadge estado={documento.estado} />
                  </div>
                  <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-foreground">
                    {documento.titulo}
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Data do documento: {formatarData(documento.data)}
                    {typeof documento.paginas === "number" ? ` · ${documento.paginas} páginas` : ""}
                    {documento.ficheiroNome ? ` · ${documento.ficheiroNome}` : ""}
                  </p>
                  {documento.notas && (
                    <p className="mt-3 text-sm text-foreground/80 whitespace-pre-line">
                      {documento.notas}
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-6 shadow-card mb-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <FileText className="h-4 w-4" strokeWidth={1.75} />
                </div>
                <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
                  Pré-visualização
                </h2>
              </div>
              <DocumentoPreview documento={documento} />
            </section>

            <div className="grid gap-5 lg:grid-cols-3">
              <ReservedSection
                icon={Sparkles}
                titulo="Análise"
                descricao="A análise automática deste documento será disponibilizada em fase futura."
                className="lg:col-span-2"
              />
              <ReservedSection
                icon={AlertCircle}
                titulo="Alertas"
                descricao="Os alertas sobre prazos, valores e inconsistências serão apresentados aqui."
              />
              <DocumentosLigadosSection
                documentosLigados={documentosLigados}
                documentosDisponiveis={documentosDisponiveis}
                documentoParaAssociar={documentoParaAssociar}
                onDocumentoChange={setDocumentoParaAssociar}
                onAssociarDocumento={associarDocumento}
                onDesassociarDocumento={desassociarDocumento}
              />
            </div>
          </>
        )}
      </main>
    </>
  );
}

function DocumentosLigadosSection({
  documentosLigados,
  documentosDisponiveis,
  documentoParaAssociar,
  onDocumentoChange,
  onAssociarDocumento,
  onDesassociarDocumento,
}: {
  documentosLigados: Documento[];
  documentosDisponiveis: Documento[];
  documentoParaAssociar: string;
  onDocumentoChange: (id: string) => void;
  onAssociarDocumento: () => void;
  onDesassociarDocumento: (documento: Documento) => void;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-card lg:col-span-3">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <FileText className="h-4 w-4" strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
              Documentos ligados
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Documentos da Biblioteca relacionados com este documento.
            </p>
          </div>
        </div>
        <span className="rounded-full border border-border bg-background/60 px-2.5 py-1 text-xs text-muted-foreground">
          {documentosLigados.length} {documentosLigados.length === 1 ? "documento" : "documentos"}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
        <Select
          value={documentoParaAssociar}
          onValueChange={onDocumentoChange}
          disabled={documentosDisponiveis.length === 0}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={
                documentosDisponiveis.length === 0
                  ? "Não há documentos disponíveis para ligar"
                  : "Selecionar documento existente"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {documentosDisponiveis.map((documento) => (
              <SelectItem key={documento.id} value={documento.id}>
                {documento.titulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onAssociarDocumento}
          disabled={!documentoParaAssociar}
        >
          Associar
        </Button>
      </div>

      {documentosLigados.length === 0 ? (
        <EmptyState
          compact
          className="mt-5"
          title="Nenhum documento ligado."
          description="Associe documentos relacionados, como respostas, atas, recomendações, relatórios ou leis."
        />
      ) : (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {documentosLigados.map((documento) => (
            <div
              key={documento.id}
              className="flex min-w-0 flex-col gap-4 rounded-2xl border border-border bg-background/60 p-4"
            >
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <FileText className="h-4 w-4" strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <h3 className="line-clamp-2 break-words text-sm font-semibold leading-6 text-foreground">
                    {documento.titulo}
                  </h3>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{documento.tipo}</span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.75} />
                      {formatarData(documento.data)}
                    </span>
                    <span>{documento.estado}</span>
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onDesassociarDocumento(documento)}
                >
                  <X className="mr-2 h-4 w-4" />
                  Remover
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ReservedSection({
  icon: Icon,
  titulo,
  descricao,
  className = "",
}: {
  icon: LucideIcon;
  titulo: string;
  descricao: string;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-border bg-card p-6 shadow-card ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </div>
        <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
          {titulo}
        </h2>
      </div>
      <div className="rounded-lg border border-dashed border-border bg-background/50 px-5 py-8 text-center">
        <p className="text-sm text-muted-foreground">{descricao}</p>
        <p className="mt-2 text-xs text-muted-foreground/70 italic">Disponível em fase futura</p>
      </div>
    </section>
  );
}
