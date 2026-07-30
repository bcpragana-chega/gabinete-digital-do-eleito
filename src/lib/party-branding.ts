import type { PerfilEleito } from "@/lib/auth-store";

export const LOGO_PARTIDARIO_NEUTRO = "/branding/neutral-mark.svg";
export const LOGO_PARTIDARIO_CHEGA = "https://partidochega.pt/wp-content/uploads/2019/04/CHEGA.png";

const caminhosPlaceholderHistoricos = new Set([LOGO_PARTIDARIO_NEUTRO, "/logo.png"]);

const logosPorPartido: Record<string, string> = {
  CHEGA: LOGO_PARTIDARIO_CHEGA,
};

function textoSeguro(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizarPartido(value: unknown) {
  return textoSeguro(value)
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[!]+/g, "")
    .replace(/\s+/g, " ")
    .toLocaleUpperCase("pt-PT");
}

export function isLogoPartidarioPlaceholder(value: unknown) {
  const logoUrl = textoSeguro(value);
  if (!logoUrl) return false;
  try {
    const pathname = decodeURIComponent(new URL(logoUrl, "https://tribuno.invalid").pathname)
      .replace(/\/+/g, "/")
      .toLocaleLowerCase("pt-PT");
    return caminhosPlaceholderHistoricos.has(pathname);
  } catch {
    const caminhoLocal = logoUrl
      .split(/[?#]/, 1)[0]
      ?.replace(/\/+/g, "/")
      .toLocaleLowerCase("pt-PT");
    return Boolean(caminhoLocal && caminhosPlaceholderHistoricos.has(caminhoLocal));
  }
}

export function resolverLogoPartidario(input?: {
  perfil?: Partial<PerfilEleito>;
  partidoOuGrupo?: string;
}) {
  const explicito = textoSeguro(input?.perfil?.logoUrl);
  if (explicito && !isLogoPartidarioPlaceholder(explicito)) return explicito;

  const partido = normalizarPartido(input?.partidoOuGrupo || input?.perfil?.organizacao);
  if (partido && logosPorPartido[partido]) return logosPorPartido[partido];

  return undefined;
}

export function resolverMandatoInstitucional(input?: {
  perfil?: Partial<PerfilEleito>;
  contexto?: unknown;
}) {
  const perfil = input?.perfil as Record<string, unknown> | undefined;
  const contexto =
    input?.contexto && typeof input.contexto === "object"
      ? (input.contexto as Record<string, unknown>)
      : undefined;
  const institution =
    contexto?.institution && typeof contexto.institution === "object"
      ? (contexto.institution as Record<string, unknown>)
      : undefined;
  const session =
    contexto?.session && typeof contexto.session === "object"
      ? (contexto.session as Record<string, unknown>)
      : undefined;

  return [
    perfil?.mandato,
    perfil?.mandate,
    contexto?.mandato,
    contexto?.mandate,
    institution?.mandato,
    institution?.mandate,
    session?.mandato,
    session?.mandate,
  ]
    .map(textoSeguro)
    .find(Boolean);
}
