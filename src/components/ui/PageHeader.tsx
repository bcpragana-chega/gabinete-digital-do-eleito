import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { WorkspaceHeader } from "@/components/ui/workspace";

type PageHeaderProps = {
  icon: LucideIcon;
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
};

export function PageHeader(props: PageHeaderProps) {
  return <WorkspaceHeader className="mb-4" {...props} />;
}
