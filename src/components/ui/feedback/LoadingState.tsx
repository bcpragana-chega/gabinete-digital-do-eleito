import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type LoadingStateProps = {
  title?: ReactNode;
  description?: ReactNode;
  compact?: boolean;
  className?: string;
};

export function LoadingState({
  title = "A carregar",
  description,
  compact = false,
  className,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-border/90 bg-muted/20 text-muted-foreground",
        compact ? "px-4 py-3" : "px-5 py-6",
        className,
      )}
    >
      <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
      <div className="min-w-0">
        {title && <p className="text-sm font-medium text-foreground">{title}</p>}
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}
