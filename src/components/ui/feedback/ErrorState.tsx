import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type ErrorStateProps = {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function ErrorState({
  title = "Não foi possível carregar esta informação",
  description,
  action,
  className,
}: ErrorStateProps) {
  return (
    <section
      className={cn("rounded-lg border border-border/90 bg-card p-5 shadow-card", className)}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-status-alerta text-status-alerta-foreground">
          <AlertTriangle className="h-4 w-4" strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          {title && (
            <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
              {title}
            </h2>
          )}
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          {action && <div className="mt-4">{action}</div>}
        </div>
      </div>
    </section>
  );
}
