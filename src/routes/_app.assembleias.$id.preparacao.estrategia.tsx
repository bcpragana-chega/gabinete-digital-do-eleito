import { useCallback, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, ClipboardList } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { StrategyField } from "@/components/estrategia/StrategyField";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useAssembleia } from "@/lib/assembleias-store";
import {
  guardarEstrategiaDaAssembleia,
  obterEstrategiaDaAssembleia,
  type EstrategiaSessao,
} from "@/lib/estrategia-store";

export const Route = createFileRoute(
  "/_app/assembleias/$id/preparacao/estrategia",
)({
  head: () => ({
    meta: [
      { title: "Estratégia — Preparação — Tribuno" },
      {
        name: "description",
        content:
          "Briefing político da sessão: objetivo, mensagem principal, riscos e notas.",
      },
    ],
  }),
  component: PreparacaoEstrategiaPage,
});

function PreparacaoEstrategiaPage() {
  const { id } = Route.useParams();
  const assembleia = useAssembleia(id);

  const estrategiaInicial = useMemo(
    () => obterEstrategiaDaAssembleia(id),
    [id],
  );

  const guardarEstrategia = useCallback(
    (value: EstrategiaSessao) => {
      guardarEstrategiaDaAssembleia(id, {
        objetivoPolitico: value.objetivoPolitico,
        mensagemPrincipal: value.mensagemPrincipal,
        naoFazer: value.naoFazer,
        adversariosPrevisiveis: value.adversariosPrevisiveis,
        notasLivres: value.notasLivres,
      });
    },
    [id],
  );

  const [estrategia, setEstrategia] = useAutoSave<EstrategiaSessao>({
    initialValue: estrategiaInicial,
    delay: 500,
    onSave: guardarEstrategia,
  });

  function atualizarCampo(
    campo: keyof Omit<EstrategiaSessao, "assembleiaId">,
    valor: string,
  ) {
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

  return (
    <>
      <TopBar
        breadcrumb={
          <span>
            <Link
              to="/assembleias"
              className="hover:text-foreground transition-colors"
            >Sessões</Link>
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
            <span className="text-foreground">Estratégia</span>
          </span>
        }
      />

      <main className="px-8 py-10 max-w-7xl">
        <Link
          to="/assembleias/$id/preparacao"
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
        />

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
            onChange={(valor) =>
              atualizarCampo("adversariosPrevisiveis", valor)
            }
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
