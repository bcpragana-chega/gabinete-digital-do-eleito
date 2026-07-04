import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type TimelineItemProps = {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export function TimelineItem({
  icon: Icon,
  title,
  description,
  meta,
  children,
  className,
}: TimelineItemProps) {
  return (
    <li className={cn("relative pl-10", className)}>
      <span className="absolute left-4 top-8 h-full w-px bg-border/70" aria-hidden="true" />
      <span className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-card text-muted-foreground shadow-sm">
        {Icon ? (
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        ) : (
          <span className="h-2 w-2 rounded-full bg-current" />
        )}
      </span>
      <div className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {description && (
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
            )}
          </div>
          {meta && <div className="shrink-0 text-xs text-muted-foreground">{meta}</div>}
        </div>
        {children && <div className="mt-3">{children}</div>}
      </div>
    </li>
  );
}
