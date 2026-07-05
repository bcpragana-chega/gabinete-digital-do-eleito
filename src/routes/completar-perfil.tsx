import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { PerfilEleitoForm } from "@/components/auth/PerfilEleitoForm";
import { Card } from "@/components/ui/card";
import { perfilCompleto, useAuth } from "@/lib/auth-store";

export const Route = createFileRoute("/completar-perfil")({
  head: () => ({
    meta: [
      { title: "Completar perfil — Tribuno" },
      {
        name: "description",
        content: "Complete o perfil institucional para adaptar o Tribuno ao seu mandato.",
      },
    ],
  }),
  component: CompletarPerfilPage,
});

function CompletarPerfilPage() {
  const navigate = useNavigate();
  const { initialized, isAuthenticated, user, perfil } = useAuth();

  useEffect(() => {
    if (!initialized) return;
    console.info("[Tribuno Auth] Completar perfil: estado recebido", {
      isAuthenticated,
      userId: user?.id,
      perfilCarregado: Boolean(perfil),
      perfilCompleto: perfilCompleto(perfil),
    });

    if (!isAuthenticated) {
      console.warn("[Tribuno Auth] Completar perfil: sem autenticação, a voltar para login.");
      navigate({ to: "/login", replace: true });
      return;
    }

    if (perfilCompleto(perfil)) {
      console.info("[Tribuno Auth] Completar perfil: perfil completo, a entrar na aplicação.", {
        userId: user?.id,
      });
      navigate({ to: "/", replace: true });
    }
  }, [initialized, isAuthenticated, navigate, perfil, user?.id]);

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-semibold text-foreground">Completar perfil</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Estes dados adaptam a linguagem do Tribuno ao órgão e à função que exerce.
          </p>
        </div>

        <Card className="p-5 shadow-none sm:p-6">
          <PerfilEleitoForm
            user={user}
            perfil={perfil}
            submitLabel={perfilCompleto(perfil) ? "Guardar e continuar" : "Entrar no Tribuno"}
            onSaved={() => navigate({ to: "/", replace: true })}
          />
        </Card>
      </div>
    </main>
  );
}
