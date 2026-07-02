import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type InfoCardProps = {
  icon?: LucideIcon;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function InfoCard({ icon: Icon, title, description, children, className }: InfoCardProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-background/60 p-4", className)}>
      {(Icon || title || description) && (
        <div className="flex items-start gap-3">
          {Icon && (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Icon className="h-4 w-4" strokeWidth={1.75} />
            </div>
          )}
          <div className="min-w-0">
            {title && <h3 className="text-sm font-medium text-foreground">{title}</h3>}
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>
      )}
      {children && <div className={cn(Icon || title || description ? "mt-4" : "")}>{children}</div>}
    </div>
  );
}
