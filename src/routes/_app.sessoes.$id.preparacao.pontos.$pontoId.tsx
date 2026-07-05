import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { ChevronLeft, ClipboardList, ListOrdered, NotebookText } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { DocumentosACriarSection } from "@/components/preparacao/DocumentosACriarSection";
import { LigadoAoPontoSection } from "@/components/preparacao/LigadoAoPontoSection";
import { PontoDashboard } from "@/components/preparacao/PontoDashboard";
import {
  PontoPreparacaoForm,
  type PontoPreparacaoCampos,
} from "@/components/preparacao/PontoPreparacaoForm";
import { TimelineHistorico } from "@/components/preparacao/TimelineHistorico";
import { InfoCard } from "@/components/ui/cards";
import { SectionTitle, StatusBadge } from "@/components/ui/common";
import { EmptyState } from "@/components/ui/feedback";
import { Breadcrumb } from "@/components/ui/navigation";
import { WorkspaceHeader, WorkspaceLayout, WorkspaceSection } from "@/components/ui/workspace";
import { Button } from "@/components/ui/button";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useAssembleia } from "@/lib/assembleias-store";
import {
  listarDocumentosACriarDoPonto,
  subscreverDocumentosACriar,
} from "@/lib/documentos-a-criar-store";
import { useDossies } from "@/lib/dossies-store";
import { listarDocumentosLocais } from "@/lib/documentos-store";
import {
  atualizarPonto,
  carregarPontosRemotosSeDisponivel,
  obterPontoPorId,
  type PontoOrdemTrabalhos,
} from "@/lib/pontos-store";
import { obterPreparacaoDaAssembleia } from "@/lib/preparacao-store";
import {
  criarRelacaoTribuno,
  removerRelacaoTribunoPorObjetos,
  useRelacoesPorObjeto,
} from "@/lib/relacoes-store";
import { adicionarEventoHistorico } from "@/lib/historico-store";
import type { Documento, DocumentoCriado, Dossie, RelacaoTribuno } from "@/lib/types";

export const Route = createFileRoute("/_app/sessoes/$id/preparacao/pontos/$pontoId")({
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

type CamposPreparacaoPonto = PontoPreparacaoCampos;

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
  const [versaoPonto, setVersaoPonto] = useState(0);

  const ponto = useMemo(() => obterPontoPorId(id, pontoId), [id, pontoId, versaoPonto]);
  const preparacao = useMemo(() => obterPreparacaoDaAssembleia(id), [id]);
  const documentosBiblioteca = useMemo(() => documentosUnicos(listarDocumentosLocais()), []);

  useEffect(() => {
    void carregarPontosRemotosSeDisponivel().finally(() => {
      setVersaoPonto((valor) => valor + 1);
    });
  }, []);

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

      const estrategiaAntes = [
        ponto.descricao,
        ponto.objetivoPolitico,
        ponto.riscos,
        ponto.linhaIntervencao,
      ].some((valor) => valor.trim().length > 0);
      const estrategiaDepois = [
        campos.descricao,
        campos.objetivoPolitico,
        campos.riscos,
        campos.linhaIntervencao,
      ].some((valor) => valor.trim().length > 0);
      const estrategiaAlterada =
        ponto.descricao !== campos.descricao ||
        ponto.objetivoPolitico !== campos.objetivoPolitico ||
        ponto.riscos !== campos.riscos ||
        ponto.linhaIntervencao !== campos.linhaIntervencao;

      if (estrategiaAlterada && estrategiaDepois) {
        adicionarEventoHistorico({
          pontoId: ponto.id,
          tipo: "estrategia",
          acao: estrategiaAntes ? "Estratégia editada" : "Estratégia criada",
          descricao: estrategiaAntes ? "Estratégia editada." : "Estratégia criada.",
        });
      }

      if (ponto.notasInternas !== campos.notasInternas) {
        const antes = ponto.notasInternas.trim();
        const depois = campos.notasInternas.trim();

        adicionarEventoHistorico({
          pontoId: ponto.id,
          tipo: "nota",
          acao:
            !antes && depois ? "Nota criada" : antes && !depois ? "Nota eliminada" : "Nota editada",
          descricao:
            !antes && depois
              ? "Nota criada."
              : antes && !depois
                ? "Nota eliminada."
                : "Nota editada.",
        });
      }
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
      criarDashboardDoPonto(ponto, campos, documentosLigadosIds.size, rascunhos, preparacao.acoes),
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
    const documento = documentosBiblioteca.find((item) => item.id === documentoParaAssociar);

    criarRelacaoTribuno({
      origemTipo: "ponto",
      origemId: pontoId,
      destinoTipo: "documento",
      destinoId: documentoParaAssociar,
      tipoRelacao: "usado_em",
    });
    adicionarEventoHistorico({
      pontoId,
      tipo: "documento",
      acao: "Documento adicionado",
      descricao: documento
        ? `Documento "${documento.titulo}" adicionado.`
        : "Documento adicionado.",
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
    adicionarEventoHistorico({
      pontoId,
      tipo: "documento",
      acao: "Documento removido",
      descricao: `Documento "${documento.titulo}" removido.`,
    });

    if (documentosAssociadosIds.includes(documento.id)) {
      const proximos = documentosAssociadosIds.filter(
        (documentoId) => documentoId !== documento.id,
      );
      setDocumentosAssociadosIds(proximos);
      atualizarPonto(ponto.id, { documentos: proximos });
    }
  }

  if (pathname.includes(`/sessoes/${id}/preparacao/pontos/${pontoId}/rascunhos/`)) {
    return <Outlet />;
  }

  if (!assembleia) {
    return (
      <>
        <TopBar breadcrumb="Ponto" />
        <main className="px-8 py-10 max-w-7xl">
          <Link
            to="/sessoes"
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
            to="/sessoes/$id/preparacao/pontos"
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
            <Link to="/sessoes" className="hover:text-foreground transition-colors">
              Sessões
            </Link>
            <span className="mx-2 text-muted-foreground/60">/</span>
            <Link
              to="/sessoes/$id"
              params={{ id }}
              className="hover:text-foreground transition-colors"
            >
              {assembleia.nome}
            </Link>
            <span className="mx-2 text-muted-foreground/60">/</span>
            <Link
              to="/sessoes/$id/preparacao"
              params={{ id }}
              className="hover:text-foreground transition-colors"
            >
              Preparação
            </Link>
            <span className="mx-2 text-muted-foreground/60">/</span>
            <Link
              to="/sessoes/$id/preparacao/pontos"
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
              <Link to="/sessoes/$id/preparacao/pontos" params={{ id }}>
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
                  assuntosOrigem={assuntosLigados}
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

            <PontoPreparacaoForm campos={campos} onChange={atualizarCampo} />

            <TimelineHistorico pontoId={ponto.id} />
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

function ResumoItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}
