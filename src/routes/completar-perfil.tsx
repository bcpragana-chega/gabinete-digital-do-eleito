import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { OnboardingInicialWizard } from "@/components/auth/OnboardingInicialWizard";
import { concluirOnboarding, useAuth } from "@/lib/auth-store";

export const Route = createFileRoute("/completar-perfil")({
  head: () => ({
    meta: [
      { title: "Configuração inicial — Tribuno" },
      {
        name: "description",
        content: "Assistente de configuração inicial do Tribuno.",
      },
    ],
  }),
  component: CompletarPerfilPage,
});

function CompletarPerfilPage() {
  const navigate = useNavigate();
  const {
    initialized,
    isAuthenticated,
    user,
    perfil,
    hasCompleteProfile,
    onboardingVersion,
    onboardingRequired,
    onboardingResolved,
  } = useAuth();

  useEffect(() => {
    if (!initialized) return;
    console.info("[Tribuno Auth] Completar perfil: estado recebido", {
      isAuthenticated,
      perfilCarregado: Boolean(perfil),
      perfilCompleto: hasCompleteProfile,
      onboardingVersion,
      onboardingRequired,
      onboardingResolved,
    });

    if (!isAuthenticated) {
      console.warn("[Tribuno Auth] Completar perfil: sem autenticação, a voltar para login.");
      navigate({ to: "/login", replace: true });
      return;
    }

    if (
      hasCompleteProfile &&
      onboardingResolved &&
      !onboardingRequired &&
      typeof onboardingVersion === "number" &&
      onboardingVersion >= 1
    ) {
      console.info("[Tribuno Auth] Completar perfil: perfil completo, a entrar na aplicação.", {
        operacao: "AUTH_PROFILE_COMPLETO",
      });
      navigate({ to: "/", replace: true });
    }
  }, [
    hasCompleteProfile,
    initialized,
    isAuthenticated,
    navigate,
    onboardingVersion,
    onboardingRequired,
    onboardingResolved,
    perfil,
    user?.id,
  ]);

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <OnboardingInicialWizard
          user={user}
          perfil={perfil}
          perfilConfigurado={hasCompleteProfile}
          onConcluir={async () => {
            await concluirOnboarding();
            navigate({ to: "/", replace: true });
          }}
        />
      </div>
    </main>
  );
}
