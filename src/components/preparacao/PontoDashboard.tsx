import { CheckCircle2, Timer } from "lucide-react";
import { MetricCard } from "@/components/ui/cards";
import { StatusBadge } from "@/components/ui/common";
import { WorkspaceMetrics, WorkspaceSection } from "@/components/ui/workspace";

export function PontoDashboard({
  estado,
  documentosAssociados,
  notas,
  documentosCriados,
  tarefasConcluidas,
  tarefasPendentes,
}: {
  estado: string;
  documentosAssociados: number;
  notas: number;
  documentosCriados: number;
  tarefasConcluidas: number;
  tarefasPendentes: number;
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
    </WorkspaceSection>
  );
}
