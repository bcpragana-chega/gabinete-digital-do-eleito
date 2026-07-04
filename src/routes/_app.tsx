import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { perfilCompleto, useAuth } from "@/lib/auth-store";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const navigate = useNavigate();
  const { initialized, isAuthenticated, perfil } = useAuth();

  useEffect(() => {
    if (!initialized) return;

    if (!isAuthenticated) {
      navigate({ to: "/login", replace: true });
      return;
    }

    if (!perfilCompleto(perfil)) {
      navigate({ to: "/completar-perfil", replace: true });
    }
  }, [initialized, isAuthenticated, navigate, perfil]);

  if (!initialized || !isAuthenticated || !perfilCompleto(perfil)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-sm text-muted-foreground">A preparar o Tribuno...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <AppSidebar />
      <div className="min-w-0 md:pl-60">
        <Outlet />
      </div>
    </div>
  );
}
