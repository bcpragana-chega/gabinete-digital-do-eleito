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
    <section
      className={cn(
        "min-w-0 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5",
        className,
      )}
    >
      {(title || description || actions) && (
        <div className="mb-4 flex flex-col items-stretch gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            {title && (
              <h2 className="break-words font-display text-base font-semibold leading-6 text-foreground">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1 break-words text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="min-w-0 sm:shrink-0">{actions}</div>}
        </div>
      )}
      {children && <div className={cn("min-w-0", contentClassName)}>{children}</div>}
    </section>
  );
}
