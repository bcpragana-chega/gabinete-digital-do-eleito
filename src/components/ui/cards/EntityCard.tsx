import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

type EntityCardProps = {
  icon?: LucideIcon;
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function EntityCard({
  icon: Icon,
  eyebrow,
  title,
  description,
  meta,
  actions,
  children,
  className,
}: EntityCardProps) {
  return (
    <Card className={cn("min-w-0 border-border/80 bg-muted/25 p-4 shadow-none transition-colors hover:bg-muted/40", className)}>
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          {Icon && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/80 bg-card text-muted-foreground">
              <Icon className="h-4 w-4" strokeWidth={1.75} />
            </div>
          )}
          <div className="min-w-0">
            {eyebrow && (
              <div className="truncate text-xs font-medium uppercase text-muted-foreground">
                {eyebrow}
              </div>
            )}
            <h3 className="mt-1 line-clamp-2 break-words text-sm font-semibold leading-6 text-foreground">{title}</h3>
            {description && (
              <p className="mt-1 line-clamp-2 break-words text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            )}
            {meta && <div className="mt-3 line-clamp-2 break-words text-xs text-muted-foreground">{meta}</div>}
          </div>
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      {children && <div className="mt-4 min-w-0">{children}</div>}
    </Card>
  );
}
