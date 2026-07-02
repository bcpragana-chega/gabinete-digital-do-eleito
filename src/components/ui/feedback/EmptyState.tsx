import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
};

export function EmptyState({
  title,
  description,
  action,
  compact = false,
  className,
}: EmptyStateProps) {
  if (compact) {
    return (
      <div
        className={cn(
          "rounded-lg border border-dashed border-border bg-background/50 px-4 py-6 text-center",
          className,
        )}
      >
        {title && <p className="text-sm text-muted-foreground">{title}</p>}
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
        {action && <div className="mt-4">{action}</div>}
      </div>
    );
  }

  return (
    <section className={cn("rounded-2xl border border-dashed border-border bg-card p-8 shadow-card", className)}>
      {title && (
        <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
          {title}
        </h2>
      )}
      {description && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </section>
  );
}
