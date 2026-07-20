import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type WorkspaceLayoutProps = {
  header?: ReactNode;
  children: ReactNode;
  sidebar?: ReactNode;
  className?: string;
  bodyClassName?: string;
  contentClassName?: string;
  sidebarClassName?: string;
};

export function WorkspaceLayout({
  header,
  children,
  sidebar,
  className,
  bodyClassName,
  contentClassName,
  sidebarClassName,
}: WorkspaceLayoutProps) {
  return (
    <div className={cn("min-w-0 space-y-4", className)}>
      {header}
      <div
        className={cn(
          "grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_304px]",
          !sidebar && "block",
          bodyClassName,
        )}
      >
        <main className={cn("min-w-0 space-y-4", contentClassName)}>{children}</main>
        {sidebar && <aside className={cn("min-w-0 space-y-4", sidebarClassName)}>{sidebar}</aside>}
      </div>
    </div>
  );
}
