import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

type InfoCardProps = {
  icon?: LucideIcon;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function InfoCard({ icon: Icon, title, description, children, className }: InfoCardProps) {
  return (
    <Card className={cn("min-w-0 border-border/80 bg-muted/25 p-4 shadow-none", className)}>
      {(Icon || title || description) && (
        <div className="flex min-w-0 items-start gap-3">
          {Icon && (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-card text-muted-foreground">
              <Icon className="h-4 w-4" strokeWidth={1.75} />
            </div>
          )}
          <div className="min-w-0">
            {title && <h3 className="line-clamp-2 break-words text-sm font-semibold leading-6 text-foreground">{title}</h3>}
            {description && (
              <p className="mt-1 line-clamp-2 break-words text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        </div>
      )}
      {children && <div className={cn(Icon || title || description ? "mt-4" : "")}>{children}</div>}
    </Card>
  );
}
