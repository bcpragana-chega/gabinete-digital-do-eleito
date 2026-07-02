import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type WorkspaceLayoutProps = {
  header?: ReactNode;
  children: ReactNode;
  sidebar?: ReactNode;
  className?: string;
  contentClassName?: string;
  sidebarClassName?: string;
};

export function WorkspaceLayout({
  header,
  children,
  sidebar,
  className,
  contentClassName,
  sidebarClassName,
}: WorkspaceLayoutProps) {
  return (
    <div className={cn("space-y-8", className)}>
      {header}
      <div className={cn("grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]", !sidebar && "block")}>
        <main className={cn("min-w-0 space-y-6", contentClassName)}>{children}</main>
        {sidebar && <aside className={cn("min-w-0 space-y-6", sidebarClassName)}>{sidebar}</aside>}
      </div>
    </div>
  );
}
