import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

type ActionCardProps = {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function ActionCard({
  icon: Icon,
  title,
  description,
  meta,
  action,
  children,
  className,
}: ActionCardProps) {
  return (
    <Card className={cn("min-w-0 border-border/80 bg-muted/25 p-4 shadow-none", className)}>
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {Icon && (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/80 bg-muted/40 text-muted-foreground">
              <Icon className="h-4 w-4" strokeWidth={1.75} />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="line-clamp-2 break-words text-sm font-semibold leading-6 text-foreground">
              {title}
            </h3>
            {description && (
              <p className="mt-1 line-clamp-2 break-words text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            )}
            {meta && <div className="mt-2 truncate text-xs text-muted-foreground">{meta}</div>}
          </div>
        </div>
        {action && <div className="flex shrink-0 justify-end sm:justify-start">{action}</div>}
      </div>
      {children && <div className="mt-4 min-w-0">{children}</div>}
    </Card>
  );
}
