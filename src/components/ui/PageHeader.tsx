import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { WorkspaceHeader } from "@/components/tribuno/workspace";

type PageHeaderProps = {
  icon: LucideIcon;
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
};

export function PageHeader(props: PageHeaderProps) {
  return <WorkspaceHeader className="mb-8" {...props} />;
}
