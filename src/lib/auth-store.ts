import { useEffect, useState } from "react";
import {
  carregarOnboardingVersionRemoto,
  carregarPerfilHibrido,
  carregarPerfilLocal,
  guardarOnboardingVersionRemoto,
  guardarPerfilHibrido,
} from "@/lib/profile-repository";
import { readJSON, writeJSON } from "@/lib/storage-provider";
import {
  iniciarSessaoSupabaseComGoogleCredential,
  isSupabaseConfigured,
  terminarSessaoSupabase,
} from "@/lib/supabase";

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
  municipio?: string;
  freguesia?: string;
  assinaturaInstitucional?: string;
  logoUrl?: string;
  updatedAt: string;
};

type AuthState = {
  user?: AuthUser;
  perfil?: PerfilEleito;
  perfisPorUserId?: Record<string, PerfilEleito>;
};

export type PerfilErroCodigo =
  | "ERRO_PERFIL_VALIDACAO"
  | "ERRO_PERFIL_SUPABASE"
  | "ERRO_PERFIL_LOCAL"
  | "ERRO_PERFIL_DESCONHECIDO";

export class PerfilErro extends Error {
  codigo: PerfilErroCodigo;
  causa?: unknown;

  constructor(codigo: PerfilErroCodigo, mensagem: string, causa?: unknown) {
    super(mensagem);
    this.name = "PerfilErro";
    this.codigo = codigo;
    this.causa = causa;
  }
}

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

function textoSeguro(valor: unknown) {
  return typeof valor === "string" ? valor.trim() : "";
}

function cargoSeguro(valor: unknown): CargoEleito {
  return typeof valor === "string" && cargosEleito.includes(valor as CargoEleito)
    ? (valor as CargoEleito)
    : "Outro";
}

function orgaoSeguro(valor: unknown): OrgaoEleito {
  return typeof valor === "string" && orgaosEleito.includes(valor as OrgaoEleito)
    ? (valor as OrgaoEleito)
    : "Outro";
}

export function normalizarPerfilEleito(perfil?: Partial<PerfilEleito> | null) {
  if (!perfil || typeof perfil !== "object") return undefined;

  const assinaturaInstitucional = textoSeguro(perfil.assinaturaInstitucional);
  const logoUrl = textoSeguro(perfil.logoUrl);

  return {
    nomeInstitucional: textoSeguro(perfil.nomeInstitucional),
    cargo: cargoSeguro(perfil.cargo),
    orgao: orgaoSeguro(perfil.orgao),
    organizacao: textoSeguro(perfil.organizacao),
    territorio: textoSeguro(perfil.territorio),
    municipio: textoSeguro(perfil.municipio) || undefined,
    freguesia: textoSeguro(perfil.freguesia) || undefined,
    assinaturaInstitucional: assinaturaInstitucional || undefined,
    logoUrl: logoUrl || undefined,
    updatedAt: textoSeguro(perfil.updatedAt) || new Date().toISOString(),
  } satisfies PerfilEleito;
}

function isBrowser() {
  return typeof window !== "undefined";
}

function perfisPorUserIdSeguro(valor: unknown): Record<string, PerfilEleito> {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return {};
  return valor as Record<string, PerfilEleito>;
}

function lerPerfilDoStorage(userId?: string): PerfilEleito | undefined {
  return normalizarPerfilEleito(carregarPerfilLocal(userId));
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
  if (!state.user?.id) return state;

  const perfilNormalizado = normalizarPerfilEleito(state.perfil);
  if (!perfilNormalizado) return state;

  const perfisPorUserId = { ...perfisPorUserIdSeguro(state.perfisPorUserId) };
  const perfilDoUser = normalizarPerfilEleito(perfisPorUserId[state.user.id]) ?? perfilNormalizado;

  perfisPorUserId[state.user.id] = perfilDoUser;

  return {
    ...state,
    perfil: perfilDoUser,
    perfisPorUserId,
  };
}

function obterPerfilDoUser(state: AuthState, user = state.user) {
  if (!user?.id) return undefined;
  return normalizarPerfilEleito(lerPerfilDoStorage(user.id) ?? state.perfisPorUserId?.[user.id]);
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

  console.info("[Tribuno Auth] loginComGoogle iniciado", {
    provider: user.provider,
    temGoogleCredential: Boolean(googleCredential),
  });

  if (googleCredential && user.provider === "google") {
    try {
      console.info("[Tribuno Auth] A iniciar autenticação Supabase com Google ID token");
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
        console.info("[Tribuno Auth] Sessão Supabase criada");
        perfilRemoto = normalizarPerfilEleito(await carregarPerfilHibrido(userAutenticado.id));
        console.info("[Tribuno Auth] Perfil remoto/local carregado após login", {
          perfilCarregado: Boolean(perfilRemoto),
          perfilCompleto: perfilCompleto(perfilRemoto),
        });
      }
    } catch {
      console.warn("[Tribuno Auth] Login Supabase indisponível; a usar fallback local.", {
        operacao: "AUTH_LOGIN_FALLBACK_LOCAL",
      });
    }
  }

  const nextState = {
    ...state,
    user: userAutenticado,
    perfil: perfilRemoto ?? obterPerfilDoUser(state, userAutenticado),
  };
  guardarAuthState(nextState);
  console.info("[Tribuno Auth] Sessão local guardada", {
    provider: nextState.user?.provider,
    perfilCarregado: Boolean(nextState.perfil),
    onboardingNecessario: !perfilCompleto(nextState.perfil),
  });
  return nextState;
}

export async function guardarPerfilEleito(perfil: Omit<PerfilEleito, "updatedAt">) {
  const state = lerAuthState();
  const userId = state.user?.id;
  const perfilAtualizado = normalizarPerfilEleito({
    ...perfil,
    updatedAt: new Date().toISOString(),
  });

  if (!perfilAtualizado) {
    throw new PerfilErro("ERRO_PERFIL_VALIDACAO", "Perfil inválido.");
  }

  try {
    guardarAuthState({
      ...state,
      perfil: perfilAtualizado,
      perfisPorUserId: userId
        ? {
            ...perfisPorUserIdSeguro(state.perfisPorUserId),
            [userId]: perfilAtualizado,
          }
        : state.perfisPorUserId,
    });
  } catch (error) {
    throw new PerfilErro(
      "ERRO_PERFIL_LOCAL",
      "Não foi possível guardar o perfil localmente.",
      error,
    );
  }

  if (userId) {
    try {
      await guardarPerfilHibrido(userId, perfilAtualizado);
    } catch (error) {
      throw new PerfilErro(
        "ERRO_PERFIL_SUPABASE",
        "Não foi possível sincronizar o perfil remotamente.",
        error,
      );
    }
  }

  return perfilAtualizado;
}

export async function concluirOnboarding(version = 1) {
  const state = lerAuthState();
  const userId = state.user?.id;

  if (!userId || !isSupabaseConfigured()) {
    if (isBrowser()) {
      window.dispatchEvent(new Event(EVENT_NAME));
    }
    return;
  }

  await guardarOnboardingVersionRemoto(userId, version);

  if (isBrowser()) {
    window.dispatchEvent(new Event(EVENT_NAME));
  }
}

export function logout() {
  if (!isBrowser()) return;

  void terminarSessaoSupabase();

  const state = lerAuthState();
  guardarAuthState({ perfisPorUserId: state.perfisPorUserId });
}

export function perfilCompleto(perfil?: PerfilEleito) {
  const perfilNormalizado = normalizarPerfilEleito(perfil);
  const dadosTerritoriaisCompletos =
    perfilNormalizado?.orgao === "Assembleia de Freguesia" ||
    perfilNormalizado?.orgao === "Junta de Freguesia"
      ? Boolean(perfilNormalizado.municipio && perfilNormalizado.freguesia)
      : Boolean(perfilNormalizado?.municipio || perfilNormalizado?.territorio);

  return Boolean(
    perfilNormalizado?.nomeInstitucional &&
    perfilNormalizado.cargo &&
    perfilNormalizado.orgao &&
    perfilNormalizado.organizacao &&
    dadosTerritoriaisCompletos,
  );
}

export function nomeVisivel(user?: AuthUser, perfil?: PerfilEleito) {
  return (
    normalizarPerfilEleito(perfil)?.nomeInstitucional || textoSeguro(user?.nome) || "Utilizador"
  );
}

export function primeiroNome(nome?: string) {
  return textoSeguro(nome).split(/\s+/)[0] || "Utilizador";
}

export function iniciais(nome?: string) {
  const partes = (textoSeguro(nome) || "Utilizador").split(/\s+/).filter(Boolean);
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
  const [onboardingVersion, setOnboardingVersion] = useState<number | undefined>();
  const [onboardingResolved, setOnboardingResolved] = useState(false);
  const perfil = obterPerfilDoUser(state);
  const hasCompleteProfile = perfilCompleto(perfil);

  const onboardingRequired =
    hasCompleteProfile && isSupabaseConfigured() && onboardingVersion === 0;

  useEffect(() => {
    let cancelled = false;
    let updateId = 0;

    async function carregarPerfilAntesDeInicializar(stateAtual: AuthState) {
      const userId = stateAtual.user?.id;
      const perfilAtual = obterPerfilDoUser(stateAtual);

      console.info("[Tribuno Auth] Verificação de perfil ao inicializar", {
        perfilLocalCarregado: Boolean(perfilAtual),
        perfilCompleto: perfilCompleto(perfilAtual),
      });

      if (!userId || perfilCompleto(perfilAtual)) return stateAtual;

      const perfilRemoto = normalizarPerfilEleito(await carregarPerfilHibrido(userId));
      console.info("[Tribuno Auth] Perfil carregado durante inicialização", {
        perfilCarregado: Boolean(perfilRemoto),
        perfilCompleto: perfilCompleto(perfilRemoto),
      });
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
      try {
        const stateAtual = lerAuthState();
        setInitialized(false);
        setOnboardingResolved(false);
        setState(stateAtual);

        const nextState = await carregarPerfilAntesDeInicializar(stateAtual);
        if (cancelled || currentUpdateId !== updateId) return;

        const latestState = lerAuthState();
        setState({
          ...latestState,
          ...nextState,
          perfisPorUserId: {
            ...perfisPorUserIdSeguro(latestState.perfisPorUserId),
            ...perfisPorUserIdSeguro(nextState.perfisPorUserId),
          },
        });

        const userId = nextState.user?.id;
        const perfilAtual = obterPerfilDoUser(nextState);

        if (!userId || !perfilCompleto(perfilAtual) || !isSupabaseConfigured()) {
          setOnboardingVersion(undefined);
          setOnboardingResolved(true);
          return;
        }

        try {
          const versao = await carregarOnboardingVersionRemoto(userId);
          if (!cancelled && currentUpdateId === updateId) {
            setOnboardingVersion(versao);
            setOnboardingResolved(true);
          }
        } catch {
          console.warn("[Tribuno Auth] Não foi possível carregar estado de onboarding.", {
            operacao: "AUTH_ONBOARDING_LOAD_FALHOU",
          });
          if (!cancelled && currentUpdateId === updateId) {
            setOnboardingVersion(undefined);
            setOnboardingResolved(true);
          }
        }
      } catch {
        console.error("[Tribuno Auth] Erro ao inicializar autenticação/perfil", {
          operacao: "AUTH_INIT_FALHOU",
        });
        if (!cancelled && currentUpdateId === updateId) {
          setState(lerAuthState());
          setOnboardingVersion(undefined);
          setOnboardingResolved(true);
        }
      } finally {
        if (!cancelled && currentUpdateId === updateId) {
          setInitialized(true);
        }
      }
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
    hasCompleteProfile,
    displayName: nomeVisivel(state.user, perfil),
    onboardingVersion,
    onboardingRequired,
    onboardingResolved,
  };
}
