import { useCallback, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, ClipboardList } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { StrategyField } from "@/components/estrategia/StrategyField";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SaveFeedback, type SaveFeedbackState } from "@/components/ui/SaveFeedback";
import { Button } from "@/components/ui/button";
import { PreparationGuidancePanel } from "@/components/preparacao/PreparationGuidancePanel";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useAssembleia } from "@/lib/assembleias-store";
import {
  guardarEstrategiaDaAssembleia,
  obterEstrategiaDaAssembleia,
  type EstrategiaSessao,
} from "@/lib/estrategia-store";

export const Route = createFileRoute("/_app/sessoes/$id/preparacao/estrategia")({
  head: () => ({
    meta: [
      { title: "Estratégia — Preparação — Tribuno" },
      {
        name: "description",
        content: "Briefing político da sessão: objetivo, mensagem principal, riscos e notas.",
      },
    ],
  }),
  component: PreparacaoEstrategiaPage,
});

function PreparacaoEstrategiaPage() {
  const { id } = Route.useParams();
  const assembleia = useAssembleia(id);
  const [saveState, setSaveState] = useState<SaveFeedbackState>("saved");

  const estrategiaInicial = useMemo(() => obterEstrategiaDaAssembleia(id), [id]);

  const guardarEstrategia = useCallback(
    (value: EstrategiaSessao) => {
      try {
        setSaveState("saving");
        guardarEstrategiaDaAssembleia(id, {
          objetivoPolitico: value.objetivoPolitico,
          mensagemPrincipal: value.mensagemPrincipal,
          naoFazer: value.naoFazer,
          adversariosPrevisiveis: value.adversariosPrevisiveis,
          notasLivres: value.notasLivres,
        });
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    },
    [id],
  );

  const [estrategia, setEstrategia] = useAutoSave<EstrategiaSessao>({
    initialValue: estrategiaInicial,
    delay: 500,
    onSave: guardarEstrategia,
  });

  function atualizarCampo(campo: keyof Omit<EstrategiaSessao, "assembleiaId">, valor: string) {
    setSaveState("unsaved");
    setEstrategia((atual) => ({
      ...atual,
      [campo]: valor,
    }));
  }

  if (!assembleia) {
    return (
      <>
        <TopBar breadcrumb="Estratégia" />
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
            description="A estratégia é guardada por Sessão. Esta Sessão não está disponível neste dispositivo."
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
            <span className="text-foreground">Estratégia</span>
          </span>
        }
      />

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
          icon={ClipboardList}
          title="Briefing político"
          description="Defina a linha política da sessão antes de preparar perguntas, intervenções ou documentos. As alterações são guardadas automaticamente."
          actions={<SaveFeedback state={saveState} />}
        />

        <PreparationGuidancePanel assembleiaId={id} className="mb-6" />

        <section className="space-y-4">
          <StrategyField
            label="Objetivo político"
            value={estrategia.objetivoPolitico}
            placeholder="Ex: Mostrar que o executivo não está a executar o que prometeu e exigir calendário concreto."
            onChange={(valor) => atualizarCampo("objetivoPolitico", valor)}
          />

          <StrategyField
            label="Mensagem principal"
            value={estrategia.mensagemPrincipal}
            placeholder="Ex: A freguesia precisa de respostas concretas, não de promessas repetidas."
            onChange={(valor) => atualizarCampo("mensagemPrincipal", valor)}
          />

          <StrategyField
            label="O que NÃO devo fazer"
            value={estrategia.naoFazer}
            placeholder="Ex: Não dispersar, não entrar em ataques pessoais, não responder a provocações laterais."
            onChange={(valor) => atualizarCampo("naoFazer", valor)}
          />

          <StrategyField
            label="Adversários previsíveis"
            value={estrategia.adversariosPrevisiveis}
            placeholder="Ex: Quem pode tentar desviar o debate, que argumentos podem usar e como responder."
            onChange={(valor) => atualizarCampo("adversariosPrevisiveis", valor)}
          />

          <StrategyField
            label="Notas livres"
            value={estrategia.notasLivres}
            placeholder="Notas gerais da preparação da sessão."
            rows={6}
            onChange={(valor) => atualizarCampo("notasLivres", valor)}
          />
        </section>
      </main>
    </>
  );
}
