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
  mobileCompact?: boolean;
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
  mobileCompact = false,
}: WorkspaceHeaderProps) {
  return (
    <section
      className={cn(
        "rounded-lg border border-border/90 bg-card p-4 shadow-card",
        mobileCompact && "max-md:p-3 max-md:shadow-none",
        className,
      )}
    >
      <div
        className={cn(
          "flex flex-col items-stretch gap-4 xl:flex-row xl:items-start xl:justify-between",
          mobileCompact && "max-md:gap-2",
        )}
      >
        <div className="flex w-full min-w-0 items-start gap-3 xl:flex-1">
          {Icon && (
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-foreground",
                mobileCompact && "max-md:hidden",
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} />
            </div>
          )}

          <div className="min-w-0 flex-1">
            {eyebrow && (
              <div
                className={cn(
                  "text-xs font-medium uppercase text-muted-foreground",
                  mobileCompact && "max-md:hidden",
                )}
              >
                {eyebrow}
              </div>
            )}
            <h1
              className={cn(
                "mt-0.5 break-words font-display text-xl font-semibold leading-7 text-foreground",
                mobileCompact && "max-md:line-clamp-2 max-md:text-lg max-md:leading-6",
              )}
            >
              {title}
            </h1>
            {description && (
              <div
                className={cn(
                  "mt-1 max-w-2xl text-sm leading-5 text-muted-foreground",
                  mobileCompact && "max-md:hidden",
                )}
              >
                {description}
              </div>
            )}
            {meta && (
              <div
                className={cn(
                  "mt-3 flex flex-wrap gap-2",
                  mobileCompact && "max-md:mt-2 max-md:gap-1",
                )}
              >
                {meta}
              </div>
            )}
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
