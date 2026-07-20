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
          "rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-5 text-center",
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
    <section
      className={cn("rounded-lg border border-dashed border-border/80 bg-muted/20 p-6", className)}
    >
      {title && <h2 className="font-display text-base font-semibold text-foreground">{title}</h2>}
      {description && (
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </section>
  );
}
