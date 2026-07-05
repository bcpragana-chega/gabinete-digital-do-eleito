import { useEffect, useState } from "react";
import {
  carregarPerfilHibrido,
  carregarPerfilLocal,
  guardarPerfilHibrido,
} from "@/lib/profile-repository";
import { readJSON, writeJSON } from "@/lib/storage-provider";
import { iniciarSessaoSupabaseComGoogleCredential, terminarSessaoSupabase } from "@/lib/supabase";

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
  googleSub?: string;
  supabaseUserId?: string;
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

function lerPerfilDoStorage(userId?: string): PerfilEleito | undefined {
  return carregarPerfilLocal(userId);
}

function lerAuthState(): AuthState {
  if (!isBrowser()) return {};

  try {
    const parsed = readJSON<AuthState | undefined>(STORAGE_KEY, undefined);
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

  writeJSON(STORAGE_KEY, state);
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function obterAuthState() {
  return lerAuthState();
}

export async function loginComGoogle(user: AuthUser, googleCredential?: string) {
  const state = lerAuthState();
  let userAutenticado = user;
  let perfilRemoto: PerfilEleito | undefined;

  if (googleCredential && user.provider === "google") {
    try {
      const supabaseUser = await iniciarSessaoSupabaseComGoogleCredential(googleCredential);

      if (supabaseUser?.id) {
        userAutenticado = {
          ...user,
          id: supabaseUser.id,
          email: supabaseUser.email || user.email,
          nome:
            (supabaseUser.user_metadata?.full_name as string | undefined) ||
            (supabaseUser.user_metadata?.name as string | undefined) ||
            user.nome,
          avatarUrl:
            (supabaseUser.user_metadata?.avatar_url as string | undefined) ||
            (supabaseUser.user_metadata?.picture as string | undefined) ||
            user.avatarUrl,
          googleSub: user.id,
          supabaseUserId: supabaseUser.id,
        };
        perfilRemoto = await carregarPerfilHibrido(userAutenticado.id);
      }
    } catch (error) {
      console.warn("[Tribuno] Login Supabase indisponível; a usar fallback local.", error);
    }
  }

  const nextState = {
    ...state,
    user: userAutenticado,
    perfil: perfilRemoto ?? obterPerfilDoUser(state, userAutenticado),
  };
  guardarAuthState(nextState);
  return nextState;
}

export async function guardarPerfilEleito(perfil: Omit<PerfilEleito, "updatedAt">) {
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

  if (userId) await guardarPerfilHibrido(userId, perfilAtualizado);

  return perfilAtualizado;
}

export function logout() {
  if (!isBrowser()) return;

  void terminarSessaoSupabase();

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
    let cancelled = false;
    let updateId = 0;

    async function carregarPerfilAntesDeInicializar(stateAtual: AuthState) {
      const userId = stateAtual.user?.id;
      const perfilAtual = obterPerfilDoUser(stateAtual);

      if (!userId || perfilCompleto(perfilAtual)) return stateAtual;

      const perfilRemoto = await carregarPerfilHibrido(userId);
      if (!perfilRemoto) return stateAtual;

      const nextState = {
        ...stateAtual,
        perfil: perfilRemoto,
        perfisPorUserId: {
          ...stateAtual.perfisPorUserId,
          [userId]: perfilRemoto,
        },
      };

      guardarAuthState(nextState);
      return nextState;
    }

    async function atualizar() {
      const currentUpdateId = ++updateId;
      const stateAtual = lerAuthState();
      setInitialized(false);
      setState(stateAtual);

      const nextState = await carregarPerfilAntesDeInicializar(stateAtual);
      if (cancelled || currentUpdateId !== updateId) return;

      const latestState = lerAuthState();
      setState({
        ...latestState,
        ...nextState,
        perfisPorUserId: {
          ...latestState.perfisPorUserId,
          ...nextState.perfisPorUserId,
        },
      });
      setInitialized(true);
    }

    void atualizar();
    window.addEventListener(EVENT_NAME, atualizar);
    window.addEventListener("storage", atualizar);

    return () => {
      cancelled = true;
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
