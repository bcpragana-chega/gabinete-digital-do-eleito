import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type WorkspaceHeaderProps = {
  icon?: LucideIcon;
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function WorkspaceHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
  meta,
  actions,
  children,
  className,
}: WorkspaceHeaderProps) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card p-6 shadow-card", className)}>
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex min-w-0 flex-1 items-start gap-5">
          {Icon && (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <Icon className="h-5 w-5" strokeWidth={1.75} />
            </div>
          )}

          <div className="min-w-0 flex-1">
            {eyebrow && (
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {eyebrow}
              </div>
            )}
            <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              {title}
            </h1>
            {description && (
              <div className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</div>
            )}
            {meta && <div className="mt-4 flex flex-wrap gap-2">{meta}</div>}
            {children}
          </div>
        </div>

        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    </section>
  );
}
