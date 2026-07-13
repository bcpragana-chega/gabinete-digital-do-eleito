import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Button } from "@/components/ui/button";
import { logout, resolverDestinoAcesso, useAuth } from "@/lib/auth-store";
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
  const destino = resolverDestinoAcesso({
    initialized,
    isAuthenticated,
    hasCompleteProfile,
    onboardingResolved,
    onboardingRequired,
  });

  useEffect(() => {
    if (destino === "loading" || destino === "app") return;
    if (destino === "login") {
      console.warn("[Tribuno Auth] Rota protegida sem autenticação, a enviar para login.");
      navigate({ to: "/login", replace: true });
      return;
    }

    if (destino === "onboarding") {
      console.info("[Tribuno Auth] Rota protegida precisa de onboarding", {
        operacao: "AUTH_ROUTE_ONBOARDING_NECESSARIO",
        perfilCarregado: Boolean(perfil),
      });
      navigate({ to: "/completar-perfil", replace: true });
      return;
    }
  }, [
    destino,
    hasCompleteProfile,
    initialized,
    isAuthenticated,
    navigate,
    onboardingRequired,
    onboardingResolved,
    perfil,
    user?.id,
  ]);

  if (destino === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-sm text-muted-foreground">A preparar o Tribuno...</div>
      </div>
    );
  }

  if (destino !== "app") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm rounded-2xl border bg-card p-5 text-center">
          <h1 className="font-semibold">Não foi possível concluir a navegação</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Podes tentar novamente ou terminar a sessão em segurança.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <Button
              onClick={() => {
                window.dispatchEvent(new Event("tribuno:auth"));
                void navigate({
                  to: destino === "login" ? "/login" : "/completar-perfil",
                  replace: true,
                });
              }}
            >
              Tentar novamente
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                void logout().then(() => navigate({ to: "/login", replace: true }));
              }}
            >
              Terminar sessão
            </Button>
          </div>
        </div>
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
