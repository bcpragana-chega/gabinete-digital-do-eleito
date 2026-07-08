import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { useAuth } from "@/lib/auth-store";
import { obterStorageStatus } from "@/lib/storage-provider";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const navigate = useNavigate();
  const {
    initialized,
    isAuthenticated,
    user,
    perfil,
    hasCompleteProfile,
    onboardingRequired,
    onboardingResolved,
  } = useAuth();
  const storageStatus = obterStorageStatus();

  useEffect(() => {
    if (!initialized) return;

    if (!isAuthenticated) {
      console.warn("[Tribuno Auth] Rota protegida sem autenticação, a enviar para login.");
      navigate({ to: "/login", replace: true });
      return;
    }

    if (!hasCompleteProfile) {
      console.info("[Tribuno Auth] Rota protegida precisa de onboarding", {
        userId: user?.id,
        perfilCarregado: Boolean(perfil),
      });
      navigate({ to: "/completar-perfil", replace: true });
      return;
    }

    if (!onboardingResolved) return;

    if (onboardingRequired) {
      console.info("[Tribuno Auth] Rota protegida com onboarding inicial pendente", {
        userId: user?.id,
      });
      navigate({ to: "/completar-perfil", replace: true });
      return;
    }

    console.info("[Tribuno Auth] Rota protegida autorizada", {
      userId: user?.id,
      perfilCarregado: Boolean(perfil),
    });
  }, [
    hasCompleteProfile,
    initialized,
    isAuthenticated,
    navigate,
    onboardingRequired,
    onboardingResolved,
    perfil,
    user?.id,
  ]);

  if (
    !initialized ||
    !isAuthenticated ||
    !hasCompleteProfile ||
    !onboardingResolved ||
    onboardingRequired
  ) {
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
        {!storageStatus.isRemote && (
          <div className="border-b border-amber-200/70 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-900 md:px-6">
            {storageStatus.message}
          </div>
        )}
        <Outlet />
      </div>
    </div>
  );
}
