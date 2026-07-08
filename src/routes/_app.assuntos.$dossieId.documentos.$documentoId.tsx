import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Copy,
  Download,
  Eye,
  FileDown,
  FileText,
  Link2,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { InstitutionalDocumentEditor } from "@/components/documentos/InstitutionalDocumentEditor";
import { SectionTitle, StatusBadge } from "@/components/ui/common";
import { EmptyState } from "@/components/ui/feedback";
import { Breadcrumb } from "@/components/ui/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SaveFeedback, type SaveFeedbackState } from "@/components/ui/SaveFeedback";
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
  carregarDocumentosCriadosRemotosSeDisponivel,
  criarConteudoInicialDocumento,
  obterDocumentoACriarGlobal,
  subscreverDocumentosACriar,
} from "@/lib/documentos-a-criar-store";
import {
  carregarDocumentosCriadosLocais,
  carregarDocumentosCriadosRemotos,
} from "@/lib/documentos-criados-repository";
import {
  exportarDocumentoCriadoPDF,
  exportarDocumentoCriadoWord,
} from "@/lib/documentos-criados-export";
import {
  isTipoDocumentoInstitucional,
  obterDadosInstitucionais,
  obterSecoesDocumentoInstitucional,
  type ContextoDocumentoInstitucional,
} from "@/lib/documentos-institucionais";
import { adicionarEventoAutomaticoTimelineDossie } from "@/lib/dossie-timeline-store";
import { adicionarEventoHistorico } from "@/lib/historico-store";
import { obterPontosDaAssembleia } from "@/lib/pontos-store";
import { useDossie } from "@/lib/dossies-store";
import { addDiagnosticEvent } from "@/lib/debug-diagnostics";
import type { DocumentoCriado, EstadoDocumentoCriado } from "@/lib/types";

const estados: EstadoDocumentoCriado[] = [
  "rascunho",
  "em revisão",
  "pronto",
  "final",
  "apresentado",
  "arquivado",
];

type ModoDocumento = "visualizar" | "editar";

export const Route = createFileRoute("/_app/assuntos/$dossieId/documentos/$documentoId")({
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

function textoInstitucionalParaCopiar(
  tipo: Extract<DocumentoCriado["tipo"], "Moção" | "Recomendação" | "Requerimento">,
  titulo: string,
  conteudo: string,
  contexto: ContextoDocumentoInstitucional,
) {
  const dados = obterDadosInstitucionais(contexto);
  const secoes = obterSecoesDocumentoInstitucional(tipo, conteudo);

  return [
    dados.nomeOrgao.toLocaleUpperCase("pt-PT"),
    tipo.toLocaleUpperCase("pt-PT"),
    titulo.toLocaleUpperCase("pt-PT"),
    ...secoes.flatMap((secao) => [secao.titulo, secao.conteudo]),
    `${dados.local}, ${dados.data}`,
    "Proponente:",
    dados.nomeEleito,
    dados.grupoPolitico,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function limparSintaxeMarkdownVisivel(conteudo: string) {
  return conteudo
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*/g, "")
    .replace(/\*\*\*/g, "")
    .replace(/^---+$/gm, "")
    .trim();
}

function DocumentoDoAssuntoPage() {
  const { dossieId, documentoId } = Route.useParams();

  addDiagnosticEvent({
    area: "documento_editor",
    message: "route_enter",
    data: {
      params: {
        dossieId,
        documentoId,
      },
    },
  });

  const dossie = useDossie(dossieId);
  const assembleias = useAssembleias();
  const [documento, setDocumento] = useState<DocumentoCriado | undefined>();
  const [carregou, setCarregou] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [estado, setEstado] = useState<EstadoDocumentoCriado>("rascunho");
  const [assembleiaId, setAssembleiaId] = useState<string | undefined>();
  const [pontoId, setPontoId] = useState<string | undefined>();
  const [saveState, setSaveState] = useState<SaveFeedbackState>("saved");
  const [copiado, setCopiado] = useState(false);
  const [modo, setModo] = useState<ModoDocumento>("visualizar");

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      if (!ativo) return;

      addDiagnosticEvent({
        area: "documento_editor",
        message: "before_local_lookup",
        data: {
          documentoId,
        },
      });

      const proximo = obterDocumentoACriarGlobal(documentoId);
      const documentosLocais = carregarDocumentosCriadosLocais();
      const documentoLocal = documentosLocais.find((item) => item.id === documentoId);

      addDiagnosticEvent({
        area: "documento_editor",
        message: "after_local_lookup",
        data: {
          found: Boolean(documentoLocal),
        },
      });

      addDiagnosticEvent({
        area: "documento_editor",
        message: "before_remote_lookup",
        data: {
          table: "documentos_criados",
          documentoId,
        },
      });

      let documentosRemotos: Awaited<ReturnType<typeof carregarDocumentosCriadosRemotos>>;
      let erroRemoteLookup: string | undefined;

      try {
        documentosRemotos = await carregarDocumentosCriadosRemotos();
      } catch (error) {
        erroRemoteLookup = error instanceof Error ? error.message : String(error);
        documentosRemotos = undefined;
      }

      const documentoRemoto = documentosRemotos?.find((item) => item.id === documentoId);

      addDiagnosticEvent({
        area: "documento_editor",
        message: "after_remote_lookup",
        data: {
          found: Boolean(documentoRemoto),
          error: erroRemoteLookup,
        },
      });

      const pertenceAoAssunto =
        proximo?.assuntoId === dossieId || proximo?.origem === "ia";

      setDocumento(pertenceAoAssunto ? proximo : undefined);

      if (proximo && pertenceAoAssunto) {
        setTitulo(proximo.titulo);
        setConteudo(
          proximo.conteudo?.trim() ? proximo.conteudo : criarConteudoInicialDocumento(proximo),
        );
        setEstado(proximo.estado);
        setAssembleiaId(proximo.assembleiaId);
        setPontoId(proximo.pontoId);
      }

      setCarregou(true);
    }

    setCarregou(false);
    void carregarDocumentosCriadosRemotosSeDisponivel().finally(() => {
      void carregar();
    });
    const unsubscribe = subscreverDocumentosACriar(carregar);

    return () => {
      ativo = false;
      unsubscribe();
    };
  }, [documentoId, dossieId]);

  const motivoNaoAbrir = !dossie
    ? "assunto não encontrado"
    : carregou && !documento
      ? "documento não encontrado para os parâmetros recebidos"
      : undefined;

  const pontosDaSessao = useMemo(
    () => (assembleiaId ? obterPontosDaAssembleia(assembleiaId) : []),
    [assembleiaId],
  );
  const assembleiaSelecionada = useMemo(
    () => assembleias.find((item) => item.id === assembleiaId),
    [assembleiaId, assembleias],
  );
  const pontoSelecionado = useMemo(
    () => pontosDaSessao.find((item) => item.id === pontoId),
    [pontoId, pontosDaSessao],
  );
  const contextoDocumento: ContextoDocumentoInstitucional = useMemo(
    () => ({
      assembleia: assembleiaSelecionada,
      assunto: dossie?.titulo,
      sessao: assembleiaSelecionada?.nome,
      ponto: pontoSelecionado
        ? `Ponto ${pontoSelecionado.numero} · ${pontoSelecionado.titulo}`
        : undefined,
    }),
    [assembleiaSelecionada, dossie?.titulo, pontoSelecionado],
  );

  function registarEvento(tituloEvento: string, descricao: string, proximoPontoId?: string) {
    adicionarEventoAutomaticoTimelineDossie(dossieId, {
      titulo: tituloEvento,
      descricao,
      tipo: "documento",
      origemTipo: "documento-a-criar",
      origemId: documentoId,
      origemHref: `/assuntos/${dossieId}/documentos/${documentoId}`,
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

    try {
      setSaveState("saving");
      const atualizado = atualizarDocumentoACriarRascunho(documento.id, {
        titulo: titulo.trim(),
        conteudo,
        estado,
        assuntoId: dossieId,
        assembleiaId,
        pontoId: assembleiaId ? pontoId : undefined,
      });

      if (!atualizado) {
        setSaveState("error");
        return;
      }

      setDocumento(atualizado);
      setSaveState("saved");

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
    } catch {
      setSaveState("error");
    }
  }

  function exportarPDF() {
    if (!documento) return;

    exportarDocumentoCriadoPDF(
      {
        ...documento,
        titulo: titulo.trim() || documento.titulo,
        conteudo,
        estado,
        assembleiaId,
        pontoId,
      },
      contextoDocumento,
    );
  }

  function exportarWord() {
    if (!documento) return;

    exportarDocumentoCriadoWord(
      {
        ...documento,
        titulo: titulo.trim() || documento.titulo,
        conteudo,
        estado,
        assembleiaId,
        pontoId,
      },
      contextoDocumento,
    );
  }

  async function copiarTexto() {
    if (!documento) return;

    const tituloDocumento = titulo.trim() || documento.titulo;
    const texto = isTipoDocumentoInstitucional(documento.tipo)
      ? textoInstitucionalParaCopiar(documento.tipo, tituloDocumento, conteudo, contextoDocumento)
      : [tituloDocumento, limparSintaxeMarkdownVisivel(conteudo)].filter(Boolean).join("\n\n");

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto);
    }

    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 1600);
  }

  function escolherAssembleia(proximoId: string) {
    setAssembleiaId(proximoId);
    setPontoId(undefined);
    setSaveState("unsaved");
  }

  function removerAssociacaoSessao() {
    setAssembleiaId(undefined);
    setPontoId(undefined);
    setSaveState("unsaved");
  }

  if (!dossie || (carregou && !documento)) {
    addDiagnosticEvent({
      area: "documento_editor",
      message: "render_not_found",
      data: {
        motivo: motivoNaoAbrir ?? "desconhecido",
      },
    });

    return (
      <>
        <TopBar breadcrumb="Documento" />
        <main className="min-h-screen bg-transparent">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
            <Button asChild variant="ghost" size="sm" className="mb-6">
              <Link to="/assuntos/$dossieId" params={{ dossieId }}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar ao assunto
              </Link>
            </Button>
            <EmptyState
              title="Documento não encontrado"
              description="Este documento pode ter sido removido ou não pertencer a este assunto."
              action={
                <Button asChild>
                  <Link to="/assuntos/$dossieId" params={{ dossieId }}>
                    Voltar ao assunto
                  </Link>
                </Button>
              }
            />
          </div>
        </main>
      </>
    );
  }

  addDiagnosticEvent({
    area: "documento_editor",
    message: "render_editor",
    data: {
      documentoId: documento.id,
      titulo: documento.titulo,
      temConteudo: Boolean(documento.conteudo?.trim()),
    },
  });

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
              <Link to="/assuntos/$dossieId" params={{ dossieId }}>
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
                    {copiado ? (
                      <span className="text-xs text-muted-foreground">Texto copiado</span>
                    ) : (
                      <SaveFeedback state={saveState} />
                    )}
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        setModo((modoAtual) =>
                          modoAtual === "visualizar" ? "editar" : "visualizar",
                        )
                      }
                      disabled={!documento}
                    >
                      {modo === "visualizar" ? (
                        <Pencil className="mr-2 h-4 w-4" />
                      ) : (
                        <Eye className="mr-2 h-4 w-4" />
                      )}
                      {modo === "visualizar" ? "Editar" : "Visualizar"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={copiarTexto}
                      disabled={!documento}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar texto
                    </Button>
                    <Button type="button" onClick={guardar} disabled={!titulo.trim()}>
                      <Save className="mr-2 h-4 w-4" />
                      Guardar
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={exportarPDF}
                      disabled={!documento}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Descarregar PDF
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={exportarWord}
                      disabled={!documento}
                    >
                      <FileDown className="mr-2 h-4 w-4" />
                      Exportar Word
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
                      onValueChange={(valor) => {
                        setPontoId(valor);
                        setSaveState("unsaved");
                      }}
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
                description={
                  modo === "visualizar"
                    ? "Visualização institucional pronta para entregar."
                    : "Edite o conteúdo e o estado do rascunho."
                }
              />

              {modo === "editar" && (
                <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground">Título</label>
                    <Input
                      value={titulo}
                      onChange={(event) => {
                        setTitulo(event.target.value);
                        setSaveState("unsaved");
                      }}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-foreground">Estado</label>
                    <Select
                      value={estado}
                      onValueChange={(value) => {
                        setEstado(value as EstadoDocumentoCriado);
                        setSaveState("unsaved");
                      }}
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
              )}

              {documento && isTipoDocumentoInstitucional(documento.tipo) ? (
                <div className="mt-5">
                  <InstitutionalDocumentEditor
                    tipo={documento.tipo}
                    titulo={titulo}
                    conteudo={conteudo}
                    contexto={contextoDocumento}
                    readOnly={modo === "visualizar"}
                    onConteudoChange={
                      modo === "editar"
                        ? (valor) => {
                            setConteudo(valor);
                            setSaveState("unsaved");
                          }
                        : undefined
                    }
                  />
                </div>
              ) : (
                <div className="mt-4">
                  {modo === "editar" ? (
                    <>
                      <label className="mb-1 block text-xs font-medium text-foreground">
                        Conteúdo
                      </label>
                      <Textarea
                        value={conteudo}
                        onChange={(event) => {
                          setConteudo(event.target.value);
                          setSaveState("unsaved");
                        }}
                        rows={18}
                        className="min-h-[420px]"
                      />
                    </>
                  ) : (
                    <article className="mx-auto min-h-[640px] max-w-3xl border border-border bg-white px-8 py-10 font-serif text-[15px] leading-7 text-slate-950 shadow-card md:px-14 md:py-12">
                      <header className="border-b border-slate-300 pb-6 text-center">
                        <div className="font-sans text-lg font-extrabold uppercase tracking-[0.14em]">
                          {documento?.tipo ?? "Documento"}
                        </div>
                        <h2 className="mt-5 font-sans text-2xl font-extrabold uppercase leading-tight">
                          {titulo || "Documento sem título"}
                        </h2>
                      </header>
                      <section className="mt-8 whitespace-pre-line text-justify">
                        {limparSintaxeMarkdownVisivel(conteudo) || "Documento por preencher."}
                      </section>
                    </article>
                  )}
                </div>
              )}
            </WorkspaceSection>
          </WorkspaceLayout>
        </div>
      </main>
    </>
  );
}
