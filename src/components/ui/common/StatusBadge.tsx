import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type StatusTone = "default" | "muted" | "success" | "warning" | "danger" | "info";

const toneStyles: Record<StatusTone, string> = {
  default: "bg-accent text-accent-foreground",
  muted: "bg-muted text-muted-foreground",
  success: "bg-status-concluida text-status-concluida-foreground",
  warning: "bg-status-alerta text-status-alerta-foreground",
  danger: "bg-destructive text-destructive-foreground",
  info: "bg-status-analise text-status-analise-foreground",
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
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        toneStyles[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}
