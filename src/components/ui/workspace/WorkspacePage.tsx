import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type WorkspacePageProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function WorkspacePage({ children, className, contentClassName }: WorkspacePageProps) {
  return (
    <main className={cn("min-h-screen bg-background", className)}>
      <div
        className={cn(
          "mx-auto flex w-full max-w-[1504px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-10",
          contentClassName,
        )}
      >
        {children}
      </div>
    </main>
  );
}
