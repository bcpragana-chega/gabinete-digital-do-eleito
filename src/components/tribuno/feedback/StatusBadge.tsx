import type { ReactNode } from "react";
import type { EstadoAssembleia } from "@/lib/types";
import { cn } from "@/lib/utils";

type StatusTone = "preparacao" | "analise" | "concluida" | "alerta" | "muted";

const labels: Record<EstadoAssembleia, string> = {
  preparacao: "Preparação",
  analise: "Em análise",
  concluida: "Concluída",
  arquivada: "Arquivada",
};

const styles: Record<EstadoAssembleia, string> = {
  preparacao: "bg-status-preparacao text-status-preparacao-foreground",
  analise: "bg-status-analise text-status-analise-foreground",
  concluida: "bg-status-concluida text-status-concluida-foreground",
  arquivada: "bg-muted text-muted-foreground",
};

const toneStyles: Record<StatusTone, string> = {
  preparacao: "bg-status-preparacao text-status-preparacao-foreground",
  analise: "bg-status-analise text-status-analise-foreground",
  concluida: "bg-status-concluida text-status-concluida-foreground",
  alerta: "bg-status-alerta text-status-alerta-foreground",
  muted: "bg-muted text-muted-foreground",
};

type StatusBadgeProps = {
  estado?: EstadoAssembleia;
  tone?: StatusTone;
  children?: ReactNode;
  dot?: boolean;
  className?: string;
};

export function StatusBadge({ estado, tone, children, dot = true, className }: StatusBadgeProps) {
  const content = children ?? (estado ? labels[estado] : null);
  const style = tone ? toneStyles[tone] : estado ? styles[estado] : toneStyles.muted;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        style,
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {content}
    </span>
  );
}
