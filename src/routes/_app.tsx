import { Outlet, createFileRoute } from "@tanstack/react-router";
import { AppSidebar } from "@/components/layout/AppSidebar";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <AppSidebar />
      <div className="min-w-0 md:pl-60">
        <Outlet />
      </div>
    </div>
  );
}
