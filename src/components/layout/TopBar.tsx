import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, Ellipsis, LogOut, Menu, Settings } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { LogoutConfirmDialog } from "@/components/auth/LogoutConfirmDialog";
import { UserAvatar } from "@/components/auth/UserAvatar";
import { MobileSecondaryMenu } from "@/components/layout/MobileSecondaryMenu";
import { getMobileBackDestination } from "@/components/layout/mobile-navigation";
import { GlobalSearchTrigger } from "@/components/search/GlobalSearchTrigger";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { primeiroNome, saudacaoPorHora, useAuth } from "@/lib/auth-store";

type TopBarProps = {
  title?: string;
  description?: string;
  breadcrumb?: ReactNode;
  actions?: ReactNode;
  showUtilities?: boolean;
};

const descricoesPorTitulo: Record<string, string> = {
  Assuntos: "Temas, problemas e compromissos acompanhados durante o mandato.",
  Sessões: "Prepare reuniões, documentos e intervenções.",
  Preparação: "Reveja a ordem de trabalhos e defina a posição política.",
  "Preparação da sessão": "Reveja a ordem de trabalhos e defina a posição política.",
  "Documentos da sessão": "Consulte e prepare os documentos necessários para a sessão.",
  Documentos: "Prepare os documentos ainda pendentes para esta sessão.",
  "Estratégia da sessão": "Defina objetivos, mensagens e limites para a sessão.",
  "Pontos da sessão": "Prepare cada ponto da ordem de trabalhos.",
  "Ponto da sessão": "Analise o ponto e prepare a intervenção necessária.",
  Sessão: "Consulte o contexto e avance para a preparação da sessão.",
  Assunto: "Acompanhe o contexto, os documentos e o próximo passo deste assunto.",
  Documento: "Edite, reveja e finalize o documento institucional.",
  "Documento do assunto": "Edite, reveja e finalize o documento institucional.",
  Biblioteca: "Consulte e organize os documentos do mandato.",
  Definições: "Gira o perfil institucional e as preferências do Tribuno.",
};

function tituloPorPathname(pathname: string) {
  if (pathname.includes("/documentos/")) return "Documento";
  if (pathname.endsWith("/preparacao/documentos-a-criar")) return "Documentos";
  if (pathname.endsWith("/preparacao/documentos")) return "Documentos da sessão";
  if (pathname.endsWith("/preparacao/estrategia")) return "Estratégia da sessão";
  if (pathname.includes("/preparacao/pontos/")) return "Ponto da sessão";
  if (pathname.endsWith("/preparacao/pontos")) return "Pontos da sessão";
  if (pathname.endsWith("/preparacao")) return "Preparação da sessão";
  if (/^\/sessoes\/[^/]+$/.test(pathname)) return "Sessão";
  if (/^\/assuntos\/[^/]+$/.test(pathname)) return "Assunto";
  if (pathname === "/sessoes") return "Sessões";
  if (pathname === "/assuntos") return "Assuntos";
  if (pathname === "/biblioteca" || pathname === "/caixa-de-entrada") return "Biblioteca";
  if (pathname === "/historico") return "Histórico";
  if (pathname === "/definicoes") return "Definições";
  return undefined;
}

export function TopBar({
  title,
  description,
  breadcrumb,
  actions,
  showUtilities = true,
}: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const location = useRouterState({ select: (state) => state.location });
  const pathname = location.pathname;
  const { user, perfil, displayName, localDisplayName, initialized } = useAuth();
  const greetingName = nomeTopBar(
    initialized ? displayName : localDisplayName,
    initialized ? user?.nome : undefined,
    initialized ? perfil?.nomeInstitucional : undefined,
  );
  const mostrarSaudacao = initialized || Boolean(localDisplayName);
  const dashboard = pathname === "/";
  const mobileBackDestination = getMobileBackDestination(pathname, location.searchStr);
  const tituloContextual =
    title ?? (typeof breadcrumb === "string" ? breadcrumb : tituloPorPathname(pathname));
  const descricaoContextual =
    description ?? (tituloContextual ? descricoesPorTitulo[tituloContextual] : undefined);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur-lg">
      <div className="flex h-14 min-w-0 items-center gap-2 px-3 md:h-16 md:gap-3 md:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-3">
          {mobileBackDestination ? (
            <button
              type="button"
              onClick={() => router.history.push(mobileBackDestination)}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 md:hidden"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 md:hidden"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            </button>
          )}

          {dashboard ? (
            <div className="min-w-0 leading-tight">
              <div className="truncate font-display text-base font-semibold leading-5 text-foreground sm:text-lg md:text-xl md:leading-6">
                {mostrarSaudacao ? (
                  <>
                    {saudacaoPorHora()}, {greetingName}{" "}
                    <span className="inline-block align-baseline text-[0.9em]">👋</span>
                  </>
                ) : (
                  <span aria-hidden="true" className="invisible">
                    Boa noite, Benjamin{" "}
                    <span className="inline-block align-baseline text-[0.9em]">👋</span>
                  </span>
                )}
              </div>
              <div className="hidden truncate text-[13px] leading-4 text-muted-foreground sm:block">
                O trabalho não para. Vamos à próxima sessão.
              </div>
            </div>
          ) : (
            <div className="min-w-0 leading-tight">
              {breadcrumb && breadcrumb !== tituloContextual && (
                <div className="mb-0.5 hidden truncate text-xs text-muted-foreground md:block">
                  {breadcrumb}
                </div>
              )}
              <div className="truncate font-display text-base font-semibold leading-5 text-foreground md:text-lg">
                {tituloContextual ?? "Tribuno"}
              </div>
              {descricaoContextual && (
                <div className="mt-0.5 hidden truncate text-xs leading-4 text-muted-foreground md:block">
                  {descricaoContextual}
                </div>
              )}
            </div>
          )}
        </div>

        {actions && (
          <>
            <div className="hidden shrink-0 md:block">{actions}</div>
            <MobileContextActions>{actions}</MobileContextActions>
          </>
        )}

        {showUtilities && (
          <div className="hidden min-w-0 shrink-0 items-center gap-2 md:flex">
            <GlobalSearchTrigger variant="topbar" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="rounded-full transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label="Abrir menu do perfil"
                >
                  <UserAvatar user={user} perfil={perfil} className="h-8 w-8" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="min-w-0">
                  <span className="block truncate">{displayName}</span>
                  {user?.email && (
                    <span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">
                      {user.email}
                    </span>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/definicoes">
                    <Settings />
                    Definições e perfil
                  </Link>
                </DropdownMenuItem>
                <LogoutConfirmDialog
                  trigger={
                    <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
                      <LogOut />
                      Terminar sessão
                    </DropdownMenuItem>
                  }
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {mobileBackDestination && (
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 md:hidden"
            aria-label="Abrir menu"
          >
            <Ellipsis className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>

      <MobileSecondaryMenu open={menuOpen} onOpenChange={setMenuOpen} />
    </header>
  );
}

function MobileContextActions({ children }: { children: ReactNode }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 md:hidden"
          aria-label="Mais ações"
        >
          <Ellipsis className="h-5 w-5" aria-hidden="true" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        closeLabel="Fechar ações"
        className="max-h-[85dvh] overflow-y-auto rounded-t-2xl px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-5 md:hidden"
      >
        <SheetHeader className="pr-10 text-left">
          <SheetTitle>Ações</SheetTitle>
        </SheetHeader>
        <div className="mt-4 [&_button]:min-h-11">{children}</div>
      </SheetContent>
    </Sheet>
  );
}

function nomeTopBar(...nomes: Array<string | undefined>) {
  const nome = nomes
    .map((valor) => valor?.trim())
    .find((valor) => valor && valor.toLocaleLowerCase("pt-PT") !== "eleito");

  return primeiroNome(nome || "Utilizador");
}
