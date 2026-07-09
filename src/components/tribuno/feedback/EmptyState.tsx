import type { ReactNode } from "react";

type EmptyStateProps = {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
};

export function EmptyState({ title, description, action, compact = false }: EmptyStateProps) {
  if (compact) {
    return (
      <div className="mt-4 rounded-lg border border-dashed border-border bg-background/50 px-4 py-6 text-center">
        {title && <p className="text-sm text-muted-foreground">{title}</p>}
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
        {action && <div className="mt-4">{action}</div>}
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-dashed border-border bg-card p-8 shadow-card">
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
