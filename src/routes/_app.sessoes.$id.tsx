import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  Activity,
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
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { formatarData } from "@/lib/mock-data";
import { arquivarAssembleia, useAssembleia } from "@/lib/assembleias-store";
import { EditarAssembleiaDialog } from "@/components/assembleias/EditarAssembleiaDialog";
import { SessaoPreparacaoWizard } from "@/components/assembleias/SessaoPreparacaoWizard";
import { AdicionarDocumentoSheet } from "@/components/documentos/AdicionarDocumentoSheet";
import { AdicionarPontoDialog } from "@/components/preparacao/AdicionarPontoDialog";
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
import { listarDocumentosACriarDaAssembleia } from "@/lib/documentos-a-criar-store";
import { carregarPontosRemotosSeDisponivel, obterPontosDaAssembleia } from "@/lib/pontos-store";
import { obterEstrategiaDaAssembleia } from "@/lib/estrategia-store";
import { useDossies } from "@/lib/dossies-store";
import {
  criarRelacaoTribuno,
  removerRelacaoTribunoPorObjetos,
  useRelacoesPorObjeto,
} from "@/lib/relacoes-store";
import type { Dossie, EstadoAssembleia, RelacaoTribuno } from "@/lib/types";

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

function isRelacaoSessaoAssunto(relacao: RelacaoTribuno, sessaoId: string) {
  return (
    relacao.origemTipo === "sessao" &&
    relacao.origemId === sessaoId &&
    relacao.destinoTipo === "assunto" &&
    relacao.tipoRelacao === "discutido_em"
  );
}

function AssembleiaDetailPage() {
  const { id } = Route.useParams();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const assembleia = useAssembleia(id);
  const documentos = useDocumentosDaAssembleia(id);
  const [versaoPontos, setVersaoPontos] = useState(0);
  const pontos = useMemo(() => obterPontosDaAssembleia(id), [id, versaoPontos]);
  const documentosACriar = useMemo(() => listarDocumentosACriarDaAssembleia(id), [id]);
  const estrategia = useMemo(() => obterEstrategiaDaAssembleia(id), [id]);
  const dossies = useDossies();
  const relacoesDaSessao = useRelacoesPorObjeto("sessao", id);
  const [confirmarArquivo, setConfirmarArquivo] = useState(false);
  const [wizardAberto, setWizardAberto] = useState(false);
  const [assuntoParaAssociar, setAssuntoParaAssociar] = useState("");

  useEffect(() => {
    void carregarPontosRemotosSeDisponivel().finally(() => {
      setVersaoPontos((valor) => valor + 1);
    });
  }, []);

  const relacoesAssuntos = useMemo(
    () => relacoesDaSessao.filter((relacao) => isRelacaoSessaoAssunto(relacao, id)),
    [id, relacoesDaSessao],
  );

  const assuntosDaSessao = useMemo(() => {
    return relacoesAssuntos
      .map((relacao) => dossies.find((dossie) => dossie.id === relacao.destinoId))
      .filter((dossie): dossie is Dossie => Boolean(dossie));
  }, [dossies, relacoesAssuntos]);

  const assuntosDaSessaoIds = useMemo(
    () => new Set(relacoesAssuntos.map((relacao) => relacao.destinoId)),
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

  function associarAssunto() {
    if (!assuntoParaAssociar) return;

    criarRelacaoTribuno({
      origemTipo: "sessao",
      origemId: id,
      destinoTipo: "assunto",
      destinoId: assuntoParaAssociar,
      tipoRelacao: "discutido_em",
    });
    setAssuntoParaAssociar("");
  }

  function desassociarAssunto(dossie: Dossie) {
    const confirmado = window.confirm(`Remover o assunto "${dossie.titulo}" desta sessão?`);
    if (!confirmado) return;

    removerRelacaoTribunoPorObjetos({
      origemTipo: "sessao",
      origemId: id,
      destinoTipo: "assunto",
      destinoId: dossie.id,
      tipoRelacao: "discutido_em",
    });
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
            </WorkspaceSection>

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

            <WorkspaceSection>
              <SectionTitle
                icon={ListChecks}
                title="Pontos da ordem de trabalhos"
                description="Pontos a preparar antes da reunião."
                actions={
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
                    <AdicionarPontoDialog
                      assembleiaId={id}
                      onAdicionar={() => setVersaoPontos((valor) => valor + 1)}
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
                  pontos.slice(0, 4).map((ponto) => (
                    <ActionCard
                      key={ponto.id}
                      icon={ListChecks}
                      title={`${ponto.numero}. ${ponto.titulo}`}
                      description={
                        ponto.descricao || ponto.objetivoPolitico || "Ponto por preparar."
                      }
                      meta={`${ponto.estado} · ${ponto.prioridade}`}
                      action={
                        <Button asChild variant="secondary" size="sm">
                          <Link
                            to="/sessoes/$id/preparacao/pontos/$pontoId"
                            params={{ id, pontoId: ponto.id }}
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
                {documentosACriar.length === 0 ? (
                  <InfoCard
                    icon={ScrollText}
                    title="Ainda não existem rascunhos"
                    description="Crie moções, recomendações, requerimentos ou declarações quando forem necessários."
                  />
                ) : (
                  documentosACriar.slice(0, 3).map((documento) => (
                    <ActionCard
                      key={documento.id}
                      icon={ScrollText}
                      title={documento.titulo}
                      description={documento.tipo}
                      meta={documento.estado}
                      action={
                        <Button asChild variant="secondary" size="sm">
                          <Link
                            to="/sessoes/$id/preparacao/pontos/$pontoId/rascunhos/$rascunhoId"
                            params={{ id, pontoId: documento.pontoId, rascunhoId: documento.id }}
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
        documentosACriar={documentosACriar}
        estrategia={estrategia}
        onPontosChange={() => setVersaoPontos((valor) => valor + 1)}
      />
    </>
  );
}
