import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type SectionTitleProps = {
  icon?: LucideIcon;
  titulo?: ReactNode;
  title?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function SectionTitle({ icon: Icon, titulo, title, actions, className }: SectionTitleProps) {
  const content = title ?? titulo;

  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <div className="flex min-w-0 items-center gap-3">
        {Icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Icon className="h-4 w-4" strokeWidth={1.75} />
          </div>
        )}
        {content && (
          <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
            {content}
          </h2>
        )}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}
