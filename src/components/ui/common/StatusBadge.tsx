import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type StatusTone = "default" | "muted" | "success" | "warning" | "danger" | "info";

const toneStyles: Record<StatusTone, string> = {
  default: "border-border/70 bg-muted/70 text-foreground",
  muted: "border-border/70 bg-background/80 text-muted-foreground",
  success: "border-status-concluida/70 bg-status-concluida/70 text-status-concluida-foreground",
  warning: "border-status-alerta/70 bg-status-alerta/70 text-status-alerta-foreground",
  danger: "border-destructive/20 bg-destructive/10 text-destructive",
  info: "border-status-analise/70 bg-status-analise/70 text-status-analise-foreground",
};

type StatusBadgeProps = {
  children: ReactNode;
  tone?: StatusTone;
  dot?: boolean;
  className?: string;
};

export function StatusBadge({
  children,
  tone = "muted",
  dot = true,
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        toneStyles[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}
