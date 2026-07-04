import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileText, Link2, Save, X } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { SectionTitle, StatusBadge } from "@/components/ui/common";
import { EmptyState } from "@/components/ui/feedback";
import { Breadcrumb } from "@/components/ui/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { WorkspaceHeader, WorkspaceLayout, WorkspaceSection } from "@/components/ui/workspace";
import { useAssembleias } from "@/lib/assembleias-store";
import {
  atualizarDocumentoACriarRascunho,
  obterDocumentoACriarGlobal,
  subscreverDocumentosACriar,
} from "@/lib/documentos-a-criar-store";
import { adicionarEventoAutomaticoTimelineDossie } from "@/lib/dossie-timeline-store";
import { adicionarEventoHistorico } from "@/lib/historico-store";
import { obterPontosDaAssembleia } from "@/lib/pontos-store";
import { useDossie } from "@/lib/dossies-store";
import type { DocumentoCriado, EstadoDocumentoCriado } from "@/lib/types";

const estados: EstadoDocumentoCriado[] = [
  "rascunho",
  "em revisão",
  "pronto",
  "final",
  "apresentado",
  "arquivado",
];

export const Route = createFileRoute("/_app/dossies/$dossieId/documentos/$documentoId")({
  head: () => ({
    meta: [
      { title: "Documento do assunto — Tribuno" },
      {
        name: "description",
        content: "Editor de documento criado a partir de um assunto.",
      },
    ],
  }),
  component: DocumentoDoAssuntoPage,
});

function estadoLabel(estado: EstadoDocumentoCriado) {
  if (estado === "em revisão") return "Em revisão";
  if (estado === "final") return "Final";
  return estado.charAt(0).toUpperCase() + estado.slice(1);
}

function DocumentoDoAssuntoPage() {
  const { dossieId, documentoId } = Route.useParams();
  const dossie = useDossie(dossieId);
  const assembleias = useAssembleias();
  const [documento, setDocumento] = useState<DocumentoCriado | undefined>();
  const [carregou, setCarregou] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [estado, setEstado] = useState<EstadoDocumentoCriado>("rascunho");
  const [assembleiaId, setAssembleiaId] = useState<string | undefined>();
  const [pontoId, setPontoId] = useState<string | undefined>();
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    function carregar() {
      const proximo = obterDocumentoACriarGlobal(documentoId);
      const pertenceAoAssunto = proximo?.assuntoId === dossieId;

      setDocumento(pertenceAoAssunto ? proximo : undefined);

      if (proximo && pertenceAoAssunto) {
        setTitulo(proximo.titulo);
        setConteudo(proximo.conteudo);
        setEstado(proximo.estado);
        setAssembleiaId(proximo.assembleiaId);
        setPontoId(proximo.pontoId);
      }

      setCarregou(true);
    }

    carregar();
    return subscreverDocumentosACriar(carregar);
  }, [documentoId, dossieId]);

  const pontosDaSessao = useMemo(
    () => (assembleiaId ? obterPontosDaAssembleia(assembleiaId) : []),
    [assembleiaId],
  );

  function registarEvento(tituloEvento: string, descricao: string, proximoPontoId?: string) {
    adicionarEventoAutomaticoTimelineDossie(dossieId, {
      titulo: tituloEvento,
      descricao,
      tipo: "documento",
      origemTipo: "documento-a-criar",
      origemId: documentoId,
      origemHref: `/dossies/${dossieId}/documentos/${documentoId}`,
    });

    if (proximoPontoId) {
      adicionarEventoHistorico({
        pontoId: proximoPontoId,
        tipo: "documento-criado",
        acao: tituloEvento,
        descricao,
      });
    }
  }

  function guardar() {
    if (!documento || !titulo.trim()) return;

    const antesAssembleiaId = documento.assembleiaId;
    const antesPontoId = documento.pontoId;
    const antesEstado = documento.estado;

    const atualizado = atualizarDocumentoACriarRascunho(documento.id, {
      titulo: titulo.trim(),
      conteudo,
      estado,
      assuntoId: dossieId,
      assembleiaId,
      pontoId: assembleiaId ? pontoId : undefined,
    });

    if (!atualizado) return;

    setDocumento(atualizado);
    setGuardado(true);
    window.setTimeout(() => setGuardado(false), 1600);

    if (assembleiaId && assembleiaId !== antesAssembleiaId) {
      registarEvento("Documento associado a sessão", atualizado.titulo, pontoId);
    }

    if (pontoId && pontoId !== antesPontoId) {
      registarEvento("Documento associado a ponto", atualizado.titulo, pontoId);
    }

    if (!assembleiaId && antesAssembleiaId) {
      registarEvento(
        "Associação removida",
        `${atualizado.titulo} deixou de estar associado à sessão.`,
      );
    }

    if (!pontoId && antesPontoId) {
      registarEvento(
        "Associação removida",
        `${atualizado.titulo} deixou de estar associado ao ponto.`,
        antesPontoId,
      );
    }

    if (estado === "apresentado" && antesEstado !== "apresentado") {
      registarEvento("Documento marcado como apresentado", atualizado.titulo, pontoId);
    }
  }

  function escolherAssembleia(proximoId: string) {
    setAssembleiaId(proximoId);
    setPontoId(undefined);
  }

  function removerAssociacaoSessao() {
    setAssembleiaId(undefined);
    setPontoId(undefined);
  }

  if (!dossie || (carregou && !documento)) {
    return (
      <>
        <TopBar breadcrumb="Documento" />
        <main className="min-h-screen bg-transparent">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
            <Button asChild variant="ghost" size="sm" className="mb-6">
              <Link to="/dossies/$dossieId" params={{ dossieId }}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar ao assunto
              </Link>
            </Button>
            <EmptyState
              title="Documento não encontrado"
              description="Este documento pode ter sido removido ou não pertencer a este assunto."
            />
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar breadcrumb="Documento do assunto" />
      <main className="min-h-screen bg-transparent">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <Breadcrumb
              items={[{ label: "Assuntos" }, { label: dossie.titulo }, { label: "Documento" }]}
            />
            <Button asChild variant="ghost" size="sm">
              <Link to="/dossies/$dossieId" params={{ dossieId }}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar ao assunto
              </Link>
            </Button>
          </div>

          <WorkspaceLayout
            header={
              <WorkspaceHeader
                icon={FileText}
                eyebrow={documento?.tipo ?? "Documento"}
                title={titulo || "Documento sem título"}
                description="Documento político criado a partir deste assunto. Pode ser associado a uma sessão e a um ponto."
                meta={
                  <>
                    <StatusBadge tone="muted">{estadoLabel(estado)}</StatusBadge>
                    {assembleiaId && (
                      <StatusBadge tone="info" dot={false}>
                        Associado à sessão
                      </StatusBadge>
                    )}
                    {pontoId && (
                      <StatusBadge tone="info" dot={false}>
                        Associado ao ponto
                      </StatusBadge>
                    )}
                  </>
                }
                actions={
                  <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
                    {guardado && (
                      <span className="text-xs text-muted-foreground">Alterações guardadas</span>
                    )}
                    <Button type="button" onClick={guardar} disabled={!titulo.trim()}>
                      <Save className="mr-2 h-4 w-4" />
                      Guardar
                    </Button>
                  </div>
                }
              />
            }
            sidebar={
              <WorkspaceSection>
                <SectionTitle
                  icon={Link2}
                  title="Apresentação"
                  description="Associe este documento a uma sessão e, se fizer sentido, a um ponto."
                />

                <div className="mt-5 space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground">Sessão</label>
                    <Select value={assembleiaId} onValueChange={escolherAssembleia}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sem sessão associada" />
                      </SelectTrigger>
                      <SelectContent>
                        {assembleias.map((assembleia) => (
                          <SelectItem key={assembleia.id} value={assembleia.id}>
                            {assembleia.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground">
                      Ponto da ordem de trabalhos
                    </label>
                    <Select
                      value={pontoId}
                      onValueChange={setPontoId}
                      disabled={!assembleiaId || pontosDaSessao.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            assembleiaId ? "Sem ponto associado" : "Escolha primeiro uma sessão"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {pontosDaSessao.map((ponto) => (
                          <SelectItem key={ponto.id} value={ponto.id}>
                            Ponto {ponto.numero} · {ponto.titulo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setPontoId(undefined)}
                      disabled={!pontoId}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Remover ponto
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={removerAssociacaoSessao}
                      disabled={!assembleiaId}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Remover sessão
                    </Button>
                  </div>
                </div>
              </WorkspaceSection>
            }
          >
            <WorkspaceSection>
              <SectionTitle
                icon={FileText}
                title="Documento"
                description="Edite o conteúdo e o estado do rascunho."
              />

              <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
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
                      {estados.map((opcao) => (
                        <SelectItem key={opcao} value={opcao}>
                          {estadoLabel(opcao)}
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
            </WorkspaceSection>
          </WorkspaceLayout>
        </div>
      </main>
    </>
  );
}
