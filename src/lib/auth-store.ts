import { useEffect, useState } from "react";

export type CargoEleito =
  | "Membro da Assembleia de Freguesia"
  | "Presidente da Junta de Freguesia"
  | "Secretário da Junta de Freguesia"
  | "Tesoureiro da Junta de Freguesia"
  | "Membro da Assembleia Municipal"
  | "Vereador"
  | "Deputado Municipal"
  | "Outro";

export type OrgaoEleito =
  | "Assembleia de Freguesia"
  | "Junta de Freguesia"
  | "Assembleia Municipal"
  | "Câmara Municipal"
  | "Outro";

export type AuthUser = {
  id: string;
  nome: string;
  email: string;
  avatarUrl?: string;
  provider: "google" | "local-dev";
};

export type PerfilEleito = {
  nomeInstitucional: string;
  cargo: CargoEleito;
  orgao: OrgaoEleito;
  organizacao: string;
  territorio: string;
  assinaturaInstitucional?: string;
  updatedAt: string;
};

type AuthState = {
  user?: AuthUser;
  perfil?: PerfilEleito;
  perfisPorUserId?: Record<string, PerfilEleito>;
};

const STORAGE_KEY = "tribuno.auth.v1";
const EVENT_NAME = "tribuno:auth";

export const cargosEleito: CargoEleito[] = [
  "Membro da Assembleia de Freguesia",
  "Presidente da Junta de Freguesia",
  "Secretário da Junta de Freguesia",
  "Tesoureiro da Junta de Freguesia",
  "Membro da Assembleia Municipal",
  "Vereador",
  "Deputado Municipal",
  "Outro",
];

export const orgaosEleito: OrgaoEleito[] = [
  "Assembleia de Freguesia",
  "Junta de Freguesia",
  "Assembleia Municipal",
  "Câmara Municipal",
  "Outro",
];

function isBrowser() {
  return typeof window !== "undefined";
}

function normalizarUserId(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("pt-PT")
    .replace(/[^a-z0-9@._-]/gi, "_");
}

function chavePerfil(userId: string) {
  return `tribuno:perfil:${normalizarUserId(userId)}`;
}

function lerPerfilDoStorage(userId?: string): PerfilEleito | undefined {
  if (!isBrowser() || !userId) return undefined;

  try {
    const raw = window.localStorage.getItem(chavePerfil(userId));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as PerfilEleito) : undefined;
  } catch {
    return undefined;
  }
}

function guardarPerfilNoStorage(userId: string, perfil: PerfilEleito) {
  if (!isBrowser()) return;
  window.localStorage.setItem(chavePerfil(userId), JSON.stringify(perfil));
}

function lerAuthState(): AuthState {
  if (!isBrowser()) return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};

    return normalizarAuthState(parsed as AuthState);
  } catch {
    return {};
  }
}

function normalizarAuthState(state: AuthState): AuthState {
  if (!state.user?.id || !state.perfil) return state;

  const perfisPorUserId = { ...state.perfisPorUserId };

  if (!perfisPorUserId[state.user.id]) {
    perfisPorUserId[state.user.id] = state.perfil;
  }

  return {
    ...state,
    perfil: perfisPorUserId[state.user.id],
    perfisPorUserId,
  };
}

function obterPerfilDoUser(state: AuthState, user = state.user) {
  if (!user?.id) return undefined;
  return lerPerfilDoStorage(user.id) ?? state.perfisPorUserId?.[user.id];
}

function guardarAuthState(state: AuthState) {
  if (!isBrowser()) return;

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function obterAuthState() {
  return lerAuthState();
}

export function loginComGoogle(user: AuthUser) {
  const state = lerAuthState();
  const nextState = {
    ...state,
    user,
    perfil: obterPerfilDoUser(state, user),
  };
  guardarAuthState(nextState);
  return nextState;
}

export function guardarPerfilEleito(perfil: Omit<PerfilEleito, "updatedAt">) {
  const state = lerAuthState();
  const userId = state.user?.id;
  const perfilAtualizado: PerfilEleito = {
    ...perfil,
    updatedAt: new Date().toISOString(),
  };

  guardarAuthState({
    ...state,
    perfil: perfilAtualizado,
    perfisPorUserId: userId
      ? {
          ...state.perfisPorUserId,
          [userId]: perfilAtualizado,
        }
      : state.perfisPorUserId,
  });

  if (userId) guardarPerfilNoStorage(userId, perfilAtualizado);

  return perfilAtualizado;
}

export function logout() {
  if (!isBrowser()) return;

  const state = lerAuthState();
  guardarAuthState({ perfisPorUserId: state.perfisPorUserId });
}

export function perfilCompleto(perfil?: PerfilEleito) {
  return Boolean(
    perfil?.nomeInstitucional.trim() &&
    perfil.cargo &&
    perfil.orgao &&
    perfil.organizacao.trim() &&
    perfil.territorio.trim(),
  );
}

export function nomeVisivel(user?: AuthUser, perfil?: PerfilEleito) {
  return perfil?.nomeInstitucional.trim() || user?.nome.trim() || "Utilizador";
}

export function primeiroNome(nome: string) {
  return nome.trim().split(/\s+/)[0] || "Utilizador";
}

export function iniciais(nome?: string) {
  const partes = (nome || "Utilizador").trim().split(/\s+/).filter(Boolean);
  const letras = partes.slice(0, 2).map((parte) => parte[0]?.toUpperCase());
  return letras.join("") || "U";
}

export function saudacaoPorHora(data = new Date()) {
  const hora = data.getHours();

  if (hora >= 5 && hora < 12) return "Bom dia";
  if (hora >= 12 && hora < 20) return "Boa tarde";
  return "Boa noite";
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({});
  const [initialized, setInitialized] = useState(false);
  const perfil = obterPerfilDoUser(state);

  useEffect(() => {
    function atualizar() {
      setState(lerAuthState());
      setInitialized(true);
    }

    atualizar();
    window.addEventListener(EVENT_NAME, atualizar);
    window.addEventListener("storage", atualizar);

    return () => {
      window.removeEventListener(EVENT_NAME, atualizar);
      window.removeEventListener("storage", atualizar);
    };
  }, []);

  return {
    initialized,
    user: state.user,
    perfil,
    isAuthenticated: Boolean(state.user),
    hasCompleteProfile: perfilCompleto(perfil),
    displayName: nomeVisivel(state.user, perfil),
  };
}
