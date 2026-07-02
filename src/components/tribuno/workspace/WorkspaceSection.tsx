import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type WorkspaceSectionProps = {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function WorkspaceSection({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
}: WorkspaceSectionProps) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card p-6 shadow-card", className)}>
      {(title || description || actions) && (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            {title && (
              <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
                {title}
              </h2>
            )}
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}
      {children && <div className={cn("min-w-0", contentClassName)}>{children}</div>}
    </section>
  );
}
