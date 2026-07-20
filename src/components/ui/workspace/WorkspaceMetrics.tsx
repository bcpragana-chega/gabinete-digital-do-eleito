import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type WorkspaceMetricsProps = {
  children: ReactNode;
  className?: string;
};

export function WorkspaceMetrics({ children, className }: WorkspaceMetricsProps) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-4", className)}>{children}</div>
  );
}
