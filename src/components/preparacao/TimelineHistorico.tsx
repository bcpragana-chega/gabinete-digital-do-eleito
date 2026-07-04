import {
  Bot,
  FilePlus2,
  FileText,
  HelpCircle,
  MessageSquareText,
  ShieldCheck,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SectionTitle } from "@/components/ui/common";
import { EmptyState } from "@/components/ui/feedback";
import { WorkspaceSection } from "@/components/ui/workspace";
import { useHistoricoDoPonto } from "@/lib/historico-store";
import type { HistoricoEvento, TipoHistoricoEvento } from "@/lib/types";

type TimelineHistoricoProps = {
  pontoId: string;
};

const icons: Record<TipoHistoricoEvento, LucideIcon> = {
  documento: FileText,
  nota: MessageSquareText,
  estrategia: Target,
  posicao: ShieldCheck,
  pergunta: HelpCircle,
  "documento-criado": FilePlus2,
  ia: Bot,
};

function dataKey(data: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(data));
}

function tituloGrupo(data: string) {
  const hoje = dataKey(new Date().toISOString());
  const ontemDate = new Date();
  ontemDate.setDate(ontemDate.getDate() - 1);
  const ontem = dataKey(ontemDate.toISOString());
  const atual = dataKey(data);

  if (atual === hoje) return "Hoje";
  if (atual === ontem) return "Ontem";

  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(data));
}

function hora(data: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(data));
}

function agruparPorData(eventos: HistoricoEvento[]) {
  return eventos.reduce<Array<{ data: string; eventos: HistoricoEvento[] }>>((grupos, evento) => {
    const chave = dataKey(evento.data);
    const grupo = grupos.find((item) => item.data === chave);

    if (grupo) {
      grupo.eventos.push(evento);
      return grupos;
    }

    return [...grupos, { data: chave, eventos: [evento] }];
  }, []);
}

export function TimelineHistorico({ pontoId }: TimelineHistoricoProps) {
  const eventos = useHistoricoDoPonto(pontoId);
  const grupos = agruparPorData(eventos);

  return (
    <WorkspaceSection>
      <SectionTitle
        icon={MessageSquareText}
        title="Histórico"
        description="Memória automática da preparação deste ponto."
      />

      {eventos.length === 0 ? (
        <EmptyState
          compact
          className="mt-5"
          title="Ainda não há histórico."
          description="As ações relevantes feitas neste ponto vão aparecer aqui automaticamente."
        />
      ) : (
        <div className="mt-6 space-y-6">
          {grupos.map((grupo) => (
            <div key={grupo.data}>
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {tituloGrupo(grupo.eventos[0].data)}
              </h3>
              <div className="space-y-0 border-l border-border">
                {grupo.eventos.map((evento) => {
                  const Icon = icons[evento.tipo];

                  return (
                    <div key={evento.id} className="relative pb-5 pl-5 last:pb-0">
                      <span className="absolute -left-[7px] top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-border bg-card" />
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                          <Icon className="h-4 w-4" strokeWidth={1.75} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm leading-6 text-foreground">
                            <span className="font-medium">{hora(evento.data)}</span>
                            <span className="mx-2 text-muted-foreground">-</span>
                            {evento.descricao}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {evento.acao} · {evento.autor}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </WorkspaceSection>
  );
}
