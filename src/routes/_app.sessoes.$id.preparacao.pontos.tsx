import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, ArrowUp, ChevronLeft, ListOrdered, Trash2 } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { AdicionarPontoDialog } from "@/components/preparacao/AdicionarPontoDialog";
import { EditarPontoDialog } from "@/components/preparacao/EditarPontoDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { PreparationGuidancePanel } from "@/components/preparacao/PreparationGuidancePanel";
import { useAssembleia } from "@/lib/assembleias-store";
import {
  carregarPontosRemotosSeDisponivel,
  obterPontosDaAssembleia,
  removerPontoConfirmado,
  reordenarPontosConfirmado,
} from "@/lib/pontos-store";
import { reabrirPreparacaoAssembleia } from "@/lib/assembleias-store";

export const Route = createFileRoute("/_app/sessoes/$id/preparacao/pontos")({
  head: () => ({
    meta: [
      { title: "Pontos — Preparação — Tribuno" },
      {
        name: "description",
        content: "Pontos da ordem de trabalhos da sessão.",
      },
    ],
  }),
  component: PreparacaoPontosPage,
});

function PreparacaoPontosPage() {
  const { id } = Route.useParams();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const assembleia = useAssembleia(id);
  const [versao, setVersao] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const pontos = useMemo(() => obterPontosDaAssembleia(id), [id, versao]);

  const isSubRoute = pathname.includes(`/sessoes/${id}/preparacao/pontos/`);

  useEffect(() => {
    void carregarPontosRemotosSeDisponivel().finally(() => {
      setVersao((valor) => valor + 1);
    });
  }, []);

  function atualizarPontos() {
    setVersao((valor) => valor + 1);
    if (assembleia?.preparacaoEstado === "pronta")
      void reabrirPreparacaoAssembleia(id).catch(() =>
        setError("A alteração foi guardada, mas não foi possível reabrir a preparação."),
      );
  }

  function abrirPonto(pontoId: string) {
    navigate({
      to: "/sessoes/$id/preparacao/pontos/$pontoId",
      params: {
        id,
        pontoId,
      },
    });
  }

  async function alterarOrdem(index: number, delta: number) {
    const destino = index + delta;
    if (destino < 0 || destino >= pontos.length) return;
    const ids = pontos.map((ponto) => ponto.id);
    [ids[index], ids[destino]] = [ids[destino], ids[index]];
    setSaving(true);
    setError("");
    try {
      await reordenarPontosConfirmado(id, ids);
      if (assembleia?.preparacaoEstado === "pronta") await reabrirPreparacaoAssembleia(id);
      atualizarPontos();
    } catch {
      setError("Não foi possível guardar a nova ordem no Supabase.");
    } finally {
      setSaving(false);
    }
  }

  async function remover(idPonto: string, titulo: string) {
    if (!window.confirm(`Remover o ponto "${titulo}"?`)) return;
    setSaving(true);
    setError("");
    try {
      await removerPontoConfirmado(idPonto);
      if (assembleia?.preparacaoEstado === "pronta") await reabrirPreparacaoAssembleia(id);
      atualizarPontos();
    } catch {
      setError("Não foi possível remover o ponto no Supabase.");
    } finally {
      setSaving(false);
    }
  }

  if (isSubRoute) {
    return <Outlet />;
  }

  if (!assembleia) {
    return (
      <>
        <TopBar breadcrumb="Pontos" />
        <main className="px-8 py-10 max-w-7xl">
          <Link
            to="/sessoes"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Todas as sessões
          </Link>

          <EmptyState
            title="Sessão não encontrada"
            description="Os pontos da ordem de trabalhos são preparados por Sessão. Esta Sessão não está disponível neste dispositivo."
            action={
              <Button asChild>
                <Link to="/sessoes">Ir para Sessões</Link>
              </Button>
            }
          />
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar breadcrumb="Pontos" />

      <main className="px-8 py-10 max-w-7xl">
        <Link
          to="/sessoes/$id/preparacao"
          params={{ id }}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Voltar à preparação
        </Link>

        <PageHeader
          icon={ListOrdered}
          title="Pontos da Ordem de Trabalhos"
          description="Organize aqui os pontos da sessão e prepare notas, perguntas, ações, sentido de voto e documentos associados a cada ponto."
          actions={<AdicionarPontoDialog assembleiaId={id} onAdicionar={atualizarPontos} />}
        />

        <PreparationGuidancePanel assembleiaId={id} className="mb-6" />
        {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

        {pontos.length === 0 ? (
          <EmptyState
            title="Ainda não existem pontos nesta Sessão"
            description="Os pontos orientam perguntas, intervenções e documentos. Adicione o primeiro ponto para avançar na preparação."
            action={<AdicionarPontoDialog assembleiaId={id} onAdicionar={atualizarPontos} />}
          />
        ) : (
          <section className="grid gap-4 md:grid-cols-2">
            {pontos.map((ponto, index) => (
              <article
                key={ponto.id}
                className="rounded-2xl border border-border bg-card p-5 shadow-card"
              >
                <button
                  type="button"
                  onClick={() => abrirPonto(ponto.id)}
                  className="group block w-full text-left"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Ponto {ponto.numero}
                      </div>
                      <h2 className="mt-2 font-display text-xl font-semibold tracking-tight text-foreground">
                        {ponto.titulo}
                      </h2>
                    </div>

                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </div>

                  {ponto.descricao && (
                    <p className="mt-3 text-sm text-muted-foreground">{ponto.descricao}</p>
                  )}
                </button>
                <div className="mt-4 flex flex-wrap items-center justify-end gap-1 border-t border-border pt-3">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={saving || index === 0}
                    onClick={() => alterarOrdem(index, -1)}
                  >
                    <ArrowUp className="h-4 w-4" /> Subir
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={saving || index === pontos.length - 1}
                    onClick={() => alterarOrdem(index, 1)}
                  >
                    <ArrowDown className="h-4 w-4" /> Descer
                  </Button>
                  <EditarPontoDialog ponto={ponto} onUpdated={atualizarPontos} />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={saving}
                    onClick={() => remover(ponto.id, ponto.titulo)}
                  >
                    <Trash2 className="h-4 w-4" /> Remover
                  </Button>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
    </>
  );
}
