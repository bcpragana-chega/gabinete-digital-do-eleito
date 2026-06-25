import type { EstadoAssembleia } from "@/lib/types";
import { cn } from "@/lib/utils";

const labels: Record<EstadoAssembleia, string> = {
  preparacao: "Preparação",
  analise: "Em análise",
  concluida: "Concluída",
};

const styles: Record<EstadoAssembleia, string> = {
  preparacao: "bg-status-preparacao text-status-preparacao-foreground",
  analise: "bg-status-analise text-status-analise-foreground",
  concluida: "bg-status-concluida text-status-concluida-foreground",
};

export function StatusBadge({
  estado,
  className,
}: {
  estado: EstadoAssembleia;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        styles[estado],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {labels[estado]}
    </span>
  );
}
