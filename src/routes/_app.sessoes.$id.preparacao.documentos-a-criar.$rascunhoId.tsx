import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Download, FilePlus2, Save } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
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
  carregarDocumentosCriadosRemotosSeDisponivel,
  criarConteudoInicialDocumento,
  obterDocumentoACriarGlobal,
  subscreverDocumentosACriar,
} from "@/lib/documentos-a-criar-store";
import { exportarDocumentoCriadoPDF } from "@/lib/documentos-criados-export";
import type { DocumentoCriado, EstadoDocumentoCriado } from "@/lib/types";

const estadosDocumento: EstadoDocumentoCriado[] = [
  "rascunho",
  "em revisão",
  "pronto",
  "final",
  "apresentado",
  "arquivado",
];

export const Route = createFileRoute("/_app/sessoes/$id/preparacao/documentos-a-criar/$rascunhoId")(
  {
    head: () => ({
      meta: [
        { title: "Documento a criar — Tribuno" },
        {
          name: "description",
          content: "Editor de documento a criar da sessão.",
        },
      ],
    }),
    component: DocumentoACriarDaSessaoPage,
  },
);

function DocumentoACriarDaSessaoPage() {
  const { id, rascunhoId } = Route.useParams();
  const assembleia = useAssembleia(id);
  const [rascunho, setRascunho] = useState<DocumentoCriado | undefined>();
  const [carregou, setCarregou] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [estado, setEstado] = useState<EstadoDocumentoCriado>("rascunho");
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    let ativo = true;

    function carregar() {
      if (!ativo) return;

      const proximo = obterDocumentoACriarGlobal(rascunhoId);
      const pertenceASessao = proximo?.assembleiaId === id;
      const proximoRascunho = pertenceASessao ? proximo : undefined;

      setRascunho(proximoRascunho);

      if (proximoRascunho) {
        setTitulo(proximoRascunho.titulo);
        setConteudo(
          proximoRascunho.conteudo?.trim()
            ? proximoRascunho.conteudo
            : criarConteudoInicialDocumento(proximoRascunho),
        );
        setEstado(proximoRascunho.estado);
      }

      setCarregou(true);
    }

    setCarregou(false);
    void carregarDocumentosCriadosRemotosSeDisponivel().finally(carregar);
    const unsubscribe = subscreverDocumentosACriar(carregar);

    return () => {
      ativo = false;
      unsubscribe();
    };
  }, [id, rascunhoId]);

  function guardarAlteracoes() {
    if (!rascunho || !titulo.trim()) return;

    const atualizado = atualizarDocumentoACriarRascunho(rascunho.id, {
      titulo: titulo.trim(),
      conteudo,
      estado,
      assembleiaId: id,
    });

    if (!atualizado) return;

    setRascunho(atualizado);
    setGuardado(true);
    window.setTimeout(() => setGuardado(false), 1600);
  }

  function exportarPDF() {
    if (!rascunho) return;

    exportarDocumentoCriadoPDF(
      {
        ...rascunho,
        titulo: titulo.trim() || rascunho.titulo,
        conteudo,
        estado,
        assembleiaId: id,
      },
      {
        sessao: assembleia?.nome,
      },
    );
  }

  if (!assembleia) {
    return (
      <>
        <TopBar breadcrumb="Documento a criar" />
        <main className="px-8 py-10 max-w-7xl">
          <Button asChild variant="ghost" size="sm" className="mb-6">
            <Link to="/sessoes">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Todas as sessões
            </Link>
          </Button>

          <EmptyState title="Sessão não encontrada" />
        </main>
      </>
    );
  }

  if (carregou && !rascunho) {
    return (
      <>
        <TopBar breadcrumb="Documento a criar" />
        <main className="px-8 py-10 max-w-7xl">
          <Button asChild variant="ghost" size="sm" className="mb-6">
            <Link to="/sessoes/$id/preparacao/documentos-a-criar" params={{ id }}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar aos documentos a criar
            </Link>
          </Button>

          <EmptyState
            title="Documento não encontrado"
            description="Este documento pode ter sido removido ou ainda não estar sincronizado neste dispositivo."
          />
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar breadcrumb="Documento a criar" />
      <main className="px-8 py-10 max-w-7xl">
        <Button asChild variant="ghost" size="sm" className="mb-6">
          <Link to="/sessoes/$id/preparacao/documentos-a-criar" params={{ id }}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar aos documentos a criar
          </Link>
        </Button>

        <PageHeader
          icon={FilePlus2}
          eyebrow={rascunho?.tipo ?? "Documento a criar"}
          title={titulo || "Documento sem título"}
          description="Edite o conteúdo e guarde as alterações deste documento."
        />

        <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="mb-5 flex flex-wrap items-center justify-end gap-3">
            {guardado && (
              <span className="text-xs text-muted-foreground">Alterações guardadas</span>
            )}
            <Button type="button" variant="secondary" onClick={exportarPDF} disabled={!rascunho}>
              <Download className="mr-2 h-4 w-4" />
              Exportar PDF
            </Button>
            <Button type="button" onClick={guardarAlteracoes} disabled={!titulo.trim()}>
              <Save className="mr-2 h-4 w-4" />
              Guardar alterações
            </Button>
          </div>

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
              rows={18}
              className="min-h-[420px]"
            />
          </div>
        </section>
      </main>
    </>
  );
}
