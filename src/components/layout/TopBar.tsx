import { Link, useRouterState } from "@tanstack/react-router";
import { LogOut, Menu, Settings } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { UserAvatar } from "@/components/auth/UserAvatar";
import { LogoutConfirmDialog } from "@/components/auth/LogoutConfirmDialog";
import { HelpAssistantPanel } from "@/components/help/HelpAssistantPanel";
import {
  isSidebarItemActive,
  sidebarItemClassName,
  sidebarItems,
  sidebarSections,
} from "@/components/layout/sidebar-config";
import { UniversalSearch } from "@/components/search/UniversalSearch";
import { primeiroNome, saudacaoPorHora, useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type TopBarProps = {
  title?: string;
  description?: string;
  breadcrumb?: ReactNode;
  actions?: ReactNode;
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
  if (pathname === "/biblioteca") return "Biblioteca";
  if (pathname === "/caixa-de-entrada") return "Biblioteca";
  if (pathname === "/historico") return "Histórico";
  if (pathname === "/definicoes") return "Definições";
  return undefined;
}

export function TopBar({ title, description, breadcrumb, actions }: TopBarProps) {
  const [menuAberto, setMenuAberto] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, perfil, displayName, localDisplayName, initialized } = useAuth();
  const greetingName = nomeTopBar(
    initialized ? displayName : localDisplayName,
    initialized ? user?.nome : undefined,
    initialized ? perfil?.nomeInstitucional : undefined,
  );
  const mostrarSaudacao = initialized || Boolean(localDisplayName);
  const dashboard = pathname === "/";
  const tituloContextual =
    title ?? (typeof breadcrumb === "string" ? breadcrumb : tituloPorPathname(pathname));
  const descricaoContextual =
    description ?? (tituloContextual ? descricoesPorTitulo[tituloContextual] : undefined);

  return (
    <header className="sticky top-0 z-40 border-b border-border/45 bg-background/90 backdrop-blur-xl">
      <div className="flex min-h-16 flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 md:min-h-20 md:flex-nowrap md:gap-4 md:px-6 md:py-0">
        <div className="order-1 flex min-w-0 flex-1 items-center gap-3">
          <Sheet open={menuAberto} onOpenChange={setMenuAberto}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-card/80 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
                aria-label="Abrir menu"
              >
                <Menu className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </SheetTrigger>

            <SheetContent
              side="left"
              className="w-[88vw] max-w-80 border-border/70 bg-background p-0 text-foreground"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>Menu de navegação</SheetTitle>
              </SheetHeader>

              <div className="flex h-full flex-col">
                <div className="border-b border-border/60 px-5 py-5">
                  <div className="flex items-center gap-2.5">
                    <img
                      src="/logo.png"
                      alt="Tribuno"
                      className="h-12 w-12 shrink-0 object-contain"
                    />
                    <div className="leading-tight">
                      <div className="font-display text-base font-semibold">Tribuno</div>
                      <div className="text-[11px] uppercase text-muted-foreground">
                        Gabinete Digital do Eleito
                      </div>
                    </div>
                  </div>
                </div>

                <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
                  <div className="px-3 pb-2 text-[10.5px] font-medium uppercase text-muted-foreground">
                    Navegação
                  </div>

                  {sidebarItems.map((item) => {
                    const Icon = item.icon;
                    const active = isSidebarItemActive(pathname, item);

                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setMenuAberto(false)}
                        className={sidebarItemClassName(active, "mobile")}
                      >
                        <Icon className="h-4 w-4 shrink-0 opacity-90" strokeWidth={1.75} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}

                  {sidebarSections.map((section) => (
                    <section key={section.id} className="pt-3">
                      <div className="px-3 pb-2 text-[10.5px] font-medium text-muted-foreground">
                        {section.label}
                      </div>
                      <div className="space-y-1">
                        {section.items.map((item) => {
                          const Icon = item.icon;
                          const active = isSidebarItemActive(pathname, item);

                          return (
                            <Link
                              key={`${section.id}-${item.to}`}
                              to={item.to}
                              onClick={() => setMenuAberto(false)}
                              className={sidebarItemClassName(active, "mobile")}
                            >
                              <Icon className="h-4 w-4 shrink-0 opacity-90" strokeWidth={1.75} />
                              <span>{item.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </nav>

                <div className="border-t border-border/60 px-3 py-3 md:hidden">
                  <HelpAssistantPanel
                    pathname={pathname}
                    triggerClassName={sidebarItemClassName(false, "mobile")}
                  />
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {dashboard ? (
            <div className="min-w-0 leading-tight">
              <div className="truncate font-display text-xl font-bold leading-6 text-foreground sm:text-2xl lg:text-[1.65rem] lg:leading-8">
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
              <div className="mt-0.5 truncate text-[13px] leading-5 text-muted-foreground sm:text-sm">
                Vamos preparar a próxima sessão.
              </div>
            </div>
          ) : (
            <div className="min-w-0 leading-tight">
              {breadcrumb && breadcrumb !== tituloContextual && (
                <div className="mb-0.5 truncate text-xs text-muted-foreground">{breadcrumb}</div>
              )}
              <div className="truncate font-display text-lg font-semibold leading-6 text-foreground sm:text-xl">
                {tituloContextual ?? "Tribuno"}
              </div>
              {descricaoContextual && (
                <div className="mt-0.5 hidden truncate text-[13px] leading-5 text-muted-foreground sm:block">
                  {descricaoContextual}
                </div>
              )}
            </div>
          )}
        </div>

        {actions && (
          <div className="order-3 w-full md:order-2 md:w-auto md:shrink-0">{actions}</div>
        )}

        <div className="order-2 ml-auto flex min-w-0 shrink-0 items-center gap-1.5 md:order-3 md:ml-0 md:gap-2">
          <UniversalSearch />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="rounded-full transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="Abrir menu do perfil"
              >
                <UserAvatar user={user} perfil={perfil} className="h-9 w-9" />
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
      </div>
    </header>
  );
}

function nomeTopBar(...nomes: Array<string | undefined>) {
  const nome = nomes
    .map((valor) => valor?.trim())
    .find((valor) => valor && valor.toLocaleLowerCase("pt-PT") !== "eleito");

  return primeiroNome(nome || "Utilizador");
}
