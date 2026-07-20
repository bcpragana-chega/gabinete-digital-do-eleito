import { createFileRoute } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { PerfilEleitoForm } from "@/components/auth/PerfilEleitoForm";
import { UserAvatar } from "@/components/auth/UserAvatar";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { WorkspacePage, WorkspaceSection } from "@/components/ui/workspace";
import { logout, useAuth } from "@/lib/auth-store";
import { obterContextoInstitucional } from "@/lib/perfil-contexto";

export const Route = createFileRoute("/_app/definicoes")({
  head: () => ({
    meta: [
      { title: "Definições — Tribuno" },
      {
        name: "description",
        content: "Configure o seu perfil, autarquia e preferências do gabinete.",
      },
    ],
  }),
  component: DefinicoesPage,
});

function DefinicoesPage() {
  const { user, perfil, displayName } = useAuth();
  const contexto = obterContextoInstitucional(perfil);

  return (
    <>
      <TopBar breadcrumb="Definições" />
      <WorkspacePage contentClassName="max-w-5xl">
        <div className="grid gap-4 lg:grid-cols-[256px_minmax(0,1fr)]">
          <Card className="h-fit p-4 shadow-none">
            <div className="flex items-center gap-3">
              <UserAvatar user={user} perfil={perfil} className="h-12 w-12" />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-foreground">{displayName}</div>
                <div className="truncate text-sm text-muted-foreground">{user?.email}</div>
              </div>
            </div>

            <dl className="mt-4 space-y-2.5 text-xs">
              <PerfilInfo label="Cargo" value={contexto.designacaoCargo} />
              <PerfilInfo label="Órgão" value={contexto.nomeOrgao} />
              <PerfilInfo label="Sessões" value={contexto.tipoSessaoPlural} />
            </dl>

            <Button type="button" variant="secondary" className="mt-4 w-full" onClick={logout}>
              <LogOut className="h-4 w-4" />
              Terminar sessão
            </Button>
          </Card>

          <WorkspaceSection title="Perfil do Eleito">
            <PerfilEleitoForm user={user} perfil={perfil} />
          </WorkspaceSection>
        </div>
      </WorkspacePage>
    </>
  );
}

function PerfilInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium text-foreground">{value}</dd>
    </div>
  );
}
