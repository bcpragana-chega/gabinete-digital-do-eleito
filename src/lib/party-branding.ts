import type { PerfilEleito } from "@/lib/auth-store";

export const LOGO_PARTIDARIO_NEUTRO = "/branding/neutral-mark.svg";
export const LOGO_PARTIDARIO_CHEGA = "https://partidochega.pt/wp-content/uploads/2019/04/CHEGA.png";

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
  const caminhoLocal = logoUrl.split(/[?#]/, 1)[0];
  return caminhoLocal === LOGO_PARTIDARIO_NEUTRO || caminhoLocal === "/logo.png";
}

export function resolverLogoPartidario(input?: {
  perfil?: Partial<PerfilEleito>;
  partidoOuGrupo?: string;
}) {
  const explicito = textoSeguro(input?.perfil?.logoUrl);
  if (explicito) return explicito;

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
