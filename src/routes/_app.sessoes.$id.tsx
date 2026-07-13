import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Clock,
  Archive,
  Bot,
  CalendarDays,
  CheckCircle2,
  FileText,
  Landmark,
  ListChecks,
  MapPin,
  NotebookText,
  ScrollText,
  X,
  Trash2,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { formatarData } from "@/lib/mock-data";
import { arquivarAssembleia, useAssembleia } from "@/lib/assembleias-store";
import {
  confirmarDadosAssembleia,
  confirmarRevisaoFinalAssembleia,
  marcarAssembleiaPronta,
  reabrirPreparacaoAssembleia,
} from "@/lib/assembleias-store";
import { EditarAssembleiaDialog } from "@/components/assembleias/EditarAssembleiaDialog";
import { SessaoPreparacaoWizard } from "@/components/assembleias/SessaoPreparacaoWizard";
import { AdicionarDocumentoSheet } from "@/components/documentos/AdicionarDocumentoSheet";
import { AdicionarPontoDialog } from "@/components/preparacao/AdicionarPontoDialog";
import { EditarPontoDialog } from "@/components/preparacao/EditarPontoDialog";
import { PreparationGuidancePanel } from "@/components/preparacao/PreparationGuidancePanel";
import { Button } from "@/components/ui/button";
import { ActionCard, InfoCard } from "@/components/ui/cards";
import { SectionTitle, StatusBadge } from "@/components/ui/common";
import { EmptyState } from "@/components/ui/feedback";
import { Breadcrumb } from "@/components/ui/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Timeline, TimelineItem } from "@/components/ui/timeline";
import { WorkspaceHeader, WorkspaceLayout, WorkspaceSection } from "@/components/ui/workspace";
import { useDocumentosDaAssembleia } from "@/lib/documentos-store";
import {
  carregarDocumentosCriadosRemotosSeDisponivel,
  listarDocumentosACriarDaAssembleia,
  listarDocumentosACriarDoAssunto,
  subscreverDocumentosACriar,
} from "@/lib/documentos-a-criar-store";
import {
  carregarPontosRemotosSeDisponivel,
  obterPontosDaAssembleia,
  removerPontoConfirmado,
  reordenarPontosConfirmado,
} from "@/lib/pontos-store";
import { obterEstrategiaDaAssembleia } from "@/lib/estrategia-store";
import { useDossies } from "@/lib/dossies-store";
import {
  associarAssembleiaAoDossie,
  desassociarAssembleiaDoDossie,
  useDossiesAssociadosAAssembleia,
} from "@/lib/dossie-assembleias-store";
import { calcularFluxoSessao } from "@/lib/session-flow";
import type { Dossie, EstadoAssembleia } from "@/lib/types";

export const Route = createFileRoute("/_app/sessoes/$id")({
  head: () => ({
    meta: [
      { title: "Sessão — Tribuno" },
      {
        name: "description",
        content: "Preparação da sessão: documentos, pontos, estratégia e rascunhos.",
      },
    ],
  }),
  component: AssembleiaDetailPage,
});

function estadoLabel(estado: EstadoAssembleia) {
  if (estado === "preparacao") return "Em preparação";
  if (estado === "analise") return "Em análise";
  if (estado === "concluida") return "Concluída";
  return "Arquivada";
}

function estadoTone(estado: EstadoAssembleia) {
  if (estado === "concluida") return "success";
  if (estado === "analise") return "info";
  if (estado === "arquivada") return "muted";
  return "warning";
}

function AssembleiaDetailPage() {
  const { id } = Route.useParams();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const assembleia = useAssembleia(id);
  const documentos = useDocumentosDaAssembleia(id);
  const [versaoPontos, setVersaoPontos] = useState(0);
  const pontos = useMemo(() => obterPontosDaAssembleia(id), [id, versaoPontos]);
  const [versaoRascunhos, setVersaoRascunhos] = useState(0);
  const documentosACriarDiretos = useMemo(
    () => listarDocumentosACriarDaAssembleia(id),
    [id, versaoRascunhos],
  );
  const estrategia = useMemo(() => obterEstrategiaDaAssembleia(id), [id]);
  const dossies = useDossies();
  const relacoesAssuntos = useDossiesAssociadosAAssembleia(id);
  const [confirmarArquivo, setConfirmarArquivo] = useState(false);
  const [wizardAberto, setWizardAberto] = useState(false);
  const [assuntoParaAssociar, setAssuntoParaAssociar] = useState("");
  const [flowError, setFlowError] = useState("");
  const [flowSaving, setFlowSaving] = useState(false);
  const criticalSignature = `${documentos.map((documento) => `${documento.id}:${documento.estado}:${documento.updatedAt ?? ""}`).join("|")}::${pontos.map((ponto) => `${ponto.id}:${ponto.numero}:${ponto.updatedAt ?? ""}`).join("|")}`;
  const previousCriticalSignature = useRef<string | undefined>(undefined);

  useEffect(() => {
    void carregarPontosRemotosSeDisponivel().finally(() => {
      setVersaoPontos((valor) => valor + 1);
    });
  }, []);
  useEffect(() => subscreverDocumentosACriar(() => setVersaoRascunhos((v) => v + 1)), []);
  useEffect(() => {
    void carregarDocumentosCriadosRemotosSeDisponivel();
  }, []);
  useEffect(() => {
    if (previousCriticalSignature.current === undefined) {
      previousCriticalSignature.current = criticalSignature;
      return;
    }
    if (previousCriticalSignature.current !== criticalSignature) {
      previousCriticalSignature.current = criticalSignature;
      if (assembleia?.preparacaoEstado === "pronta") {
        void reabrirPreparacaoAssembleia(id).catch(() =>
          setFlowError("A sessão foi alterada, mas não foi possível reabrir a preparação."),
        );
      }
    }
  }, [assembleia?.preparacaoEstado, criticalSignature, id]);

  const assuntosDaSessao = useMemo(() => {
    return relacoesAssuntos
      .map((relacao) => dossies.find((dossie) => dossie.id === relacao.dossieId))
      .filter((dossie): dossie is Dossie => Boolean(dossie));
  }, [dossies, relacoesAssuntos]);

  const assuntosDaSessaoIds = useMemo(
    () => new Set(relacoesAssuntos.map((relacao) => relacao.dossieId)),
    [relacoesAssuntos],
  );

  const assuntosDisponiveis = useMemo(
    () => dossies.filter((dossie) => !dossie.archivedAt && !assuntosDaSessaoIds.has(dossie.id)),
    [assuntosDaSessaoIds, dossies],
  );

  const isSubRoute = pathname.includes(`/sessoes/${id}/`);

  if (isSubRoute) {
    return <Outlet />;
  }

  if (!assembleia) {
    return (
      <>
        <TopBar breadcrumb="Sessões" />
        <main className="min-h-screen bg-transparent">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
            <Button asChild variant="ghost" size="sm" className="mb-6">
              <Link to="/sessoes">Voltar às sessões</Link>
            </Button>
            <EmptyState
              title="Sessão não encontrada"
              description="A Sessão é o centro da preparação política e documental. Esta Sessão não está disponível neste dispositivo."
              action={
                <Button asChild>
                  <Link to="/sessoes">Ir para Sessões</Link>
                </Button>
              }
            />
          </div>
        </main>
      </>
    );
  }

  function arquivar() {
    if (!assembleia) return;

    if (!confirmarArquivo) {
      setConfirmarArquivo(true);
      return;
    }

    arquivarAssembleia(assembleia.id);
    setConfirmarArquivo(false);
  }

  const estaArquivada = assembleia.estado === "arquivada";
  const estrategiaTemConteudo = [
    estrategia.objetivoPolitico,
    estrategia.mensagemPrincipal,
    estrategia.naoFazer,
    estrategia.adversariosPrevisiveis,
    estrategia.notasLivres,
  ].some((campo) => campo.trim().length > 0);

  async function associarAssunto() {
    if (!assuntoParaAssociar) return;
    setFlowSaving(true);
    setFlowError("");
    try {
      await associarAssembleiaAoDossie(assuntoParaAssociar, id);
      setAssuntoParaAssociar("");
      if (assembleia?.preparacaoEstado === "pronta") await reabrirPreparacaoAssembleia(id);
    } catch {
      setFlowError("Não foi possível guardar a relação com o Assunto.");
    } finally {
      setFlowSaving(false);
    }
  }

  async function desassociarAssunto(dossie: Dossie) {
    const confirmado = window.confirm(`Remover o assunto "${dossie.titulo}" desta sessão?`);
    if (!confirmado) return;

    setFlowSaving(true);
    setFlowError("");
    try {
      await desassociarAssembleiaDoDossie(dossie.id, id);
      if (assembleia?.preparacaoEstado === "pronta") await reabrirPreparacaoAssembleia(id);
    } catch {
      setFlowError("Não foi possível remover a relação com o Assunto.");
    } finally {
      setFlowSaving(false);
    }
  }

  const documentosPoliticos = Array.from(
    new Map(
      [
        ...documentosACriarDiretos,
        ...assuntosDaSessao.flatMap((assunto) => listarDocumentosACriarDoAssunto(assunto.id)),
      ].map((documento) => [documento.id, documento]),
    ).values(),
  );
  const flow = calcularFluxoSessao({
    sessao: assembleia,
    documentos,
    pontos,
    assuntosCount: assuntosDaSessao.length,
    documentosPoliticosCount: documentosPoliticos.length,
  });

  async function executarFluxo(acao: () => Promise<unknown>, mensagem: string) {
    setFlowSaving(true);
    setFlowError("");
    try {
      await acao();
    } catch {
      setFlowError(mensagem);
    } finally {
      setFlowSaving(false);
    }
  }

  async function reordenarPonto(index: number, delta: number) {
    const destino = index + delta;
    if (destino < 0 || destino >= pontos.length) return;
    const ids = pontos.map((ponto) => ponto.id);
    [ids[index], ids[destino]] = [ids[destino], ids[index]];
    await executarFluxo(async () => {
      await reordenarPontosConfirmado(id, ids);
      if (assembleia?.preparacaoEstado === "pronta") await reabrirPreparacaoAssembleia(id);
      setVersaoPontos((v) => v + 1);
    }, "Não foi possível guardar a nova ordem dos pontos.");
  }

  async function removerPontoDaSessao(pontoId: string, titulo: string) {
    if (!window.confirm(`Remover o ponto "${titulo}"?`)) return;
    await executarFluxo(async () => {
      await removerPontoConfirmado(pontoId);
      if (assembleia?.preparacaoEstado === "pronta") await reabrirPreparacaoAssembleia(id);
      setVersaoPontos((v) => v + 1);
    }, "Não foi possível remover o ponto.");
  }

  return (
    <>
      <TopBar breadcrumb="Sessão" />
      <main className="min-h-screen bg-transparent">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <Breadcrumb items={[{ label: "Sessões" }, { label: assembleia.nome }]} />
            <Button asChild variant="ghost" size="sm">
              <Link to="/sessoes">Voltar às sessões</Link>
            </Button>
          </div>

          <WorkspaceLayout
            header={
              <WorkspaceHeader
                icon={Landmark}
                eyebrow="Sessão"
                title={assembleia.nome}
                description="Prepare esta reunião com documentos, pontos, estratégia e rascunhos."
                className="p-4 sm:p-7"
                actions={
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setWizardAberto(true)}
                      className="w-full sm:w-auto"
                    >
                      Preparar Sessão
                    </Button>
                    <EditarAssembleiaDialog assembleia={assembleia} />
                    {!estaArquivada && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={arquivar}
                        className="w-full sm:w-auto"
                      >
                        <Archive className="mr-2 h-4 w-4" />
                        {confirmarArquivo ? "Confirmar arquivo" : "Arquivar"}
                      </Button>
                    )}
                  </div>
                }
                meta={
                  <>
                    <StatusBadge tone={estadoTone(assembleia.estado)}>
                      {estadoLabel(assembleia.estado)}
                    </StatusBadge>
                    <StatusBadge tone="muted" dot={false}>
                      {formatarData(assembleia.data)}
                    </StatusBadge>
                    <StatusBadge tone="muted" dot={false}>
                      {assembleia.hora}
                    </StatusBadge>
                    <StatusBadge tone="muted" dot={false}>
                      {assembleia.local}
                    </StatusBadge>
                  </>
                }
              >
                {confirmarArquivo && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Clique novamente em{" "}
                    <span className="font-medium text-foreground">Confirmar arquivo</span> para
                    arquivar esta sessão.
                  </p>
                )}
              </WorkspaceHeader>
            }
            sidebar={
              <>
                <WorkspaceSection>
                  <PreparationGuidancePanel assembleiaId={id} />
                </WorkspaceSection>
              </>
            }
          >
            <WorkspaceSection>
              <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Passo {flow.currentStep} de {flow.steps.length}
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${flow.progress}%` }}
                    />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Próxima ação:{" "}
                    <span className="font-medium text-foreground">{flow.nextAction.action}</span>
                  </p>
                </div>
                <Button asChild size="sm">
                  <a href={flow.nextAction.href}>Continuar</a>
                </Button>
              </div>
              {flowError && <p className="mt-3 text-sm text-destructive">{flowError}</p>}
            </WorkspaceSection>

            <div id="dados" className="scroll-mt-24">
              <WorkspaceSection>
                <SectionTitle
                  icon={CalendarDays}
                  title="Dados da sessão"
                  description="Data, hora e local da reunião."
                />
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <InfoCard
                    icon={CalendarDays}
                    title="Data"
                    description={formatarData(assembleia.data)}
                  />
                  <InfoCard icon={Clock} title="Hora" description={assembleia.hora} />
                  <InfoCard icon={MapPin} title="Local" description={assembleia.local} />
                </div>
                <div className="mt-4 flex justify-end">
                  <Button
                    type="button"
                    variant={assembleia.dadosConfirmadosEm ? "secondary" : "primary"}
                    disabled={flowSaving}
                    onClick={() =>
                      executarFluxo(
                        () => confirmarDadosAssembleia(id),
                        "Não foi possível confirmar os dados no Supabase.",
                      )
                    }
                  >
                    {assembleia.dadosConfirmadosEm ? "Dados confirmados" : "Confirmar dados"}
                  </Button>
                </div>
              </WorkspaceSection>
            </div>

            <div id="documentos" className="scroll-mt-24">
              <WorkspaceSection>
                <SectionTitle
                  icon={FileText}
                  title="Documentos para rever"
                  description="Materiais que devem ser lidos antes da sessão."
                  actions={
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
                      <AdicionarDocumentoSheet assembleiaId={id} />
                      <Button asChild variant="secondary" size="sm" className="w-full sm:w-auto">
                        <Link to="/sessoes/$id/preparacao/documentos" params={{ id }}>
                          Ver todos
                        </Link>
                      </Button>
                    </div>
                  }
                />
                <div className="mt-5 grid gap-3">
                  {documentos.length === 0 ? (
                    <InfoCard
                      icon={FileText}
                      title="Ainda não existem documentos"
                      description="Adicione convocatórias, atas, propostas ou relatórios para rever antes da sessão."
                    />
                  ) : (
                    documentos.slice(0, 3).map((documento) => (
                      <ActionCard
                        key={documento.id}
                        icon={FileText}
                        title={documento.titulo}
                        description={documento.notas || documento.ficheiroNome || documento.tipo}
                        meta={`${documento.tipo} · ${formatarData(documento.data)}`}
                        action={
                          <Button asChild variant="secondary" size="sm">
                            <Link
                              to="/sessoes/$id/documentos/$docId"
                              params={{ id, docId: documento.id }}
                            >
                              Abrir
                            </Link>
                          </Button>
                        }
                      />
                    ))
                  )}
                </div>
              </WorkspaceSection>
            </div>

            <WorkspaceSection>
              <SectionTitle
                icon={CheckCircle2}
                title="Estratégia da sessão"
                description="Objetivo, mensagem e cuidados para esta reunião."
                actions={
                  <Button asChild variant="secondary" size="sm" className="w-full sm:w-auto">
                    <Link to="/sessoes/$id/preparacao/estrategia" params={{ id }}>
                      Editar estratégia
                    </Link>
                  </Button>
                }
              />
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <InfoCard
                  title="Objetivo"
                  description={estrategia.objetivoPolitico || "Ainda sem objetivo definido."}
                />
                <InfoCard
                  title="Mensagem principal"
                  description={
                    estrategia.mensagemPrincipal || "Ainda sem mensagem principal definida."
                  }
                />
                {!estrategiaTemConteudo && (
                  <InfoCard
                    title="Briefing por preencher"
                    description="Defina a linha política antes da sessão."
                    className="md:col-span-2"
                  />
                )}
              </div>
            </WorkspaceSection>

            <div id="pontos" className="scroll-mt-24">
              <WorkspaceSection>
                <SectionTitle
                  icon={ListChecks}
                  title="Pontos da ordem de trabalhos"
                  description="Pontos a preparar antes da reunião."
                  actions={
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
                      <AdicionarPontoDialog
                        assembleiaId={id}
                        onAdicionar={() => {
                          setVersaoPontos((valor) => valor + 1);
                          if (assembleia.preparacaoEstado === "pronta")
                            void reabrirPreparacaoAssembleia(id).catch(() =>
                              setFlowError(
                                "O ponto foi criado, mas não foi possível reabrir a preparação.",
                              ),
                            );
                        }}
                      />
                      <Button asChild variant="secondary" size="sm" className="w-full sm:w-auto">
                        <Link to="/sessoes/$id/preparacao/pontos" params={{ id }}>
                          Ver todos
                        </Link>
                      </Button>
                    </div>
                  }
                />
                <div className="mt-5 grid gap-3">
                  {pontos.length === 0 ? (
                    <InfoCard
                      icon={ListChecks}
                      title="Ainda não existem pontos"
                      description="Adicione pontos para preparar perguntas, notas e documentos associados."
                    />
                  ) : (
                    pontos.map((ponto, index) => (
                      <ActionCard
                        key={ponto.id}
                        icon={ListChecks}
                        title={`${ponto.numero}. ${ponto.titulo}`}
                        description={
                          ponto.descricao || ponto.objetivoPolitico || "Ponto por preparar."
                        }
                        meta={`${ponto.estado} · ${ponto.prioridade}`}
                        action={
                          <div className="flex flex-wrap justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={flowSaving || index === 0}
                              onClick={() => reordenarPonto(index, -1)}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={flowSaving || index === pontos.length - 1}
                              onClick={() => reordenarPonto(index, 1)}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            <EditarPontoDialog
                              ponto={ponto}
                              onUpdated={() => {
                                setVersaoPontos((v) => v + 1);
                                if (assembleia.preparacaoEstado === "pronta")
                                  void reabrirPreparacaoAssembleia(id).catch(() =>
                                    setFlowError(
                                      "O ponto foi editado, mas não foi possível reabrir a preparação.",
                                    ),
                                  );
                              }}
                            />
                            <Button asChild variant="secondary" size="sm">
                              <Link
                                to="/sessoes/$id/preparacao/pontos/$pontoId"
                                params={{ id, pontoId: ponto.id }}
                              >
                                Abrir
                              </Link>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={flowSaving}
                              onClick={() => removerPontoDaSessao(ponto.id, ponto.titulo)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        }
                      />
                    ))
                  )}
                </div>
              </WorkspaceSection>
            </div>

            <div id="documentos-politicos" className="scroll-mt-24">
              <WorkspaceSection>
                <SectionTitle
                  icon={ScrollText}
                  title="Documentos a criar"
                  description="Rascunhos que devem estar prontos para a sessão."
                  actions={
                    <Button asChild variant="secondary" size="sm" className="w-full sm:w-auto">
                      <Link to="/sessoes/$id/preparacao/documentos-a-criar" params={{ id }}>
                        Ver todos
                      </Link>
                    </Button>
                  }
                />
                <div className="mt-5 grid gap-3">
                  {documentosPoliticos.length === 0 ? (
                    <InfoCard
                      icon={ScrollText}
                      title="Ainda não existem rascunhos"
                      description="Crie moções, recomendações, requerimentos ou declarações quando forem necessários."
                    />
                  ) : (
                    documentosPoliticos.slice(0, 6).map((documento) => (
                      <ActionCard
                        key={documento.id}
                        icon={ScrollText}
                        title={documento.titulo}
                        description={documento.tipo}
                        meta={documento.estado}
                        action={
                          <Button asChild variant="secondary" size="sm">
                            <Link
                              to="/documentos/$documentoId"
                              params={{ documentoId: documento.id }}
                            >
                              Abrir
                            </Link>
                          </Button>
                        }
                      />
                    ))
                  )}
                </div>
              </WorkspaceSection>
            </div>

            <WorkspaceSection>
              <SectionTitle
                icon={Activity}
                title="O que aconteceu"
                description="História desta sessão."
              />
              <Timeline className="mt-5">
                <TimelineItem
                  icon={Landmark}
                  title="Sessão criada"
                  description="Sessão registada no Tribuno."
                  meta={formatarData(assembleia.data)}
                />
              </Timeline>
            </WorkspaceSection>

            <div id="assuntos" className="scroll-mt-24">
              <WorkspaceSection>
                <SectionTitle
                  icon={NotebookText}
                  title="Assuntos desta sessão"
                  description="Temas que serão discutidos ou trabalhados nesta reunião."
                />
                <div className="mt-5 grid gap-4">
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                    <Select
                      value={assuntoParaAssociar}
                      onValueChange={setAssuntoParaAssociar}
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
                      onClick={associarAssunto}
                      disabled={!assuntoParaAssociar}
                    >
                      Associar
                    </Button>
                  </div>

                  {assuntosDaSessao.length === 0 ? (
                    <EmptyState
                      compact
                      title="Nenhum assunto ligado a esta sessão."
                      description="Associe os temas que vão ser discutidos ou trabalhados nesta reunião."
                    />
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {assuntosDaSessao.map((dossie) => (
                        <ActionCard
                          key={dossie.id}
                          icon={NotebookText}
                          title={dossie.titulo}
                          description={dossie.resumo || "Assunto ligado a esta sessão."}
                          meta={`${dossie.estado} · ${dossie.prioridade}`}
                          action={
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => desassociarAssunto(dossie)}
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
              </WorkspaceSection>
            </div>

            <div id="verificacao-final" className="scroll-mt-24">
              <WorkspaceSection>
                <SectionTitle
                  icon={CheckCircle2}
                  title="Verificação final"
                  description="Requisitos obrigatórios, opcionais e confirmação humana."
                />
                <div className="mt-5 grid gap-2">
                  {flow.steps.map((step) => (
                    <div
                      key={step.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm"
                    >
                      <span>
                        {step.done ? "✓" : "○"} {step.label}
                      </span>
                      <StatusBadge
                        tone={
                          step.done
                            ? "success"
                            : step.requirement === "required"
                              ? "warning"
                              : "muted"
                        }
                      >
                        {step.requirement === "required" ? "Obrigatório" : "Opcional"}
                      </StatusBadge>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
                  {!assembleia.revisaoFinalConfirmadaEm && (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={
                        flowSaving || flow.missingRequired.some((step) => step.id !== "revisao")
                      }
                      onClick={() =>
                        executarFluxo(
                          () => confirmarRevisaoFinalAssembleia(id),
                          "Não foi possível confirmar a revisão final.",
                        )
                      }
                    >
                      Confirmar revisão final
                    </Button>
                  )}
                  {assembleia.preparacaoEstado === "pronta" ? (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={flowSaving}
                      onClick={() =>
                        executarFluxo(
                          () => reabrirPreparacaoAssembleia(id),
                          "Não foi possível voltar à preparação.",
                        )
                      }
                    >
                      Voltar à preparação
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      disabled={flowSaving || !flow.canMarkReady}
                      onClick={() =>
                        executarFluxo(
                          () => marcarAssembleiaPronta(id),
                          "Não foi possível marcar a sessão como pronta.",
                        )
                      }
                    >
                      Marcar sessão como pronta
                    </Button>
                  )}
                </div>
              </WorkspaceSection>
            </div>

            <WorkspaceSection>
              <SectionTitle
                icon={NotebookText}
                title="Ligado a esta sessão"
                description="Documentos, pessoas, entidades e compromissos ligados à sessão."
              />
              <div className="mt-5">
                <InfoCard
                  title="Funcionalidade futura"
                  description="This feature will be available in a future version."
                />
              </div>
            </WorkspaceSection>

            <WorkspaceSection>
              <SectionTitle
                icon={Bot}
                title="Assistente"
                description="Assistência contextual para preparação de sessão."
              />
              <div className="mt-5">
                <InfoCard
                  title="Funcionalidade futura"
                  description="This feature will be available in a future version."
                />
              </div>
            </WorkspaceSection>
          </WorkspaceLayout>
        </div>
      </main>
      <SessaoPreparacaoWizard
        open={wizardAberto}
        onOpenChange={setWizardAberto}
        assembleia={assembleia}
        documentos={documentos}
        pontos={pontos}
        documentosACriar={documentosACriarDiretos}
        estrategia={estrategia}
        onPontosChange={() => setVersaoPontos((valor) => valor + 1)}
      />
    </>
  );
}
