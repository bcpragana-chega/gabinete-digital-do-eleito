import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

type MetricCardProps = {
  label: ReactNode;
  value: ReactNode;
  icon?: LucideIcon;
  description?: ReactNode;
  className?: string;
};

export function MetricCard({ label, value, icon: Icon, description, className }: MetricCardProps) {
  return (
    <Card className={cn("min-w-0 p-4", className)}>
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="truncate text-xs font-medium uppercase text-muted-foreground">{label}</div>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />}
      </div>
      <div className="mt-2 truncate font-display text-2xl font-semibold text-foreground">
        {value}
      </div>
      {description && (
        <div className="mt-1 line-clamp-2 break-words text-xs text-muted-foreground">
          {description}
        </div>
      )}
    </Card>
  );
}
