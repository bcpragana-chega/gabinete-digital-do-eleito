import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  label: ReactNode;
  value: ReactNode;
  icon?: LucideIcon;
  description?: ReactNode;
  className?: string;
};

export function MetricCard({ label, value, icon: Icon, description, className }: MetricCardProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-background/60 p-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />}
      </div>
      <div className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </div>
      {description && <div className="mt-1 text-xs text-muted-foreground">{description}</div>}
    </div>
  );
}
