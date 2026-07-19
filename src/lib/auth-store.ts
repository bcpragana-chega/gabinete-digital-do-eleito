import { useEffect, useState } from "react";
import {
  carregarOnboardingVersionRemoto,
  carregarPerfilHibrido,
  carregarPerfilLocal,
  guardarOnboardingVersionRemoto,
  guardarPerfilHibrido,
  guardarPerfilRemoto,
} from "@/lib/profile-repository";
import { readJSON, removeItem, writeJSON } from "@/lib/storage-provider";
import {
  carregarOnboardingLocal,
  guardarOnboardingLocal,
  ONBOARDING_VERSION,
  resolverVersaoOnboarding,
} from "@/lib/onboarding-state";
import {
  getSupabaseClient,
  iniciarSessaoSupabaseComGoogleCredential,
  isSupabaseConfigured,
  obterUtilizadorSupabaseValidado,
  terminarSessaoSupabase,
  withSupabaseTimeout,
} from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

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
  perfilRemotoConfirmado?: boolean;
};

export type PerfilErroCodigo =
  | "ERRO_PERFIL_VALIDACAO"
  | "ERRO_PERFIL_SUPABASE"
  | "ERRO_PERFIL_LOCAL"
  | "ERRO_PERFIL_DESCONHECIDO";

export type ContextoGravacaoPerfil = "onboarding" | "definicoes";

export function deveAvancarAposGuardarPerfil(contexto: ContextoGravacaoPerfil) {
  return contexto === "onboarding";
}

export function versaoOnboardingAposGuardarPerfil(contexto: ContextoGravacaoPerfil) {
  return contexto === "onboarding" ? 0 : undefined;
}

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
const LOGOUT_BLOCK_KEY = "tribuno.auth.logout-block.v1";
const EVENT_NAME = "tribuno:auth";
export const AUTH_HYDRATION_STEP_TIMEOUT_MS = 12_000;
let logoutEmCurso: Promise<void> | undefined;

export function executarOperacaoRemotaHidratacao<T>(
  operacao: () => PromiseLike<T>,
  etapa: "SESSION" | "PROFILE" | "ONBOARDING",
  timeoutMs = AUTH_HYDRATION_STEP_TIMEOUT_MS,
) {
  return withSupabaseTimeout(
    Promise.resolve().then(() => operacao()),
    `AUTH_HYDRATION_${etapa}`,
    timeoutMs,
  );
}

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

export function nomeLocalDisponivel(user?: AuthUser, perfil?: PerfilEleito) {
  const nomeInstitucional = textoSeguro(perfil?.nomeInstitucional);
  const nomeDaConta = textoSeguro(user?.nome);
  return nomeInstitucional || nomeDaConta || undefined;
}

function guardarAuthState(state: AuthState, options?: { emitirEvento?: boolean }) {
  if (!isBrowser()) return;

  writeJSON(STORAGE_KEY, state);
  if (options?.emitirEvento !== false) window.dispatchEvent(new Event(EVENT_NAME));
}

function lerUtilizadorBloqueadoPorLogout() {
  return isBrowser() ? readJSON<string | undefined>(LOGOUT_BLOCK_KEY, undefined) : undefined;
}

function bloquearRestauroAposLogout(userId?: string) {
  if (!isBrowser() || !userId) return;
  writeJSON(LOGOUT_BLOCK_KEY, userId);
}

function limparBloqueioLogout() {
  if (isBrowser()) removeItem(LOGOUT_BLOCK_KEY);
}

export type DestinoAcesso = "loading" | "login" | "onboarding" | "app";

export function resolverDestinoAcesso(input: {
  initialized: boolean;
  isAuthenticated: boolean;
  hasCompleteProfile: boolean;
  onboardingResolved: boolean;
  onboardingRequired: boolean;
}): DestinoAcesso {
  if (!input.initialized) return "loading";
  if (!input.isAuthenticated) return "login";
  if (!input.hasCompleteProfile) return "onboarding";
  if (!input.onboardingResolved) return "loading";
  return input.onboardingRequired ? "onboarding" : "app";
}

export function resolverPerfilAutorizado(input: {
  perfil?: PerfilEleito;
  supabaseConfigurado: boolean;
  perfilRemotoConfirmado?: boolean;
}) {
  if (input.supabaseConfigurado && input.perfilRemotoConfirmado !== true) return undefined;
  return input.perfil;
}

export function criarCoordenadorAtualizacoes(executar: () => Promise<void>) {
  let emCurso = false;
  let pendente = false;

  return async function solicitarAtualizacao() {
    if (emCurso) {
      pendente = true;
      return;
    }
    emCurso = true;
    try {
      do {
        pendente = false;
        await executar();
      } while (pendente);
    } finally {
      emCurso = false;
    }
  };
}

export function obterAuthState() {
  return lerAuthState();
}

function authUserDaSessao(user: User, local?: AuthUser): AuthUser {
  const metadata = user.user_metadata;
  return {
    id: user.id,
    email: user.email ?? local?.email ?? "",
    nome:
      textoSeguro(metadata?.full_name) ||
      textoSeguro(metadata?.name) ||
      local?.nome ||
      user.email ||
      "Utilizador",
    avatarUrl:
      textoSeguro(metadata?.avatar_url) || textoSeguro(metadata?.picture) || local?.avatarUrl,
    provider: "google",
    googleSub: local?.googleSub,
    supabaseUserId: user.id,
  };
}

export function resolverEstadoComSessaoValidada(
  state: AuthState,
  supabaseUser?: Pick<User, "id" | "email" | "user_metadata">,
  userIdBloqueado?: string,
): AuthState {
  if (!supabaseUser?.id || supabaseUser.id === userIdBloqueado) {
    return resolverEstadoLocalAposLogout(state);
  }
  const local = state.user?.id === supabaseUser.id ? state.user : undefined;
  const user = authUserDaSessao(supabaseUser as User, local);
  return {
    ...state,
    user,
    perfil: obterPerfilDoUser(state, user),
  };
}

export function resolverEstadoComPerfilRemoto(
  state: AuthState,
  perfilRemoto?: PerfilEleito,
): AuthState {
  const userId = state.user?.id;
  return {
    ...state,
    perfil: perfilRemoto,
    perfilRemotoConfirmado: Boolean(perfilRemoto),
    perfisPorUserId: {
      ...state.perfisPorUserId,
      ...(userId && perfilRemoto ? { [userId]: perfilRemoto } : {}),
    },
  };
}

export async function executarLoginSupabaseConfirmado<T>(input: {
  iniciar: () => Promise<User | undefined>;
  confirmar: (user: User) => Promise<T> | T;
}) {
  const user = await input.iniciar();
  if (!user?.id) throw new Error("AUTH_REQUIRED");
  return input.confirmar(user);
}

export async function loginComGoogle(user: AuthUser, googleCredential?: string) {
  const state = lerAuthState();

  console.info("[Tribuno Auth] loginComGoogle iniciado", {
    provider: user.provider,
    temGoogleCredential: Boolean(googleCredential),
  });

  if (!googleCredential || user.provider !== "google") {
    guardarAuthState(resolverEstadoLocalAposLogout(state));
    throw new Error("AUTH_REQUIRED");
  }

  try {
    console.info("[Tribuno Auth] A iniciar autenticação Supabase com Google ID token");
    return await executarLoginSupabaseConfirmado({
      iniciar: () => iniciarSessaoSupabaseComGoogleCredential(googleCredential),
      confirmar: async (supabaseUser) => {
        limparBloqueioLogout();
        const userAutenticado = authUserDaSessao(supabaseUser, { ...user, googleSub: user.id });
        let perfilRemoto: PerfilEleito | undefined;
        try {
          perfilRemoto = normalizarPerfilEleito(await carregarPerfilHibrido(userAutenticado.id));
        } catch {
          console.warn("[Tribuno Perfil] Perfil remoto indisponível durante o login.", {
            operacao: "PROFILE_LOGIN_LOAD_FALHOU",
          });
        }
        const nextState = {
          ...state,
          user: userAutenticado,
          perfil: perfilRemoto,
          perfilRemotoConfirmado: Boolean(perfilRemoto),
        };
        guardarAuthState(nextState);
        console.info("[Tribuno Auth] Sessão local guardada", {
          provider: nextState.user?.provider,
          perfilCarregado: Boolean(nextState.perfil),
          onboardingNecessario: !perfilCompleto(nextState.perfil),
        });
        return nextState;
      },
    });
  } catch (error) {
    guardarAuthState(resolverEstadoLocalAposLogout(state));
    throw error;
  }
}

export async function guardarPerfilEleito(
  perfil: Omit<PerfilEleito, "updatedAt">,
  contexto: ContextoGravacaoPerfil = "definicoes",
) {
  const state = lerAuthState();
  const userId = state.user?.id;
  const perfilAtualizado = normalizarPerfilEleito({
    ...perfil,
    updatedAt: new Date().toISOString(),
  });

  if (!perfilAtualizado) {
    throw new PerfilErro("ERRO_PERFIL_VALIDACAO", "Perfil inválido.");
  }

  if (!userId) {
    throw new PerfilErro("ERRO_PERFIL_VALIDACAO", "É necessária uma conta autenticada.");
  }

  try {
    await guardarPerfilHibrido(userId, perfilAtualizado);
    const onboardingVersion = versaoOnboardingAposGuardarPerfil(contexto);
    if (onboardingVersion !== undefined) {
      await guardarOnboardingVersionRemoto(userId, onboardingVersion);
    }
  } catch (error) {
    if (error instanceof Error && error.name === "PROFILE_LOCAL_WRITE_FAILED") {
      throw new PerfilErro(
        "ERRO_PERFIL_LOCAL",
        "Não foi possível guardar o perfil localmente.",
        error,
      );
    }
    throw new PerfilErro(
      "ERRO_PERFIL_SUPABASE",
      "Não foi possível sincronizar o perfil remotamente.",
      error,
    );
  }

  try {
    guardarAuthState({
      ...state,
      perfil: perfilAtualizado,
      perfisPorUserId: {
        ...perfisPorUserIdSeguro(state.perfisPorUserId),
        [userId]: perfilAtualizado,
      },
      perfilRemotoConfirmado: isSupabaseConfigured() ? true : state.perfilRemotoConfirmado,
    });
  } catch (error) {
    throw new PerfilErro(
      "ERRO_PERFIL_LOCAL",
      "O perfil foi sincronizado, mas não foi possível atualizar este dispositivo.",
      error,
    );
  }

  return perfilAtualizado;
}

/** @internal Garante a ordem perfil existente → versão de onboarding. */
export async function concluirOnboardingRemotoComDependencias(input: {
  userId: string;
  perfil: PerfilEleito;
  version: number;
  guardarPerfil: (userId: string, perfil: PerfilEleito) => Promise<unknown>;
  guardarVersion: (userId: string, version: number) => Promise<unknown>;
}) {
  await input.guardarPerfil(input.userId, input.perfil);
  await input.guardarVersion(input.userId, input.version);
}

export async function concluirOnboarding(version = 1) {
  const state = lerAuthState();
  const userId = state.user?.id;
  const perfilAtual = resolverPerfilAutorizado({
    perfil: obterPerfilDoUser(state),
    supabaseConfigurado: isSupabaseConfigured(),
    perfilRemotoConfirmado: state.perfilRemotoConfirmado,
  });

  if (!userId) throw new Error("AUTH_REQUIRED");
  if (!perfilAtual || !perfilCompleto(perfilAtual)) throw new Error("PROFILE_REQUIRED");

  if (!isSupabaseConfigured()) {
    guardarOnboardingLocal(userId, { version, concluido: true, sincronizacaoPendente: false });
  } else {
    guardarOnboardingLocal(userId, {
      version,
      concluido: false,
      sincronizacaoPendente: true,
    });
    try {
      await concluirOnboardingRemotoComDependencias({
        userId,
        perfil: perfilAtual,
        version,
        guardarPerfil: guardarPerfilRemoto,
        guardarVersion: guardarOnboardingVersionRemoto,
      });
      guardarOnboardingLocal(userId, {
        version,
        concluido: true,
        sincronizacaoPendente: false,
      });
    } catch (error) {
      console.warn("[Tribuno Auth] Não foi possível concluir o onboarding remotamente.", {
        operacao: "AUTH_ONBOARDING_SYNC_FALHOU",
      });
      throw new PerfilErro(
        "ERRO_PERFIL_SUPABASE",
        "Não foi possível confirmar o perfil institucional.",
        error,
      );
    }
  }

  if (isBrowser()) {
    window.dispatchEvent(new Event(EVENT_NAME));
  }
  return { sincronizado: true };
}

export function limparCachesTransitoriasDaConta(userId?: string) {
  if (!isBrowser()) return;
  const prefixes = ["tribuno:onboarding-wow:", "tribuno:sessao-preparada:"];
  for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = window.sessionStorage.key(index);
    if (!key || !prefixes.some((prefix) => key.startsWith(prefix))) continue;
    try {
      const raw = window.sessionStorage.getItem(key);
      const payload = raw ? (JSON.parse(raw) as { userId?: unknown }) : undefined;
      if (!userId || !payload?.userId || payload.userId === userId) {
        window.sessionStorage.removeItem(key);
      }
    } catch {
      // Formatos legados não isolados são transitórios e devem desaparecer na troca de conta.
      window.sessionStorage.removeItem(key);
    }
  }
}

export function resolverEstadoLocalAposLogout(state: {
  perfisPorUserId?: Record<string, PerfilEleito>;
}): AuthState {
  return { perfisPorUserId: state.perfisPorUserId };
}

export function criarExecutorLogout(deps: {
  terminarRemoto: () => Promise<void>;
  finalizarLocal: () => void;
}) {
  let emCurso: Promise<void> | undefined;
  return function executar() {
    if (emCurso) return emCurso;
    emCurso = (async () => {
      try {
        await deps.terminarRemoto();
      } catch {
        console.warn("[Tribuno Auth] Logout remoto indisponível; sessão local terminada.", {
          operacao: "AUTH_LOGOUT_FALLBACK_LOCAL",
        });
      } finally {
        deps.finalizarLocal();
      }
    })().finally(() => {
      emCurso = undefined;
    });
    return emCurso;
  };
}

export async function logout(): Promise<void> {
  if (!isBrowser()) return;
  if (logoutEmCurso) return logoutEmCurso;

  const executar = criarExecutorLogout({
    terminarRemoto: terminarSessaoSupabase,
    finalizarLocal: () => {
      const state = lerAuthState();
      bloquearRestauroAposLogout(state.user?.id);
      limparCachesTransitoriasDaConta(state.user?.id);
      guardarAuthState(resolverEstadoLocalAposLogout(state));
      window.google?.accounts.id.disableAutoSelect?.();
    },
  });
  logoutEmCurso = executar().finally(() => {
    logoutEmCurso = undefined;
  });
  return logoutEmCurso;
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
  const [state, setState] = useState<AuthState>(() => lerAuthState());
  const [initialized, setInitialized] = useState(false);
  const [onboardingVersion, setOnboardingVersion] = useState<number | undefined>();
  const [onboardingResolved, setOnboardingResolved] = useState(false);
  const perfil = resolverPerfilAutorizado({
    perfil: obterPerfilDoUser(state),
    supabaseConfigurado: isSupabaseConfigured(),
    perfilRemotoConfirmado: state.perfilRemotoConfirmado,
  });
  const localDisplayName = nomeLocalDisponivel(state.user, obterPerfilDoUser(state));
  const hasCompleteProfile = perfilCompleto(perfil);

  const onboardingRequired = hasCompleteProfile && (onboardingVersion ?? 0) < ONBOARDING_VERSION;

  useEffect(() => {
    let cancelled = false;
    let primeiraExecucao = true;

    async function carregarPerfilAntesDeInicializar(stateAtual: AuthState) {
      const userId = stateAtual.user?.id;
      const perfilAtual = obterPerfilDoUser(stateAtual);

      console.info("[Tribuno Auth] Verificação de perfil ao inicializar", {
        perfilLocalCarregado: Boolean(perfilAtual),
        perfilCompleto: perfilCompleto(perfilAtual),
      });

      if (!userId) return stateAtual;
      if (!isSupabaseConfigured()) return stateAtual;

      let perfilRemoto: PerfilEleito | undefined;
      try {
        perfilRemoto = normalizarPerfilEleito(
          await executarOperacaoRemotaHidratacao(() => carregarPerfilHibrido(userId), "PROFILE"),
        );
      } catch {
        console.warn("[Tribuno Perfil] Não foi possível confirmar o perfil remoto.", {
          operacao: "PROFILE_INIT_LOAD_FALHOU",
        });
      }
      console.info("[Tribuno Auth] Perfil carregado durante inicialização", {
        perfilCarregado: Boolean(perfilRemoto),
        perfilCompleto: perfilCompleto(perfilRemoto),
      });

      const nextState = resolverEstadoComPerfilRemoto(stateAtual, perfilRemoto);

      // A hidratação já atualiza este hook diretamente; emitir tribuno:auth aqui
      // reiniciaria a mesma hidratação recursivamente.
      guardarAuthState(nextState, { emitirEvento: false });
      return nextState;
    }

    async function executarAtualizacao() {
      const inicial = primeiraExecucao;
      primeiraExecucao = false;
      try {
        const stateLocal = lerAuthState();
        if (inicial) {
          setInitialized(false);
          setOnboardingResolved(false);
        }
        const supabaseUser = await executarOperacaoRemotaHidratacao(
          obterUtilizadorSupabaseValidado,
          "SESSION",
        );
        const userIdBloqueado = lerUtilizadorBloqueadoPorLogout();
        const stateAtual = resolverEstadoComSessaoValidada(
          stateLocal,
          supabaseUser,
          userIdBloqueado,
        );
        if (!supabaseUser || supabaseUser.id === userIdBloqueado) {
          limparCachesTransitoriasDaConta(stateLocal.user?.id);
          guardarAuthState(stateAtual, { emitirEvento: false });
          setState(stateAtual);
          setOnboardingVersion(undefined);
          setOnboardingResolved(true);
          return;
        }
        guardarAuthState(stateAtual, { emitirEvento: false });
        setState(stateAtual);

        const nextState = await carregarPerfilAntesDeInicializar(stateAtual);
        if (cancelled) return;

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
        const perfilAtual = resolverPerfilAutorizado({
          perfil: obterPerfilDoUser(nextState),
          supabaseConfigurado: isSupabaseConfigured(),
          perfilRemotoConfirmado: nextState.perfilRemotoConfirmado,
        });

        if (!userId || !perfilCompleto(perfilAtual)) {
          setOnboardingVersion(undefined);
          setOnboardingResolved(true);
          return;
        }

        const local = carregarOnboardingLocal(userId);
        if (!isSupabaseConfigured() && local?.concluido && local.version >= ONBOARDING_VERSION) {
          setOnboardingVersion(local.version);
          setOnboardingResolved(true);
          setInitialized(true);
        }
        try {
          const versaoRemota = await executarOperacaoRemotaHidratacao(
            () => carregarOnboardingVersionRemoto(userId),
            "ONBOARDING",
          );
          const versao = resolverVersaoOnboarding({
            versaoRemota,
            local,
            remotoObrigatorio: isSupabaseConfigured(),
          });
          if (local?.sincronizacaoPendente && local.concluido) {
            void guardarOnboardingVersionRemoto(userId, local.version)
              .then(() => guardarOnboardingLocal(userId, { sincronizacaoPendente: false }))
              .catch(() => undefined);
          }
          if (!cancelled) {
            setOnboardingVersion(versao);
            setOnboardingResolved(true);
          }
        } catch {
          console.warn("[Tribuno Auth] Não foi possível carregar estado de onboarding.", {
            operacao: "AUTH_ONBOARDING_LOAD_FALHOU",
          });
          if (!cancelled) {
            setOnboardingVersion(isSupabaseConfigured() ? 0 : local?.concluido ? local.version : 0);
            setOnboardingResolved(true);
          }
        }
      } catch {
        console.error("[Tribuno Auth] Erro ao inicializar autenticação/perfil", {
          operacao: "AUTH_INIT_FALHOU",
        });
        if (!cancelled) {
          const local = lerAuthState();
          limparCachesTransitoriasDaConta(local.user?.id);
          const semSessao = resolverEstadoLocalAposLogout(local);
          guardarAuthState(semSessao, { emitirEvento: false });
          setState(semSessao);
          setOnboardingVersion(undefined);
          setOnboardingResolved(true);
        }
      } finally {
        if (!cancelled) {
          setOnboardingResolved(true);
          setInitialized(true);
        }
      }
    }

    const atualizar = criarCoordenadorAtualizacoes(executarAtualizacao);

    void atualizar();
    window.addEventListener(EVENT_NAME, atualizar);
    window.addEventListener("storage", atualizar);
    const authSubscription = getSupabaseClient()?.auth.onAuthStateChange(() => {
      if (logoutEmCurso) return;
      void atualizar();
    });

    return () => {
      cancelled = true;
      window.removeEventListener(EVENT_NAME, atualizar);
      window.removeEventListener("storage", atualizar);
      authSubscription?.data.subscription.unsubscribe();
    };
  }, []);

  return {
    initialized,
    user: state.user,
    perfil,
    isAuthenticated: Boolean(state.user),
    hasCompleteProfile,
    displayName: nomeVisivel(state.user, perfil),
    localDisplayName,
    onboardingVersion,
    onboardingRequired,
    onboardingResolved,
  };
}
