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
      className={cn("rounded-2xl border border-border bg-card p-4 shadow-card sm:p-7", className)}
    >
      <div className="flex flex-col items-stretch gap-5 sm:gap-6 2xl:flex-row 2xl:items-start 2xl:justify-between 2xl:gap-8">
        <div className="flex w-full min-w-0 items-start gap-4 sm:gap-5 2xl:flex-1">
          {Icon && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
              <Icon className="h-5 w-5" strokeWidth={1.75} />
            </div>
          )}

          <div className="min-w-0 flex-1">
            {eyebrow && (
              <div className="text-xs font-medium uppercase text-muted-foreground">{eyebrow}</div>
            )}
            <h1 className="mt-1 break-words font-display text-2xl font-semibold text-foreground md:text-3xl">
              {title}
            </h1>
            {description && (
              <div className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                {description}
              </div>
            )}
            {meta && <div className="mt-4 flex flex-wrap gap-2">{meta}</div>}
            {children}
          </div>
        </div>

        {actions && (
          <div className="w-full min-w-0 max-w-full 2xl:w-auto 2xl:max-w-[60%] 2xl:shrink-0">
            {actions}
          </div>
        )}
      </div>
    </section>
  );
}
