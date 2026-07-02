import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type BreadcrumbItem = {
  label: ReactNode;
  to?: string;
};

type BreadcrumbProps = {
  items: BreadcrumbItem[];
  className?: string;
};

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn("text-sm text-muted-foreground", className)}>
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="flex min-w-0 items-center gap-1.5">
              {item.to && !isLast ? (
                <a href={item.to} className="truncate hover:text-foreground">
                  {item.label}
                </a>
              ) : (
                <span className={cn("truncate", isLast && "font-medium text-foreground")}>
                  {item.label}
                </span>
              )}
              {!isLast && <ChevronRight className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
