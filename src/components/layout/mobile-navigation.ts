import type { SidebarItem } from "@/components/layout/sidebar-config";

export const MOBILE_BREAKPOINT = 768;

export type MobileDestination = "/" | "/assuntos" | "/sessoes" | "/biblioteca";

function documentDestination(search: string): MobileDestination {
  const params = new URLSearchParams(search);
  const origem = params.get("origem");

  if (origem === "assunto" && params.get("assuntoId") && !params.get("sessaoId")) {
    return "/assuntos";
  }

  if (origem === "sessao" && params.get("sessaoId") && !params.get("assuntoId")) {
    return "/sessoes";
  }

  return "/biblioteca";
}

export function getActiveMobileDestination(pathname: string, search = ""): MobileDestination {
  if (pathname === "/") return "/";
  if (pathname === "/assuntos" || pathname.startsWith("/assuntos/")) return "/assuntos";
  if (pathname === "/sessoes" || pathname.startsWith("/sessoes/")) return "/sessoes";
  if (pathname.startsWith("/documentos/")) return documentDestination(search);
  if (pathname === "/biblioteca" || pathname.startsWith("/biblioteca/")) return "/biblioteca";
  if (pathname === "/caixa-de-entrada" || pathname.startsWith("/caixa-de-entrada/")) {
    return "/biblioteca";
  }

  return "/";
}

export function getMobileBackDestination(pathname: string, search = ""): string | undefined {
  if (pathname.startsWith("/documentos/")) {
    const params = new URLSearchParams(search);
    const origem = documentDestination(search);
    const id = origem === "/assuntos" ? params.get("assuntoId") : params.get("sessaoId");

    if (origem === "/assuntos" && id) return `/assuntos/${encodeURIComponent(id)}`;
    if (origem === "/sessoes" && id) return `/sessoes/${encodeURIComponent(id)}`;
    return "/biblioteca";
  }

  const sessionPoint = pathname.match(/^(\/sessoes\/[^/]+\/preparacao\/pontos)\/[^/]+/);
  if (sessionPoint) return sessionPoint[1];

  const sessionPreparationChild = pathname.match(/^(\/sessoes\/[^/]+\/preparacao)\/[^/]+/);
  if (sessionPreparationChild) return sessionPreparationChild[1];

  const sessionPreparation = pathname.match(/^\/sessoes\/([^/]+)\/preparacao$/);
  if (sessionPreparation) return `/sessoes/${sessionPreparation[1]}`;

  if (/^\/sessoes\/[^/]+$/.test(pathname)) return "/sessoes";
  if (/^\/assuntos\/[^/]+$/.test(pathname)) return "/assuntos";

  return undefined;
}

export function isMobileItemActive(
  pathname: string,
  search: string,
  item: Pick<SidebarItem, "to">,
) {
  return getActiveMobileDestination(pathname, search) === item.to;
}
