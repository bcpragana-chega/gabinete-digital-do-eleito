import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Eye, FilePlus2, Pencil } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAssembleia } from "@/lib/assembleias-store";
import {
  atualizarDocumentoACriarRascunho,
  obterDocumentoACriarPorId,
  subscreverDocumentosACriar,
} from "@/lib/documentos-a-criar-store";
import { obterPontoPorId, type PontoOrdemTrabalhos } from "@/lib/pontos-store";
import type { DocumentoCriado, EstadoDocumentoCriado } from "@/lib/types";

const estadosDocumento: EstadoDocumentoCriado[] = ["rascunho", "em revisão", "final"];
type ModoEditor = "editar" | "preview";

export const Route = createFileRoute(
  "/_app/assembleias/$id/preparacao/pontos/$pontoId/rascunhos/$rascunhoId",
)({
  head: () => ({
    meta: [
      { title: "Editor do rascunho — Tribuno" },
      {
        name: "description",
        content: "Editor de rascunho de documento a criar.",
      },
    ],
  }),
  component: RascunhoDocumentoPage,
});

function RascunhoDocumentoPage() {
  const { id, pontoId, rascunhoId } = Route.useParams();
  const assembleia = useAssembleia(id);
  const [ponto, setPonto] = useState<PontoOrdemTrabalhos | undefined>();
  const [rascunho, setRascunho] = useState<DocumentoCriado | undefined>();
  const [carregou, setCarregou] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [estado, setEstado] = useState<EstadoDocumentoCriado>("rascunho");
  const [modo, setModo] = useState<ModoEditor>("editar");
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    function carregar() {
      const proximoPonto = obterPontoPorId(id, pontoId);
      const proximoRascunho = obterDocumentoACriarPorId(id, pontoId, rascunhoId);

      setPonto(proximoPonto);
      setRascunho(proximoRascunho);

      if (proximoRascunho) {
        setTitulo(proximoRascunho.titulo);
        setConteudo(proximoRascunho.conteudo);
        setEstado(proximoRascunho.estado);
      }

      setCarregou(true);
    }

    carregar();
    return subscreverDocumentosACriar(carregar);
  }, [id, pontoId, rascunhoId]);

  function guardarAlteracoes() {
    if (!rascunho || !titulo.trim()) return;

    const atualizado = atualizarDocumentoACriarRascunho(rascunho.id, {
      titulo: titulo.trim(),
      conteudo,
      estado,
    });

    if (atualizado) {
      setRascunho(atualizado);
      setGuardado(true);
      window.setTimeout(() => setGuardado(false), 1600);
    }
  }

  if (!assembleia) {
    return (
      <>
        <TopBar breadcrumb="Rascunho" />
        <main className="px-8 py-10 max-w-7xl">
          <Link
            to="/assembleias"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Todas as assembleias
          </Link>

          <EmptyState title="Assembleia não encontrada" />
        </main>
      </>
    );
  }

  if (carregou && (!ponto || !rascunho)) {
    return (
      <>
        <TopBar breadcrumb="Rascunho" />
        <main className="px-8 py-10 max-w-7xl">
          <Link
            to="/assembleias/$id/preparacao/pontos/$pontoId"
            params={{ id, pontoId }}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Voltar ao ponto
          </Link>

          <EmptyState
            title="Rascunho não encontrado"
            description="Este rascunho pode ter sido removido ou ainda não estar disponível neste navegador."
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
            <Link
              to="/assembleias/$id/preparacao/pontos/$pontoId"
              params={{ id, pontoId }}
              className="hover:text-foreground transition-colors"
            >
              {ponto ? `Ponto ${ponto.numero}` : "Ponto"}
            </Link>
            <span className="mx-2 text-muted-foreground/60">/</span>
            <span className="text-foreground">Rascunho</span>
          </span>
        }
      />

      <main className="px-8 py-10 max-w-7xl">
        <Link
          to="/assembleias/$id/preparacao/pontos/$pontoId"
          params={{ id, pontoId }}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Voltar ao ponto
        </Link>

        <PageHeader
          icon={FilePlus2}
          eyebrow={rascunho?.tipo ?? "Documento a criar"}
          title={titulo || "Rascunho"}
          description="Edite o título, conteúdo e estado deste rascunho."
        />

        <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-lg border border-border bg-background p-1">
              <Button
                type="button"
                size="sm"
                variant={modo === "editar" ? "secondary" : "ghost"}
                onClick={() => setModo("editar")}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </Button>
              <Button
                type="button"
                size="sm"
                variant={modo === "preview" ? "secondary" : "ghost"}
                onClick={() => setModo("preview")}
              >
                <Eye className="mr-2 h-4 w-4" />
                Pré-visualizar
              </Button>
            </div>

            {modo === "editar" && (
              <div className="flex items-center justify-end gap-3">
                {guardado && (
                  <span className="text-xs text-muted-foreground">Alterações guardadas</span>
                )}
                <Button type="button" onClick={guardarAlteracoes} disabled={!titulo.trim()}>
                  Guardar alterações
                </Button>
              </div>
            )}
          </div>

          {modo === "editar" ? (
            <>
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground">Título</label>
                  <Input value={titulo} onChange={(event) => setTitulo(event.target.value)} />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground">Estado</label>
                  <Select
                    value={estado}
                    onValueChange={(value) => setEstado(value as EstadoDocumentoCriado)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {estadosDocumento.map((estadoDocumento) => (
                        <SelectItem key={estadoDocumento} value={estadoDocumento}>
                          {estadoDocumento}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-1 block text-xs font-medium text-foreground">Conteúdo</label>
                <Textarea
                  value={conteudo}
                  onChange={(event) => setConteudo(event.target.value)}
                  rows={16}
                  className="min-h-[360px]"
                />
              </div>
            </>
          ) : (
            <RascunhoPreview
              tipo={rascunho?.tipo ?? "Documento"}
              titulo={titulo}
              conteudo={conteudo}
              estado={estado}
              assembleiaNome={assembleia.nome}
              pontoTitulo={ponto?.titulo ?? "Ponto da ordem de trabalhos"}
              pontoNumero={ponto?.numero}
            />
          )}
        </section>
      </main>
    </>
  );
}

function RascunhoPreview({
  tipo,
  titulo,
  conteudo,
  estado,
  assembleiaNome,
  pontoTitulo,
  pontoNumero,
}: {
  tipo: string;
  titulo: string;
  conteudo: string;
  estado: EstadoDocumentoCriado;
  assembleiaNome: string;
  pontoTitulo: string;
  pontoNumero?: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-4 md:p-6">
      <article className="mx-auto min-h-[720px] max-w-3xl border border-border bg-card px-8 py-10 shadow-card md:px-12">
        <header className="border-b border-border pb-6 text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Tribuno
          </div>
          <div className="mt-2 text-sm font-medium uppercase tracking-wider text-foreground">
            {tipo}
          </div>
          <h2 className="mt-6 font-display text-2xl font-semibold tracking-tight text-foreground">
            {titulo || "Rascunho sem título"}
          </h2>
        </header>

        <dl className="mt-6 grid gap-3 rounded-lg border border-border bg-background/60 p-4 text-sm md:grid-cols-2">
          <PreviewMeta label="Assembleia" value={assembleiaNome} />
          <PreviewMeta
            label="Ponto da ordem de trabalhos"
            value={pontoNumero ? `Ponto ${pontoNumero} · ${pontoTitulo}` : pontoTitulo}
          />
          <PreviewMeta label="Estado" value={estado} />
          <PreviewMeta label="Tipo de documento" value={tipo} />
        </dl>

        <section className="mt-8 whitespace-pre-line text-sm leading-7 text-foreground">
          {conteudo || "Sem conteúdo ainda."}
        </section>
      </article>
    </div>
  );
}

function PreviewMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-foreground">{value}</dd>
    </div>
  );
}
