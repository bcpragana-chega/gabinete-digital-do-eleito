import { Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle, Download, FilePlus2, FileText, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ActionCard } from "@/components/ui/cards";
import { SectionTitle, StatusBadge } from "@/components/ui/common";
import { EmptyState } from "@/components/ui/feedback";
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
import { WorkspaceSection } from "@/components/ui/workspace";
import {
  listarDocumentosACriarDoAssunto,
  sincronizarDocumentoACriarGerado,
  subscreverDocumentosACriar,
} from "@/lib/documentos-a-criar-store";
import { gerarDocumentoAssistido } from "@/lib/ai/document-generator.server";
import type { ResultadoGeracaoDocumento } from "@/lib/ai/types";
import {
  exportarDocumentoCriadoPDF,
  exportarDocumentoCriadoWord,
  mensagemContextoInstitucionalObrigatorio,
  mensagemDataInstitucionalProvisoria,
  mensagemLogoObrigatorio,
} from "@/lib/documentos-criados-export";
import { obterAssembleia } from "@/lib/assembleias-store";
import { useAuth } from "@/lib/auth-store";
import { useDossie } from "@/lib/dossies-store";
import { useAssembleiasDoDossie } from "@/lib/dossie-assembleias-store";
import { listarDocumentosDoDossie } from "@/lib/dossie-documentos-store";
import { listarNotasDossie } from "@/lib/dossie-notas-store";
import { listarEventosTimelineDossie } from "@/lib/dossie-timeline-store";
import { obterPontosDaAssembleia } from "@/lib/pontos-store";
import { getSupabaseClient } from "@/lib/supabase";
import { sugerirTituloDocumento, tipoPorIntencao, type IntencaoDocumento } from "@/lib/assunto-ux";
import type { DocumentoCriado, TipoDocumentoCriado } from "@/lib/types";

const tiposDocumentos: TipoDocumentoCriado[] = [
  "Moção",
  "Recomendação",
  "Requerimento",
  "Declaração de voto",
  "Intervenção",
  "Outro documento",
];

const intencoes: Array<{ id: IntencaoDocumento; label: string }> = [
  { id: "proposta", label: "Apresentar uma proposta" },
  { id: "informacoes", label: "Pedir informações ao executivo" },
  { id: "posicao", label: "Tomar uma posição política" },
  { id: "intervencao", label: "Preparar uma intervenção" },
  { id: "outro", label: "Outro documento" },
];

function estadoLabel(estado: string) {
  if (estado === "em revisão") return "Em revisão";
  if (estado === "final") return "Final";
  return estado.charAt(0).toUpperCase() + estado.slice(1);
}

function metaAssociacao(documento: DocumentoCriado) {
  const assembleia = documento.assembleiaId ? obterAssembleia(documento.assembleiaId) : undefined;
  const ponto =
    documento.assembleiaId && documento.pontoId
      ? obterPontosDaAssembleia(documento.assembleiaId).find(
          (item) => item.id === documento.pontoId,
        )
      : undefined;

  if (assembleia && ponto) return `${assembleia.nome} · Ponto ${ponto.numero}`;
  if (assembleia) return assembleia.nome;
  return "Sem sessão associada";
}

function mensagemErroGeracao(code?: string, message?: string) {
  const base =
    message?.trim() || "Não foi possível gerar o documento. Verifique a ligação e tente novamente.";

  const mensagensConhecidas: Record<string, string> = {
    AUTH_REQUIRED: "A sua sessão expirou. Inicie sessão novamente para gerar documentos.",
    SESSAO_NOT_LINKED_TO_ASSUNTO:
      "A sessão selecionada já não está ligada a este assunto. Volte a associá-la antes de gerar.",
    AI_TIMEOUT: "A preparação demorou mais do que o esperado. Tente novamente.",
    AI_EMPTY_RESPONSE:
      "Não foi possível produzir conteúdo útil. Reveja as indicações e tente novamente.",
    AI_INVALID_DOCUMENT_CONTENT:
      "O conteúdo produzido não respeitou a estrutura documental. Tente gerar novamente.",
    AI_PROVIDER_ERROR: "O serviço de apoio à escrita está temporariamente indisponível.",
    AI_CONFIG_MISSING: "O serviço de apoio à escrita não está disponível neste momento.",
    AI_CONFIG_MISSING_MODEL: "O serviço de apoio à escrita não está disponível neste momento.",
    AI_CONFIG_MISSING_PROVIDER: "O serviço de apoio à escrita não está disponível neste momento.",
    AI_PROVIDER_NOT_SUPPORTED: "O serviço de apoio à escrita não está disponível neste momento.",
    INSTITUTIONAL_PROFILE_INCOMPLETE:
      "Complete o seu perfil institucional antes de gerar documentos oficiais. Confirme o município e, quando aplicável, a freguesia.",
    INSTITUTIONAL_CONTEXT_INVALID:
      "Não foi possível validar o contexto institucional deste documento. Reveja os dados institucionais.",
    LEGAL_BASIS_INVALID:
      "Não foi possível validar o enquadramento jurídico deste documento. Reveja os dados institucionais.",
    SUPABASE_INSERT_DOCUMENTO_CRIADO: "O documento foi preparado, mas não foi possível guardá-lo.",
    AI_GENERATION_ERROR: "Não foi possível preparar o documento. Tente novamente.",
  };

  return (code && mensagensConhecidas[code]) || base;
}

export function DossieDocumentosCriadosSection({ dossieId }: { dossieId: string }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const dossie = useDossie(dossieId);
  const sessoesRelacionadas = useAssembleiasDoDossie(dossieId);
  const [documentos, setDocumentos] = useState<DocumentoCriado[]>([]);
  const [intencao, setIntencao] = useState<IntencaoDocumento>();
  const [tipo, setTipo] = useState<TipoDocumentoCriado>("Recomendação");
  const [titulo, setTitulo] = useState("");
  const [tituloEditado, setTituloEditado] = useState(false);
  const [conteudo, setConteudo] = useState("");
  const [gerando, setGerando] = useState(false);
  const [erroGeracao, setErroGeracao] = useState<string | undefined>();
  const [erroLogo, setErroLogo] = useState<string | undefined>();
  const [erroInstitucional, setErroInstitucional] = useState<string | undefined>();
  const [documentoCriadoId, setDocumentoCriadoId] = useState<string>();
  const [sucesso, setSucesso] = useState<string>();
  const criacaoEmCurso = useRef(false);

  function escolherIntencao(proxima: IntencaoDocumento) {
    const proximoTipo = tipoPorIntencao(proxima) as TipoDocumentoCriado;
    setIntencao(proxima);
    setTipo(proximoTipo);
    setTitulo(
      sugerirTituloDocumento({
        tipo: proximoTipo,
        assuntoTitulo: dossie?.titulo ?? "",
        objetivoPolitico: dossie?.objetivoPolitico,
      }),
    );
    setTituloEditado(false);
    setSucesso(undefined);
  }

  function escolherTipo(proximoTipo: TipoDocumentoCriado) {
    setTipo(proximoTipo);
    if (!tituloEditado) {
      setTitulo(
        sugerirTituloDocumento({
          tipo: proximoTipo,
          assuntoTitulo: dossie?.titulo ?? "",
          objetivoPolitico: dossie?.objetivoPolitico,
        }),
      );
    }
  }

  useEffect(() => {
    function carregar() {
      setDocumentos(listarDocumentosACriarDoAssunto(dossieId));
    }

    carregar();
    return subscreverDocumentosACriar(carregar);
  }, [dossieId]);

  useEffect(() => {
    const handler = () => setErroLogo(mensagemLogoObrigatorio);
    window.addEventListener("tribuno:logo-institucional-obrigatorio", handler);
    return () => window.removeEventListener("tribuno:logo-institucional-obrigatorio", handler);
  }, []);

  useEffect(() => {
    const handler = () =>
      setErroInstitucional(
        `${mensagemDataInstitucionalProvisoria} Abra o documento para confirmar o download ou associar uma Sessão.`,
      );
    window.addEventListener("tribuno:data-institucional-provisoria", handler);
    return () => window.removeEventListener("tribuno:data-institucional-provisoria", handler);
  }, []);

  useEffect(() => {
    const handler = () => setErroInstitucional(mensagemContextoInstitucionalObrigatorio);
    window.addEventListener("tribuno:contexto-institucional-obrigatorio", handler);
    return () => window.removeEventListener("tribuno:contexto-institucional-obrigatorio", handler);
  }, []);

  async function gerarDocumento() {
    const tituloLimpo = titulo.trim();
    if (!tituloLimpo) return;
    if (!user?.id || criacaoEmCurso.current) return;

    criacaoEmCurso.current = true;
    setGerando(true);
    setErroGeracao(undefined);

    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setErroGeracao(mensagemErroGeracao("AUTH_REQUIRED"));
        return;
      }

      const { data: sessaoAuth, error: erroSessaoAuth } = await supabase.auth.getSession();
      const accessToken = sessaoAuth.session?.access_token;

      if (erroSessaoAuth || !accessToken) {
        setErroGeracao(mensagemErroGeracao("AUTH_REQUIRED"));
        return;
      }

      const sessaoDeterministicaId =
        sessoesRelacionadas.length === 1 ? sessoesRelacionadas[0].assembleiaId : undefined;

      const response = (await gerarDocumentoAssistido({
        data: {
          accessToken,
          assuntoId: dossieId,
          sessaoId: sessaoDeterministicaId,
          tipo,
          titulo: tituloLimpo,
          conteudoInicial: conteudo.trim(),
          documentosRelacionadosIds: listarDocumentosDoDossie(dossieId).map(
            (relacao) => relacao.documentoId,
          ),
          assuntoNotas: listarNotasDossie(dossieId).map((nota) => nota.conteudo),
          assuntoTimeline: listarEventosTimelineDossie(dossieId).map(
            (evento) => `${evento.data} · ${evento.titulo}: ${evento.descricao}`,
          ),
        },
      })) as ResultadoGeracaoDocumento;

      if (!response.ok) {
        if (response.documentoPendente) {
          sincronizarDocumentoACriarGerado(response.documentoPendente);
          setDocumentoCriadoId(response.documentoPendente.id);
          setSucesso(
            "Documento gerado, mas ainda não guardado. Abra-o para rever e tentar guardar novamente.",
          );
          setDocumentos(listarDocumentosACriarDoAssunto(dossieId));
          return;
        }
        setErroGeracao(mensagemErroGeracao(response.code, response.message));
        return;
      }

      sincronizarDocumentoACriarGerado(response.documento);

      setDocumentoCriadoId(response.documento.id);
      setSucesso("Documento preparado e guardado. Já pode abri-lo para revisão.");
      setIntencao(undefined);
      setTipo("Recomendação");
      setTitulo("");
      setTituloEditado(false);
      setConteudo("");
      setDocumentos(listarDocumentosACriarDoAssunto(dossieId));
      void navigate({
        to: "/documentos/$documentoId",
        params: { documentoId: response.documento.id },
      });
    } catch {
      setErroGeracao(mensagemErroGeracao("AI_GENERATION_ERROR"));
    } finally {
      criacaoEmCurso.current = false;
      setGerando(false);
    }
  }

  return (
    <WorkspaceSection
      className={
        documentos.length === 0 ? "border-primary/35 bg-primary/[0.03] shadow-md" : undefined
      }
    >
      <SectionTitle
        icon={FilePlus2}
        title={documentos.length === 0 ? "Próxima ação" : "Documentos do assunto"}
        description={
          documentos.length === 0
            ? "Prepare o primeiro documento a partir deste tema."
            : "Moções, recomendações, requerimentos e outros documentos que nascem deste tema."
        }
      />

      <div className="mt-5 grid gap-4 rounded-2xl border border-border bg-background/60 p-4">
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-foreground">
            O que pretende fazer?
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {intencoes.map((opcao) => (
              <Button
                key={opcao.id}
                type="button"
                variant={intencao === opcao.id ? "primary" : "secondary"}
                className="h-auto min-h-11 justify-start whitespace-normal text-left"
                aria-pressed={intencao === opcao.id}
                onClick={() => escolherIntencao(opcao.id)}
              >
                {opcao.label}
              </Button>
            ))}
          </div>
        </fieldset>

        {sessoesRelacionadas.length === 0 && (
          <p className="text-xs leading-5 text-muted-foreground">
            O documento pode ser preparado agora e associado a uma sessão mais tarde. A associação à
            sessão é opcional e continua disponível em{" "}
            <a
              className="font-medium text-foreground underline underline-offset-4"
              href="#relacoes-assunto"
            >
              Ligações do assunto
            </a>
            .
          </p>
        )}

        {intencao && (
          <>
            <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
              <div>
                <label
                  htmlFor="documento-tipo"
                  className="mb-1 block text-xs font-medium text-foreground"
                >
                  Tipo documental
                </label>
                <Select
                  value={tipo}
                  onValueChange={(value) => escolherTipo(value as TipoDocumentoCriado)}
                >
                  <SelectTrigger id="documento-tipo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposDocumentos.map((opcao) => (
                      <SelectItem key={opcao} value={opcao}>
                        {opcao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label
                  htmlFor="documento-titulo"
                  className="mb-1 block text-xs font-medium text-foreground"
                >
                  Título sugerido
                </label>
                <Input
                  id="documento-titulo"
                  value={titulo}
                  onChange={(event) => {
                    setTitulo(event.target.value);
                    setTituloEditado(true);
                  }}
                  placeholder="Ex: Recomendação sobre iluminação pública"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="documento-informacao"
                className="mb-1 block text-xs font-medium text-foreground"
              >
                Informação adicional para o Tribuno
              </label>
              <p className="mb-2 text-xs leading-5 text-muted-foreground">
                O Tribuno utilizará também o resumo, objetivo, notas, acontecimentos e documentos
                associados a este assunto.
              </p>
              <Textarea
                id="documento-informacao"
                value={conteudo}
                onChange={(event) => setConteudo(event.target.value)}
                placeholder="Acrescente factos, argumentos, pedidos específicos ou indicações que devam constar do documento."
                rows={4}
              />
            </div>

            {erroGeracao && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                <div className="flex flex-wrap items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4" />
                  <span className="mr-auto">{erroGeracao}</span>
                  {erroGeracao.includes("perfil institucional") && (
                    <Button asChild type="button" size="sm" variant="outline">
                      <Link to="/definicoes">Completar perfil</Link>
                    </Button>
                  )}
                </div>
              </div>
            )}

            {erroLogo && (
              <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <div className="flex flex-wrap items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span className="mr-auto">{erroLogo}</span>
                  <Button asChild type="button" size="sm" variant="outline">
                    <Link to="/definicoes">Ir para Perfil</Link>
                  </Button>
                </div>
              </div>
            )}

            {erroInstitucional && (
              <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <div className="flex flex-wrap items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span className="mr-auto">{erroInstitucional}</span>
                  <Button asChild type="button" size="sm" variant="outline">
                    <Link to="/definicoes">Completar perfil</Link>
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button type="button" onClick={gerarDocumento} disabled={!titulo.trim() || gerando}>
                {gerando ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />A gerar documento...
                  </>
                ) : (
                  "Gerar documento"
                )}
              </Button>
            </div>
          </>
        )}
      </div>

      {sucesso && (
        <div
          className="mt-4 rounded-lg border border-status-concluida/40 bg-status-concluida/10 px-4 py-3 text-sm text-foreground"
          role="status"
        >
          {sucesso}
        </div>
      )}

      {documentos.length === 0 ? (
        <EmptyState
          compact
          className="mt-5"
          title="Ainda não há documentos deste assunto."
          description="Crie o primeiro rascunho quando este tema precisar de uma proposta, moção ou requerimento."
        />
      ) : (
        <div className="mt-5 grid gap-3">
          {documentos.map((documento) => (
            <ActionCard
              key={documento.id}
              className={documento.id === documentoCriadoId ? "ring-2 ring-primary/40" : undefined}
              icon={FileText}
              title={documento.titulo}
              description={metaAssociacao(documento)}
              meta={documento.tipo}
              action={
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                  {documento.assuntoId ? (
                    <Button asChild type="button" size="sm">
                      <Link to="/documentos/$documentoId" params={{ documentoId: documento.id }}>
                        Abrir e rever
                      </Link>
                    </Button>
                  ) : (
                    <Button type="button" size="sm" disabled>
                      Sem assunto associado
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setErroLogo(undefined);
                      setErroInstitucional(undefined);
                      exportarDocumentoCriadoPDF(documento, {
                        assunto: dossie?.titulo,
                      });
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => exportarDocumentoCriadoWord(documento)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Exportar para Word
                  </Button>
                </div>
              }
            >
              <div className="flex flex-wrap gap-2">
                <StatusBadge tone="muted">{estadoLabel(documento.estado)}</StatusBadge>
                {documento.assembleiaId && (
                  <StatusBadge tone="info" dot={false}>
                    Associado à sessão
                  </StatusBadge>
                )}
                {documento.pontoId && (
                  <StatusBadge tone="info" dot={false}>
                    Associado ao ponto
                  </StatusBadge>
                )}
              </div>
            </ActionCard>
          ))}
        </div>
      )}
    </WorkspaceSection>
  );
}
