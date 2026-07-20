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
    <section
      className={cn("rounded-lg border border-border/90 bg-card p-4 shadow-card", className)}
    >
      <div className="flex flex-col items-stretch gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex w-full min-w-0 items-start gap-3 xl:flex-1">
          {Icon && (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
              <Icon className="h-4 w-4" strokeWidth={1.75} />
            </div>
          )}

          <div className="min-w-0 flex-1">
            {eyebrow && (
              <div className="text-xs font-medium uppercase text-muted-foreground">{eyebrow}</div>
            )}
            <h1 className="mt-0.5 break-words font-display text-xl font-semibold leading-7 text-foreground">
              {title}
            </h1>
            {description && (
              <div className="mt-1 max-w-2xl text-sm leading-5 text-muted-foreground">
                {description}
              </div>
            )}
            {meta && <div className="mt-3 flex flex-wrap gap-2">{meta}</div>}
            {children}
          </div>
        </div>

        {actions && (
          <div className="w-full min-w-0 max-w-full xl:w-auto xl:max-w-[60%] xl:shrink-0">
            {actions}
          </div>
        )}
      </div>
    </section>
  );
}
