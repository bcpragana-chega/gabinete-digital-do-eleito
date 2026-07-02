import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type TimelineProps = {
  children: ReactNode;
  className?: string;
};

export function Timeline({ children, className }: TimelineProps) {
  return <ol className={cn("space-y-4", className)}>{children}</ol>;
}
