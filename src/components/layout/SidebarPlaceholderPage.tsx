import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { WorkspacePage } from "@/components/ui/workspace";

export function SidebarPlaceholderPage({ title }: { title: string }) {
  return (
    <>
      <TopBar breadcrumb={title} />
      <WorkspacePage contentClassName="max-w-4xl">
        <Card className="p-5 shadow-none">
          <h1 className="text-base font-semibold text-foreground">{title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Esta área será desenvolvida numa próxima fase
          </p>
        </Card>
      </WorkspacePage>
    </>
  );
}
