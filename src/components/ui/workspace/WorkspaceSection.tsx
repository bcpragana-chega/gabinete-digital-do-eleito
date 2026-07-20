import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type WorkspaceSectionProps = {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
  id?: string;
};

export function WorkspaceSection({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
  id,
}: WorkspaceSectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "min-w-0 rounded-lg border border-border/90 bg-card p-4 shadow-card",
        className,
      )}
    >
      {(title || description || actions) && (
        <div className="mb-3 flex flex-col items-stretch gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            {title && (
              <h2 className="break-words font-display text-sm font-semibold leading-5 text-foreground">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">
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
