import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useBlocker } from "@tanstack/react-router";
import {
  ArrowLeft,
  Copy,
  Download,
  Eye,
  FileDown,
  FileText,
  Link2,
  Loader2,
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
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { guardarDocumentoCriadoConfirmado } from "@/lib/documentos-a-criar-store";
import { executarGravacaoConfirmadaDocumento } from "@/lib/document-save-flow";
import {
  DocumentoCriadoServiceErro,
  obterDocumentoCriadoPorId,
} from "@/lib/documentos-criados-service";
import {
  exportarDocumentoCriadoPDF,
  exportarDocumentoCriadoWord,
  mensagemContextoInstitucionalObrigatorio,
  mensagemErroGeracaoPDF,
  mensagemErroGeracaoWord,
  mensagemLogoObrigatorio,
  type ResultadoExportacaoDocumento,
} from "@/lib/documentos-criados-export";
import {
  isTipoDocumentoInstitucional,
  obterContextoInstitucionalGuardado,
  obterDadosInstitucionais,
  obterSecoesDocumentoInstitucional,
  resolverDataInstitucionalDocumento,
  type ContextoDocumentoInstitucional,
} from "@/lib/documentos-institucionais";
import { adicionarEventoAutomaticoTimelineDossie } from "@/lib/dossie-timeline-store";
import { adicionarEventoHistorico } from "@/lib/historico-store";
import { obterPontosDaAssembleia } from "@/lib/pontos-store";
import { useDossie } from "@/lib/dossies-store";
import type { DocumentoCriado, EstadoDocumentoCriado } from "@/lib/types";
import {
  resolverContextoNavegacaoDocumento,
  type DocumentoOrigemSearch,
} from "./DocumentoContextoNavegacao";

const estados: EstadoDocumentoCriado[] = [
  "rascunho",
  "em revisão",
  "pronto",
  "final",
  "apresentado",
  "arquivado",
];

type ModoDocumento = "visualizar" | "editar";
type ErroCarregamento = "DOCUMENTO_INEXISTENTE" | "SESSAO_EXPIRADA" | "INDISPONIVEL";

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

export function DocumentoCriadoDetalhe({
  documentoId,
  origem,
}: {
  documentoId: string;
  origem: DocumentoOrigemSearch;
}) {
  const assembleias = useAssembleias();
  const [documento, setDocumento] = useState<DocumentoCriado | undefined>();
  const [carregou, setCarregou] = useState(false);
  const [erroCarregamento, setErroCarregamento] = useState<ErroCarregamento>();
  const [tentativa, setTentativa] = useState(0);
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [estado, setEstado] = useState<EstadoDocumentoCriado>("rascunho");
  const [assembleiaId, setAssembleiaId] = useState<string | undefined>();
  const [pontoId, setPontoId] = useState<string | undefined>();
  const [saveState, setSaveState] = useState<SaveFeedbackState>("saved");
  const [copiado, setCopiado] = useState(false);
  const [modo, setModo] = useState<ModoDocumento>("visualizar");
  const [downloadPendente, setDownloadPendente] = useState<"pdf" | "word">();
  const [downloadDataProvisoria, setDownloadDataProvisoria] = useState<"pdf" | "word">();
  const [errosDocumento, setErrosDocumento] = useState<string[]>([]);
  const [erroExportacao, setErroExportacao] = useState<string>();
  const [tipoExportacaoFalhada, setTipoExportacaoFalhada] = useState<"pdf" | "word">();
  const [exportacaoEmCurso, setExportacaoEmCurso] = useState<"pdf" | "word">();
  const exportacaoEmCursoRef = useRef(false);
  const dossie = useDossie(documento?.assuntoId ?? "");

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        const proximo = await obterDocumentoCriadoPorId(documentoId);
        if (!ativo) return;

        if (!proximo) {
          setDocumento(undefined);
          setErroCarregamento("DOCUMENTO_INEXISTENTE");
          return;
        }

        setDocumento(proximo);
        setErroCarregamento(undefined);
        setTitulo(proximo.titulo);
        setConteudo(proximo.conteudo);
        setEstado(proximo.estado);
        setAssembleiaId(proximo.assembleiaId);
        setPontoId(proximo.pontoId);
        const metadata = proximo.iaMetadata;
        const persistenciaPendente =
          metadata &&
          typeof metadata === "object" &&
          !Array.isArray(metadata) &&
          (metadata as Record<string, unknown>).persistenciaPendente === true;
        setSaveState(persistenciaPendente ? "error" : "saved");
      } catch (error) {
        if (!ativo) return;
        setDocumento(undefined);
        setErroCarregamento(
          error instanceof DocumentoCriadoServiceErro && error.codigo === "SESSAO_EXPIRADA"
            ? "SESSAO_EXPIRADA"
            : "INDISPONIVEL",
        );
      } finally {
        if (ativo) setCarregou(true);
      }
    }

    setCarregou(false);
    setErroCarregamento(undefined);
    void carregar();

    return () => {
      ativo = false;
    };
  }, [documentoId, tentativa]);

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
      institutionalContext: documento ? obterContextoInstitucionalGuardado(documento) : undefined,
    }),
    [assembleiaSelecionada, documento, dossie?.titulo, pontoSelecionado],
  );
  const dirty = Boolean(
    documento &&
    (titulo !== documento.titulo ||
      conteudo !== documento.conteudo ||
      estado !== documento.estado ||
      assembleiaId !== documento.assembleiaId ||
      pontoId !== documento.pontoId),
  );

  useBlocker({
    disabled: !dirty,
    enableBeforeUnload: dirty,
    shouldBlockFn: () =>
      !window.confirm("Existem alterações por guardar. Pretende sair sem guardar?"),
  });

  function registarEvento(tituloEvento: string, descricao: string, proximoPontoId?: string) {
    if (documento?.assuntoId) {
      adicionarEventoAutomaticoTimelineDossie(documento.assuntoId, {
        titulo: tituloEvento,
        descricao,
        tipo: "documento",
        origemTipo: "documento-a-criar",
        origemId: documentoId,
        origemHref: `/documentos/${documentoId}`,
      });
    }

    if (proximoPontoId) {
      adicionarEventoHistorico({
        pontoId: proximoPontoId,
        tipo: "documento-criado",
        acao: tituloEvento,
        descricao,
      });
    }
  }

  async function guardar() {
    if (!documento || !titulo.trim()) return;

    const antesAssembleiaId = documento.assembleiaId;
    const antesPontoId = documento.pontoId;
    const antesEstado = documento.estado;

    try {
      const atualizado = await executarGravacaoConfirmadaDocumento({
        aoIniciar: () => setSaveState("saving"),
        persistir: () =>
          guardarDocumentoCriadoConfirmado(documento.id, {
            titulo: titulo.trim(),
            conteudo,
            estado,
            assuntoId: documento.assuntoId,
            assembleiaId,
            pontoId: assembleiaId ? pontoId : undefined,
            iaMetadata:
              documento.iaMetadata &&
              typeof documento.iaMetadata === "object" &&
              !Array.isArray(documento.iaMetadata)
                ? { ...documento.iaMetadata, persistenciaPendente: false }
                : documento.iaMetadata,
          }),
        aoConfirmar: (persistido) => {
          setDocumento(persistido);
          setTitulo(persistido.titulo);
          setConteudo(persistido.conteudo);
          setEstado(persistido.estado);
          setAssembleiaId(persistido.assembleiaId);
          setPontoId(persistido.pontoId);
          setSaveState("saved");
        },
        aoFalhar: () => setSaveState("error"),
      });

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
      return atualizado;
    } catch {
      // O texto editado permanece no estado React para permitir nova tentativa.
      return undefined;
    }
  }

  function documentoAtualParaExportar(base = documento) {
    if (!base) return undefined;
    return {
      ...base,
      titulo: titulo.trim() || base.titulo,
      conteudo,
      estado,
      assembleiaId,
      pontoId,
    };
  }

  function tratarResultadoExportacao(
    tipo: "pdf" | "word",
    resultado: ResultadoExportacaoDocumento,
  ) {
    if (resultado.status === "sucesso") {
      setErroExportacao(undefined);
      setTipoExportacaoFalhada(undefined);
      setErrosDocumento([]);
      return;
    }
    if (resultado.status === "contexto-institucional-em-falta") {
      setErroExportacao(mensagemContextoInstitucionalObrigatorio);
      setTipoExportacaoFalhada(undefined);
      return;
    }
    if (resultado.status === "logo-em-falta") {
      setErroExportacao(mensagemLogoObrigatorio);
      setTipoExportacaoFalhada(undefined);
      return;
    }
    if (resultado.status === "documento-invalido") {
      setErroExportacao(undefined);
      setTipoExportacaoFalhada(undefined);
      setErrosDocumento(resultado.erros);
      return;
    }
    if (resultado.status === "data-provisoria") {
      setDownloadDataProvisoria(tipo);
      return;
    }
    setErroExportacao(tipo === "pdf" ? mensagemErroGeracaoPDF : mensagemErroGeracaoWord);
    setTipoExportacaoFalhada(tipo);
  }

  async function descarregar(
    tipo: "pdf" | "word",
    base = documento,
    permitirDataProvisoria = false,
  ) {
    const atual = documentoAtualParaExportar(base);
    if (!atual) return;
    const dataInstitucional = resolverDataInstitucionalDocumento(contextoDocumento);
    if (dataInstitucional.provisoria && !permitirDataProvisoria) {
      setDownloadDataProvisoria(tipo);
      return;
    }
    if (exportacaoEmCursoRef.current) return;

    const contextoExportacao = { ...contextoDocumento, permitirDataProvisoria };
    exportacaoEmCursoRef.current = true;
    setExportacaoEmCurso(tipo);
    setErroExportacao(undefined);
    setTipoExportacaoFalhada(undefined);

    try {
      const resultado =
        tipo === "pdf"
          ? await exportarDocumentoCriadoPDF(atual, contextoExportacao)
          : await exportarDocumentoCriadoWord(atual, contextoExportacao);
      tratarResultadoExportacao(tipo, resultado);
    } catch {
      setErroExportacao(tipo === "pdf" ? mensagemErroGeracaoPDF : mensagemErroGeracaoWord);
      setTipoExportacaoFalhada(tipo);
    } finally {
      exportacaoEmCursoRef.current = false;
      setExportacaoEmCurso(undefined);
    }
  }

  function pedirDownload(tipo: "pdf" | "word") {
    if (exportacaoEmCursoRef.current) return;
    if (dirty) setDownloadPendente(tipo);
    else void descarregar(tipo);
  }

  async function guardarEDescarregar() {
    if (!downloadPendente) return;
    const tipo = downloadPendente;
    const persistido = await guardar();
    if (!persistido) return;
    setDownloadPendente(undefined);
    await descarregar(tipo, persistido);
  }

  function exportarPDF() {
    pedirDownload("pdf");
  }

  function exportarWord() {
    pedirDownload("word");
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

  if (carregou && !documento) {
    const erro = erroCarregamento;
    const mensagem =
      erro === "DOCUMENTO_INEXISTENTE"
        ? "O documento não foi encontrado."
        : erro === "SESSAO_EXPIRADA"
          ? "A sua sessão expirou. Inicie sessão novamente."
          : "Não foi possível carregar o documento. Tente novamente.";
    const podeTentarNovamente = erro === "INDISPONIVEL";

    return (
      <>
        <TopBar breadcrumb="Documento" />
        <main className="min-h-screen bg-transparent">
          <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
            <Button asChild variant="ghost" size="sm" className="mb-6">
              <Link to="/biblioteca">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar à Biblioteca
              </Link>
            </Button>
            <EmptyState
              title="Documento indisponível"
              description={mensagem}
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button asChild>
                    <Link to="/biblioteca">Voltar à Biblioteca</Link>
                  </Button>
                  {podeTentarNovamente && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setTentativa((valor) => valor + 1)}
                    >
                      Tentar novamente
                    </Button>
                  )}
                </div>
              }
            />
          </div>
        </main>
      </>
    );
  }

  if (!documento) {
    return (
      <>
        <TopBar breadcrumb="Documento" />
        <main className="min-h-screen bg-transparent">
          <div
            className="mx-auto flex min-h-[50vh] max-w-7xl items-center justify-center px-4 py-6 sm:px-6 lg:px-8"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />A carregar documento...
            </div>
          </div>
        </main>
      </>
    );
  }

  const navegacao = resolverContextoNavegacaoDocumento(origem, {
    sessaoIds: [documento.assembleiaId],
    assuntoIds: [documento.assuntoId],
  });
  const metadataGeracao =
    documento.iaMetadata &&
    typeof documento.iaMetadata === "object" &&
    !Array.isArray(documento.iaMetadata)
      ? (documento.iaMetadata as Record<string, unknown>)
      : undefined;
  const documentosConsultados = Array.isArray(metadataGeracao?.documentosConsultados)
    ? metadataGeracao.documentosConsultados
    : [];
  const anexosConsultados = Array.isArray(metadataGeracao?.anexosConsultados)
    ? metadataGeracao.anexosConsultados
    : [];
  const factosUtilizados = Array.isArray(metadataGeracao?.factosUtilizados)
    ? metadataGeracao.factosUtilizados.flatMap((facto) => {
        if (!facto || typeof facto !== "object" || Array.isArray(facto)) return [];
        const resumo = (facto as Record<string, unknown>).resumo;
        return typeof resumo === "string" && resumo.trim() ? [resumo.trim()] : [];
      })
    : [];
  const dataInstitucional = resolverDataInstitucionalDocumento(contextoDocumento);

  return (
    <>
      <AlertDialog
        open={Boolean(downloadPendente)}
        onOpenChange={(open) => !open && setDownloadPendente(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Existem alterações por guardar</AlertDialogTitle>
            <AlertDialogDescription>
              Guarde primeiro para que o ficheiro corresponda à versão persistida no Tribuno.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDownloadPendente(undefined)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (downloadPendente) void descarregar(downloadPendente);
                setDownloadPendente(undefined);
              }}
            >
              Descarregar sem guardar
            </Button>
            <Button
              type="button"
              onClick={() => void guardarEDescarregar()}
              disabled={saveState === "saving"}
            >
              Guardar e descarregar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={Boolean(downloadDataProvisoria)}
        onOpenChange={(open) => !open && setDownloadDataProvisoria(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Data institucional provisória</AlertDialogTitle>
            <AlertDialogDescription>
              Este documento não está associado a uma Sessão. A data apresentada é provisória.
              Pretende descarregar mesmo assim?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDownloadDataProvisoria(undefined)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setDownloadDataProvisoria(undefined);
                setModo("editar");
                window.requestAnimationFrame(() =>
                  document.getElementById("documento-sessao")?.focus(),
                );
              }}
            >
              Associar a uma Sessão
            </Button>
            <Button
              type="button"
              onClick={() => {
                const tipo = downloadDataProvisoria;
                setDownloadDataProvisoria(undefined);
                if (tipo) void descarregar(tipo, documento, true);
              }}
            >
              Descarregar com data provisória
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <TopBar breadcrumb="Documento" />
      <main className="min-h-screen bg-transparent">
        <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <Breadcrumb
              items={
                navegacao.origem === "biblioteca"
                  ? [{ label: "Biblioteca", href: "/biblioteca" }, { label: "Documento" }]
                  : navegacao.origem === "sessao"
                    ? [
                        { label: "Sessões", href: "/sessoes" },
                        {
                          label: assembleiaSelecionada?.nome ?? "Sessão",
                          href: navegacao.hrefRegresso,
                        },
                        { label: "Documento" },
                      ]
                    : navegacao.origem === "assunto"
                      ? [
                          { label: "Assuntos", href: "/assuntos" },
                          { label: dossie?.titulo ?? "Assunto", href: navegacao.hrefRegresso },
                          { label: "Documento" },
                        ]
                      : [{ label: "Documento" }]
              }
            />
            <Button asChild variant="ghost" size="sm">
              <a href={navegacao.hrefRegresso}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {navegacao.labelRegresso}
              </a>
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
                  <div className="flex w-full flex-col flex-wrap items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
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
                    <Button
                      type="button"
                      onClick={() => void guardar()}
                      disabled={!titulo.trim() || saveState === "saving"}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Guardar
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={exportarPDF}
                      disabled={!documento || Boolean(exportacaoEmCurso)}
                    >
                      {exportacaoEmCurso === "pdf" ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      {exportacaoEmCurso === "pdf" ? "A gerar PDF..." : "Descarregar PDF"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={exportarWord}
                      disabled={!documento || Boolean(exportacaoEmCurso)}
                    >
                      {exportacaoEmCurso === "word" ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <FileDown className="mr-2 h-4 w-4" />
                      )}
                      {exportacaoEmCurso === "word" ? "A gerar Word..." : "Exportar Word"}
                    </Button>
                  </div>
                }
              />
            }
            sidebar={
              <>
                <WorkspaceSection>
                  <SectionTitle
                    icon={Link2}
                    title="Apresentação"
                    description="Associe este documento a uma sessão e, se fizer sentido, a um ponto."
                  />

                  <div className="mt-5 space-y-4">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-foreground">
                        Sessão
                      </label>
                      <Select value={assembleiaId} onValueChange={escolherAssembleia}>
                        <SelectTrigger id="documento-sessao">
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
                {metadataGeracao && (
                  <WorkspaceSection>
                    <details>
                      <summary className="cursor-pointer text-sm font-semibold text-foreground">
                        Como o Tribuno preparou este documento
                      </summary>
                      <div className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
                        <p>
                          Foi utilizado o contexto do Assunto
                          {dossie ? ` “${dossie.titulo}”` : " associado"}, com{" "}
                          {Number(metadataGeracao.notasAssunto ?? 0)} nota(s) e{" "}
                          {Number(metadataGeracao.timelineAssunto ?? 0)} acontecimento(s).
                        </p>
                        <p>
                          Documentos consultados: {documentosConsultados.length}. Anexos
                          consultados: {anexosConsultados.length}.
                        </p>
                        <div>
                          <p className="font-medium text-foreground">
                            Factos do Assunto utilizados
                          </p>
                          {factosUtilizados.length > 0 ? (
                            <ul className="mt-1 list-disc space-y-1 pl-5">
                              {factosUtilizados.map((facto, index) => (
                                <li key={`${index}-${facto}`}>{facto}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-1">
                              Este Assunto não contém factos específicos suficientes. A redação foi
                              limitada ao contexto disponível.
                            </p>
                          )}
                        </div>
                        <p>
                          Modelo:{" "}
                          {String(metadataGeracao.modelo ?? documento.iaModelo ?? "Não indicado")}.
                          Gerado pela IA em:{" "}
                          {String(metadataGeracao.geradoEm ?? documento.createdAt)}.
                        </p>
                        <p>
                          {dataInstitucional.provisoria
                            ? `Data institucional provisória: ${dataInstitucional.dataFormatada}. Associe o documento a uma Sessão para definir a data de apresentação.`
                            : `Data institucional: ${dataInstitucional.dataFormatada}. Origem da data institucional: Sessão associada.`}
                        </p>
                        {Boolean(metadataGeracao.legalBasisVersion) && (
                          <p>
                            Enquadramento jurídico: versão{" "}
                            {String(metadataGeracao.legalBasisVersion)}.
                          </p>
                        )}
                        {Array.isArray(metadataGeracao.limitacoes) &&
                          metadataGeracao.limitacoes.length > 0 && (
                            <p>Limitações: {metadataGeracao.limitacoes.map(String).join("; ")}.</p>
                          )}
                      </div>
                    </details>
                  </WorkspaceSection>
                )}
              </>
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

              {errosDocumento.length > 0 && (
                <div
                  className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
                  role="alert"
                >
                  <p className="font-semibold">O documento ainda não está pronto para exportar.</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {errosDocumento.map((erro) => (
                      <li key={erro}>{erro}</li>
                    ))}
                  </ul>
                </div>
              )}

              {erroExportacao && (
                <div
                  className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
                  role="alert"
                >
                  <span>{erroExportacao}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const tipo = tipoExportacaoFalhada;
                      setErroExportacao(undefined);
                      setTipoExportacaoFalhada(undefined);
                      if (tipo) pedirDownload(tipo);
                    }}
                  >
                    {tipoExportacaoFalhada ? "Tentar novamente" : "Fechar"}
                  </Button>
                </div>
              )}

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
