import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type WorkspacePageProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function WorkspacePage({ children, className, contentClassName }: WorkspacePageProps) {
  return (
    <main className={cn("min-h-[calc(100vh-4rem)] bg-background", className)}>
      <div
        className={cn(
          "mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6",
          contentClassName,
        )}
      >
        {children}
      </div>
    </main>
  );
}
