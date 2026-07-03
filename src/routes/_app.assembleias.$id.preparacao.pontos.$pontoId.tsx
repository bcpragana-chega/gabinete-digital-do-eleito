import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  FilePlus2,
  FileText,
  ListOrdered,
  NotebookText,
  Timer,
  X,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { StrategyField } from "@/components/estrategia/StrategyField";
import { ActionCard, InfoCard, MetricCard } from "@/components/ui/cards";
import { SectionTitle, StatusBadge } from "@/components/ui/common";
import { EmptyState } from "@/components/ui/feedback";
import { Breadcrumb } from "@/components/ui/navigation";
import {
  WorkspaceHeader,
  WorkspaceLayout,
  WorkspaceMetrics,
  WorkspaceSection,
} from "@/components/ui/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useAssembleia } from "@/lib/assembleias-store";
import {
  adicionarDocumentoACriarRascunho,
  listarDocumentosACriarDoPonto,
  subscreverDocumentosACriar,
} from "@/lib/documentos-a-criar-store";
import { useDossies } from "@/lib/dossies-store";
import { listarDocumentosLocais } from "@/lib/documentos-store";
import { atualizarPonto, obterPontoPorId, type PontoOrdemTrabalhos } from "@/lib/pontos-store";
import { obterPreparacaoDaAssembleia } from "@/lib/preparacao-store";
import {
  criarRelacaoTribuno,
  removerRelacaoTribunoPorObjetos,
  useRelacoesPorObjeto,
} from "@/lib/relacoes-store";
import { documentos as documentosMock } from "@/lib/mock-data";
import type { Documento, DocumentoCriado, Dossie, RelacaoTribuno, TipoDocumentoCriado } from "@/lib/types";

const tiposDocumentosACriar: TipoDocumentoCriado[] = [
  "Moção",
  "Recomendação",
  "Requerimento",
  "Declaração de voto",
];

export const Route = createFileRoute("/_app/assembleias/$id/preparacao/pontos/$pontoId")({
  head: () => ({
    meta: [
      { title: "Detalhe do ponto — Preparação — Tribuno" },
      {
        name: "description",
        content: "Detalhe de um ponto da ordem de trabalhos.",
      },
    ],
  }),
  component: PreparacaoPontoDetalhePage,
});

type CamposPreparacaoPonto = Pick<
  PontoOrdemTrabalhos,
  "descricao" | "objetivoPolitico" | "riscos" | "linhaIntervencao" | "notasInternas"
>;

function documentosUnicos(documentos: Documento[]) {
  const porId = new Map<string, Documento>();
  documentos.forEach((documento) => porId.set(documento.id, documento));
  return Array.from(porId.values()).sort((a, b) => b.data.localeCompare(a.data));
}

function isRelacaoPontoAssunto(relacao: RelacaoTribuno, pontoId: string) {
  return (
    relacao.origemTipo === "ponto" &&
    relacao.origemId === pontoId &&
    relacao.destinoTipo === "assunto" &&
    relacao.tipoRelacao === "relacionado_com"
  );
}

function isRelacaoPontoDocumento(relacao: RelacaoTribuno, pontoId: string) {
  return (
    relacao.origemTipo === "ponto" &&
    relacao.origemId === pontoId &&
    relacao.destinoTipo === "documento" &&
    relacao.tipoRelacao === "usado_em"
  );
}

function PreparacaoPontoDetalhePage() {
  const { id, pontoId } = Route.useParams();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const assembleia = useAssembleia(id);
  const dossies = useDossies();
  const relacoesDoPonto = useRelacoesPorObjeto("ponto", pontoId);

  const ponto = useMemo(() => obterPontoPorId(id, pontoId), [id, pontoId]);
  const preparacao = useMemo(() => obterPreparacaoDaAssembleia(id), [id]);
  const documentosBiblioteca = useMemo(
    () => documentosUnicos([...documentosMock, ...listarDocumentosLocais()]),
    [],
  );

  const camposIniciais = useMemo<CamposPreparacaoPonto>(
    () => ({
      descricao: ponto?.descricao ?? "",
      objetivoPolitico: ponto?.objetivoPolitico ?? "",
      riscos: ponto?.riscos ?? "",
      linhaIntervencao: ponto?.linhaIntervencao ?? "",
      notasInternas: ponto?.notasInternas ?? "",
    }),
    [ponto],
  );

  const guardarCampos = useCallback(
    (campos: CamposPreparacaoPonto) => {
      if (!ponto) return;
      atualizarPonto(ponto.id, campos);
    },
    [ponto],
  );

  const [campos, setCampos] = useAutoSave<CamposPreparacaoPonto>({
    initialValue: camposIniciais,
    delay: 500,
    onSave: guardarCampos,
  });

  const [documentosAssociadosIds, setDocumentosAssociadosIds] = useState<string[]>([]);
  const [rascunhos, setRascunhos] = useState<DocumentoCriado[]>([]);
  const [assuntoParaAssociar, setAssuntoParaAssociar] = useState("");
  const [documentoParaAssociar, setDocumentoParaAssociar] = useState("");

  const relacoesAssuntos = useMemo(
    () => relacoesDoPonto.filter((relacao) => isRelacaoPontoAssunto(relacao, pontoId)),
    [pontoId, relacoesDoPonto],
  );

  const assuntosLigados = useMemo(() => {
    return relacoesAssuntos
      .map((relacao) => dossies.find((dossie) => dossie.id === relacao.destinoId))
      .filter((dossie): dossie is Dossie => Boolean(dossie));
  }, [dossies, relacoesAssuntos]);

  const assuntosLigadosIds = useMemo(
    () => new Set(relacoesAssuntos.map((relacao) => relacao.destinoId)),
    [relacoesAssuntos],
  );

  const assuntosDisponiveis = useMemo(
    () => dossies.filter((dossie) => !dossie.archivedAt && !assuntosLigadosIds.has(dossie.id)),
    [assuntosLigadosIds, dossies],
  );

  const relacoesDocumentos = useMemo(
    () => relacoesDoPonto.filter((relacao) => isRelacaoPontoDocumento(relacao, pontoId)),
    [pontoId, relacoesDoPonto],
  );

  const documentosRelacionadosIds = useMemo(
    () => new Set(relacoesDocumentos.map((relacao) => relacao.destinoId)),
    [relacoesDocumentos],
  );

  const documentosLigadosIds = useMemo(
    () => new Set([...documentosAssociadosIds, ...Array.from(documentosRelacionadosIds)]),
    [documentosAssociadosIds, documentosRelacionadosIds],
  );

  const documentosLigados = useMemo(
    () => documentosBiblioteca.filter((documento) => documentosLigadosIds.has(documento.id)),
    [documentosBiblioteca, documentosLigadosIds],
  );

  const documentosDisponiveis = useMemo(
    () => documentosBiblioteca.filter((documento) => !documentosLigadosIds.has(documento.id)),
    [documentosBiblioteca, documentosLigadosIds],
  );

  const dashboard = useMemo(
    () =>
      criarDashboardDoPonto(
        ponto,
        campos,
        documentosLigadosIds.size,
        rascunhos,
        preparacao.acoes,
      ),
    [campos, documentosLigadosIds.size, ponto, preparacao.acoes, rascunhos],
  );

  useEffect(() => {
    setDocumentosAssociadosIds(ponto?.documentos ?? []);
  }, [ponto]);

  useEffect(() => {
    function carregarRascunhos() {
      setRascunhos(listarDocumentosACriarDoPonto(id, pontoId));
    }

    carregarRascunhos();
    return subscreverDocumentosACriar(carregarRascunhos);
  }, [id, pontoId]);

  function atualizarCampo(campo: keyof CamposPreparacaoPonto, valor: string) {
    setCampos((atuais) => ({
      ...atuais,
      [campo]: valor,
    }));
  }

  function associarAssuntoAoPonto() {
    if (!assuntoParaAssociar) return;

    criarRelacaoTribuno({
      origemTipo: "ponto",
      origemId: pontoId,
      destinoTipo: "assunto",
      destinoId: assuntoParaAssociar,
      tipoRelacao: "relacionado_com",
    });
    setAssuntoParaAssociar("");
  }

  function desassociarAssuntoDoPonto(dossie: Dossie) {
    const confirmado = window.confirm(`Remover o assunto "${dossie.titulo}" deste ponto?`);
    if (!confirmado) return;

    removerRelacaoTribunoPorObjetos({
      origemTipo: "ponto",
      origemId: pontoId,
      destinoTipo: "assunto",
      destinoId: dossie.id,
      tipoRelacao: "relacionado_com",
    });
  }

  function associarDocumentoAoPonto() {
    if (!documentoParaAssociar) return;

    criarRelacaoTribuno({
      origemTipo: "ponto",
      origemId: pontoId,
      destinoTipo: "documento",
      destinoId: documentoParaAssociar,
      tipoRelacao: "usado_em",
    });
    setDocumentoParaAssociar("");
  }

  function desassociarDocumentoDoPonto(documento: Documento) {
    const confirmado = window.confirm(`Remover o documento "${documento.titulo}" deste ponto?`);
    if (!confirmado || !ponto) return;

    removerRelacaoTribunoPorObjetos({
      origemTipo: "ponto",
      origemId: pontoId,
      destinoTipo: "documento",
      destinoId: documento.id,
      tipoRelacao: "usado_em",
    });

    if (documentosAssociadosIds.includes(documento.id)) {
      const proximos = documentosAssociadosIds.filter((documentoId) => documentoId !== documento.id);
      setDocumentosAssociadosIds(proximos);
      atualizarPonto(ponto.id, { documentos: proximos });
    }
  }

  if (pathname.includes(`/assembleias/${id}/preparacao/pontos/${pontoId}/rascunhos/`)) {
    return <Outlet />;
  }

  if (!assembleia) {
    return (
      <>
        <TopBar breadcrumb="Ponto" />
        <main className="px-8 py-10 max-w-7xl">
          <Link
            to="/assembleias"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Todas as assembleias
          </Link>

          <EmptyState
            title="Sessão não encontrada"
            description="Esta assembleia pode ter sido removida ou ainda não estar disponível neste navegador."
          />
        </main>
      </>
    );
  }

  if (!ponto) {
    return (
      <>
        <TopBar breadcrumb="Ponto" />
        <main className="px-8 py-10 max-w-7xl">
          <Link
            to="/assembleias/$id/preparacao/pontos"
            params={{ id }}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Voltar aos pontos
          </Link>

          <EmptyState
            title="Ponto não encontrado"
            description="Este ponto pode ter sido removido ou ainda não estar disponível neste navegador."
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
            <Link to="/assembleias" className="hover:text-foreground transition-colors">Sessões</Link>
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
              to="/assembleias/$id/preparacao"
              params={{ id }}
              className="hover:text-foreground transition-colors"
            >
              Preparação
            </Link>
            <span className="mx-2 text-muted-foreground/60">/</span>
            <Link
              to="/assembleias/$id/preparacao/pontos"
              params={{ id }}
              className="hover:text-foreground transition-colors"
            >
              Pontos
            </Link>
            <span className="mx-2 text-muted-foreground/60">/</span>
            <span className="text-foreground">Ponto {ponto.numero}</span>
          </span>
        }
      />

      <main className="min-h-screen bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <Breadcrumb
              items={[
                { label: "Sessões" },
                { label: assembleia.nome },
                { label: "Preparação" },
                { label: "Pontos" },
                { label: `Ponto ${ponto.numero}` },
              ]}
            />

            <Button asChild variant="secondary" size="sm">
              <Link to="/assembleias/$id/preparacao/pontos" params={{ id }}>
                <ChevronLeft className="h-3.5 w-3.5" />
                Voltar aos pontos
              </Link>
            </Button>
          </div>

          <WorkspaceLayout
            header={
              <WorkspaceHeader
                icon={ListOrdered}
                eyebrow={`Ponto ${ponto.numero} · ${assembleia.nome}`}
                title={ponto.titulo}
                description={campos.descricao || "Sem resumo registado."}
                meta={
                  <>
                    <StatusBadge tone="warning" dot={false}>
                      Prioridade: {ponto.prioridade}
                    </StatusBadge>
                    <StatusBadge tone="muted">{ponto.estado}</StatusBadge>
                    <StatusBadge tone="muted" dot={false}>
                      Voto: {ponto.sentidoVoto}
                    </StatusBadge>
                    {ponto.tempoEstimado && (
                      <StatusBadge tone="muted" dot={false}>
                        {ponto.tempoEstimado} min
                      </StatusBadge>
                    )}
                  </>
                }
              />
            }
            sidebar={
              <>
                <DocumentosACriarSection
                  assembleiaId={id}
                  pontoId={ponto.id}
                  rascunhos={rascunhos}
                  onCriarRascunho={() => setRascunhos(listarDocumentosACriarDoPonto(id, ponto.id))}
                />

                <WorkspaceSection>
                  <SectionTitle icon={NotebookText} title="Resumo operacional" />
                  <dl className="mt-4 space-y-3 text-sm">
                    <ResumoItem label="Perguntas" value={ponto.perguntas.length} />
                    <ResumoItem label="Ações" value={ponto.acoes.length} />
                    <ResumoItem label="Documentos" value={documentosLigadosIds.size} />
                    <ResumoItem label="Rascunhos" value={rascunhos.length} />
                  </dl>
                </WorkspaceSection>
              </>
            }
            sidebarClassName="xl:sticky xl:top-24 xl:self-start"
          >
            <PontoDashboard
              estado={ponto.estado}
              documentosAssociados={dashboard.documentosAssociados}
              notas={dashboard.notas}
              documentosCriados={dashboard.documentosCriados}
              tarefasConcluidas={dashboard.tarefasConcluidas}
              tarefasPendentes={dashboard.tarefasPendentes}
              progresso={dashboard.progresso}
            />

            <LigadoAoPontoSection
              assuntosLigados={assuntosLigados}
              assuntosDisponiveis={assuntosDisponiveis}
              assuntoParaAssociar={assuntoParaAssociar}
              onAssuntoChange={setAssuntoParaAssociar}
              onAssociarAssunto={associarAssuntoAoPonto}
              onDesassociarAssunto={desassociarAssuntoDoPonto}
              documentosLigados={documentosLigados}
              documentosDisponiveis={documentosDisponiveis}
              documentosRelacionadosIds={documentosRelacionadosIds}
              documentosLegadosIds={new Set(documentosAssociadosIds)}
              documentoParaAssociar={documentoParaAssociar}
              onDocumentoChange={setDocumentoParaAssociar}
              onAssociarDocumento={associarDocumentoAoPonto}
              onDesassociarDocumento={desassociarDocumentoDoPonto}
            />

            <WorkspaceSection>
              <SectionTitle
                icon={ClipboardList}
                title="Estratégia"
                description="Resumo, objetivo político, riscos e linha de intervenção. As alterações são guardadas automaticamente."
              />

              <div className="mt-5 space-y-5">
                <StrategyField
                  label="Resumo do ponto"
                  value={campos.descricao}
                  placeholder="Resumo curto do que está em discussão neste ponto."
                  rows={5}
                  onChange={(valor) => atualizarCampo("descricao", valor)}
                />

                <StrategyField
                  label="Objetivo político"
                  value={campos.objetivoPolitico}
                  placeholder="Ex: Mostrar impacto concreto na freguesia e exigir calendário de execução."
                  onChange={(valor) => atualizarCampo("objetivoPolitico", valor)}
                />

                <StrategyField
                  label="Riscos"
                  value={campos.riscos}
                  placeholder="Riscos políticos, técnicos ou procedimentais a ter em conta."
                  onChange={(valor) => atualizarCampo("riscos", valor)}
                />

                <StrategyField
                  label="Linha de intervenção"
                  value={campos.linhaIntervencao}
                  placeholder="Como intervir neste ponto: tom, argumentos centrais e sequência."
                  rows={6}
                  onChange={(valor) => atualizarCampo("linhaIntervencao", valor)}
                />
              </div>
            </WorkspaceSection>

            <WorkspaceSection>
              <SectionTitle
                icon={NotebookText}
                title="Notas internas"
                description="Apontamentos de preparação, cautelas, perguntas e informação de apoio."
              />

              <div className="mt-5">
                <StrategyField
                  label="Notas internas"
                  value={campos.notasInternas}
                  placeholder="Notas de preparação, cautelas, perguntas ou apontamentos internos."
                  rows={7}
                  onChange={(valor) => atualizarCampo("notasInternas", valor)}
                />
              </div>
            </WorkspaceSection>
          </WorkspaceLayout>
        </div>
      </main>
    </>
  );
}

function criarDashboardDoPonto(
  ponto: PontoOrdemTrabalhos | undefined,
  campos: CamposPreparacaoPonto,
  documentosAssociados: number,
  rascunhos: DocumentoCriado[],
  acoesDaAssembleia: Array<{ id: string; estado: string }>,
) {
  const notas = [
    campos.descricao,
    campos.objetivoPolitico,
    campos.riscos,
    campos.linhaIntervencao,
    campos.notasInternas,
  ].filter((valor) => valor.trim().length > 0).length;

  const acoesDoPonto = acoesDaAssembleia.filter((acao) => ponto?.acoes.includes(acao.id));
  const tarefasConcluidas = acoesDoPonto.filter((acao) => acao.estado === "Concluída").length;
  const tarefasPendentes =
    acoesDoPonto.length > 0 ? acoesDoPonto.length - tarefasConcluidas : (ponto?.acoes.length ?? 0);

  const indicadoresPreparados = [
    ponto?.estado === "Preparado" || ponto?.estado === "Concluído",
    notas >= 3,
    documentosAssociados > 0,
    rascunhos.length > 0,
    tarefasPendentes === 0 && (tarefasConcluidas > 0 || (ponto?.acoes.length ?? 0) === 0),
  ].filter(Boolean).length;

  return {
    documentosAssociados,
    notas,
    documentosCriados: rascunhos.length,
    tarefasConcluidas,
    tarefasPendentes,
    progresso: Math.round((indicadoresPreparados / 5) * 100),
  };
}

function PontoDashboard({
  estado,
  documentosAssociados,
  notas,
  documentosCriados,
  tarefasConcluidas,
  tarefasPendentes,
  progresso,
}: {
  estado: string;
  documentosAssociados: number;
  notas: number;
  documentosCriados: number;
  tarefasConcluidas: number;
  tarefasPendentes: number;
  progresso: number;
}) {
  return (
    <WorkspaceSection
      title="Resumo executivo"
      description="O essencial para perceber rapidamente o estado deste ponto."
      actions={<StatusBadge tone="muted">{estado}</StatusBadge>}
    >
      <WorkspaceMetrics className="lg:grid-cols-5">
        <MetricCard label="Documentos" value={documentosAssociados} />
        <MetricCard label="Notas" value={notas} />
        <MetricCard label="Documentos criados" value={documentosCriados} />
        <MetricCard label="Tarefas concluídas" value={tarefasConcluidas} icon={CheckCircle2} />
        <MetricCard label="Tarefas pendentes" value={tarefasPendentes} icon={Timer} />
      </WorkspaceMetrics>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>Progresso da preparação</span>
          <span>{progresso}%</span>
        </div>
        <Progress value={progresso} />
      </div>
    </WorkspaceSection>
  );
}

function LigadoAoPontoSection({
  assuntosLigados,
  assuntosDisponiveis,
  assuntoParaAssociar,
  onAssuntoChange,
  onAssociarAssunto,
  onDesassociarAssunto,
  documentosLigados,
  documentosDisponiveis,
  documentosRelacionadosIds,
  documentosLegadosIds,
  documentoParaAssociar,
  onDocumentoChange,
  onAssociarDocumento,
  onDesassociarDocumento,
}: {
  assuntosLigados: Dossie[];
  assuntosDisponiveis: Dossie[];
  assuntoParaAssociar: string;
  onAssuntoChange: (id: string) => void;
  onAssociarAssunto: () => void;
  onDesassociarAssunto: (dossie: Dossie) => void;
  documentosLigados: Documento[];
  documentosDisponiveis: Documento[];
  documentosRelacionadosIds: Set<string>;
  documentosLegadosIds: Set<string>;
  documentoParaAssociar: string;
  onDocumentoChange: (id: string) => void;
  onAssociarDocumento: () => void;
  onDesassociarDocumento: (documento: Documento) => void;
}) {
  return (
    <WorkspaceSection>
      <SectionTitle
        icon={NotebookText}
        title="Ligado a este ponto"
        description="Assuntos e documentos que dão contexto a este ponto da ordem de trabalhos."
      />

      <div className="mt-5 grid gap-6 xl:grid-cols-2">
        <div className="min-w-0 rounded-2xl border border-border bg-background/60 p-4">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">Assuntos</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Temas do mandato relacionados com este ponto.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <Select
              value={assuntoParaAssociar}
              onValueChange={onAssuntoChange}
              disabled={assuntosDisponiveis.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    assuntosDisponiveis.length === 0
                      ? "Todos os assuntos disponíveis já estão ligados"
                      : "Selecionar assunto existente"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {assuntosDisponiveis.map((dossie) => (
                  <SelectItem key={dossie.id} value={dossie.id}>
                    {dossie.titulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onAssociarAssunto}
              disabled={!assuntoParaAssociar}
            >
              Associar
            </Button>
          </div>

          {assuntosLigados.length === 0 ? (
            <EmptyState
              compact
              className="mt-4"
              title="Nenhum assunto ligado."
              description="Associe um assunto para ligar este ponto ao acompanhamento do mandato."
            />
          ) : (
            <div className="mt-4 grid gap-3">
              {assuntosLigados.map((dossie) => (
                <ActionCard
                  key={dossie.id}
                  icon={NotebookText}
                  title={dossie.titulo}
                  description={dossie.resumo || "Assunto ligado a este ponto."}
                  meta={`${dossie.estado} · ${dossie.prioridade}`}
                  action={
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onDesassociarAssunto(dossie)}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Remover
                    </Button>
                  }
                />
              ))}
            </div>
          )}
        </div>

        <div className="min-w-0 rounded-2xl border border-border bg-background/60 p-4">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">Documentos</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Documentos da Biblioteca usados para preparar este ponto.
            </p>
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
                      ? "Todos os documentos disponíveis já estão ligados"
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
              className="mt-4"
              title="Nenhum documento ligado."
              description="Associe documentos da Biblioteca para apoiar este ponto."
            />
          ) : (
            <div className="mt-4 grid gap-3">
              {documentosLigados.map((documento) => {
                const viaRelacao = documentosRelacionadosIds.has(documento.id);
                const viaAntiga = documentosLegadosIds.has(documento.id);

                return (
                  <ActionCard
                    key={documento.id}
                    icon={FileText}
                    title={documento.titulo}
                    description={documento.notas || documento.ficheiroNome || "Documento ligado a este ponto."}
                    meta={`${documento.tipo} · ${documento.estado}${viaAntiga && !viaRelacao ? " · associação antiga" : ""}`}
                    action={
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onDesassociarDocumento(documento)}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Remover
                      </Button>
                    }
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </WorkspaceSection>
  );
}

function DocumentosACriarSection({
  assembleiaId,
  pontoId,
  rascunhos,
  onCriarRascunho,
}: {
  assembleiaId: string;
  pontoId: string;
  rascunhos: DocumentoCriado[];
  onCriarRascunho: () => void;
}) {
  const [tipo, setTipo] = useState<TipoDocumentoCriado>("Moção");
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");

  function criarRascunho() {
    const tituloLimpo = titulo.trim();
    const conteudoLimpo = conteudo.trim();

    if (!tituloLimpo) return;

    adicionarDocumentoACriarRascunho({
      tipo,
      titulo: tituloLimpo,
      conteudo: conteudoLimpo || "Rascunho inicial.",
      pontoId,
      assembleiaId,
    });

    onCriarRascunho();
    setTipo("Moção");
    setTitulo("");
    setConteudo("");
  }

  return (
    <WorkspaceSection>
      <SectionTitle
        icon={FilePlus2}
        title="Documentos criados"
        description="Rascunhos ligados a este ponto da ordem de trabalhos."
      />

      <div className="mt-4 space-y-3 rounded-2xl border border-border bg-background/60 p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">Tipo</label>
          <Select value={tipo} onValueChange={(value) => setTipo(value as TipoDocumentoCriado)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tiposDocumentosACriar.map((tipoDocumento) => (
                <SelectItem key={tipoDocumento} value={tipoDocumento}>
                  {tipoDocumento}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">Título</label>
          <Input
            value={titulo}
            onChange={(event) => setTitulo(event.target.value)}
            placeholder="Ex: Recomendação sobre execução do ponto"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-foreground">Conteúdo inicial</label>
          <Textarea
            value={conteudo}
            onChange={(event) => setConteudo(event.target.value)}
            placeholder="Escreva o primeiro rascunho ou uma nota base."
            rows={5}
          />
        </div>

        <div className="flex justify-end">
          <Button type="button" size="sm" onClick={criarRascunho} disabled={!titulo.trim()}>
            Criar rascunho
          </Button>
        </div>
      </div>

      {rascunhos.length === 0 ? (
        <EmptyState compact className="mt-4" title="Ainda não há rascunhos criados para este ponto." />
      ) : (
        <div className="mt-4 space-y-3">
          {rascunhos.map((rascunho) => (
            <ActionCard
              key={rascunho.id}
              icon={FilePlus2}
              title={rascunho.titulo}
              meta={`${rascunho.tipo} · ${rascunho.estado}`}
              action={
                <Button asChild size="sm" variant="secondary">
                  <Link
                    to="/assembleias/$id/preparacao/pontos/$pontoId/rascunhos/$rascunhoId"
                    params={{
                      id: assembleiaId,
                      pontoId,
                      rascunhoId: rascunho.id,
                    }}
                  >
                    Abrir
                  </Link>
                </Button>
              }
            >
              <p className="mt-3 line-clamp-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {rascunho.conteudo}
              </p>
            </ActionCard>
          ))}
        </div>
      )}
    </WorkspaceSection>
  );
}

function ResumoItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}
