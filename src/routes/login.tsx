import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { loginComGoogle, perfilCompleto, useAuth, type AuthUser } from "@/lib/auth-store";
import {
  createAuthAttemptId,
  getSafeBrowserAuthContext,
  logAuthDiagnostic,
  type AuthDiagnosticPhase,
} from "@/lib/auth-diagnostics";
import {
  isSupabaseConfigured,
  SupabaseAuthNotStartedError,
  SupabaseAuthRequestError,
  SupabaseAuthReturnedError,
  SupabaseAuthTimeoutError,
} from "@/lib/supabase";

const GOOGLE_CALLBACK_TIMEOUT_MS = 90_000;

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
            use_fedcm_for_button?: boolean;
            button_auto_select?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              shape?: "rectangular" | "pill" | "circle" | "square";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              width?: string | number;
            },
          ) => void;
          disableAutoSelect?: () => void;
        };
      };
    };
  }
}

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — Tribuno" },
      {
        name: "description",
        content: "Entrar no Tribuno com uma conta Google.",
      },
    ],
  }),
  component: LoginPage,
});

function decodeJwtPayload(token: string) {
  const payload = token.split(".")[1];
  if (!payload) throw new Error("Credencial Google inválida.");

  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const json = decodeURIComponent(
    atob(normalized)
      .split("")
      .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
      .join(""),
  );

  return JSON.parse(json) as {
    sub: string;
    name?: string;
    given_name?: string;
    family_name?: string;
    email?: string;
    picture?: string;
  };
}

function userFromCredential(credential: string): AuthUser {
  const payload = decodeJwtPayload(credential);
  const nomeGoogle =
    payload.name ||
    [payload.given_name, payload.family_name].filter(Boolean).join(" ").trim() ||
    payload.email ||
    "Utilizador";

  return {
    id: payload.sub,
    nome: nomeGoogle,
    email: payload.email || "",
    avatarUrl: payload.picture,
    provider: "google",
  };
}

type GoogleClientIdStatus = "missing" | "empty" | "loaded";
type LoginErroCodigo =
  | "ERRO_LOGIN_GOOGLE_CALLBACK"
  | "ERRO_LOGIN_GOOGLE_CREDENTIAL"
  | "ERRO_LOGIN_BROWSER"
  | "ERRO_LOGIN_SUPABASE_NAO_INICIADO"
  | "ERRO_LOGIN_SUPABASE_TIMEOUT"
  | "ERRO_LOGIN_SUPABASE"
  | "ERRO_LOGIN_PERFIL"
  | "ERRO_LOGIN_NAVEGACAO"
  | "ERRO_LOGIN_DESCONHECIDO";

const mensagensErroLogin: Record<LoginErroCodigo, string> = {
  ERRO_LOGIN_GOOGLE_CALLBACK:
    "A Google não concluiu a resposta ao botão. Reveja as permissões de privacidade e tente novamente.",
  ERRO_LOGIN_GOOGLE_CREDENTIAL:
    "A Google não devolveu uma credencial válida. Tente novamente ou use outro navegador.",
  ERRO_LOGIN_BROWSER:
    "O navegador bloqueou ou interrompeu o pedido. Reveja cookies, extensões de privacidade e a rede.",
  ERRO_LOGIN_SUPABASE_NAO_INICIADO:
    "O pedido de autenticação não chegou a ser iniciado. Recarregue a página e tente novamente.",
  ERRO_LOGIN_SUPABASE_TIMEOUT:
    "O pedido de autenticação excedeu o tempo limite. Verifique a ligação e tente novamente.",
  ERRO_LOGIN_SUPABASE:
    "A autenticação remota não respondeu corretamente. Tente novamente dentro de instantes.",
  ERRO_LOGIN_PERFIL: "A sessão foi criada, mas não foi possível carregar o perfil.",
  ERRO_LOGIN_NAVEGACAO: "A sessão foi criada, mas não foi possível abrir a aplicação.",
  ERRO_LOGIN_DESCONHECIDO:
    "Não foi possível iniciar sessão. Tente novamente ou recarregue a página.",
};

function getGoogleClientIdStatus(rawClientId: unknown): GoogleClientIdStatus {
  if (rawClientId === undefined) return "missing";
  if (typeof rawClientId !== "string" || rawClientId.trim().length === 0) return "empty";
  return "loaded";
}

function getCurrentOrigin() {
  if (typeof window === "undefined") return "origem indisponível";
  return window.location.origin;
}

function codigoLoginDoErro(error: unknown): LoginErroCodigo {
  if (error instanceof SupabaseAuthNotStartedError) return "ERRO_LOGIN_SUPABASE_NAO_INICIADO";
  if (error instanceof SupabaseAuthTimeoutError) return "ERRO_LOGIN_SUPABASE_TIMEOUT";
  if (error instanceof SupabaseAuthReturnedError) return "ERRO_LOGIN_SUPABASE";
  if (error instanceof SupabaseAuthRequestError) return "ERRO_LOGIN_BROWSER";

  if (error instanceof Error) {
    const mensagem = error.message.toLocaleLowerCase("pt-PT");
    if (mensagem.includes("credential") || mensagem.includes("credencial")) {
      return "ERRO_LOGIN_GOOGLE_CREDENTIAL";
    }
    if (
      mensagem.includes("supabase") ||
      mensagem.includes("auth") ||
      mensagem.includes("timeout_supabase") ||
      mensagem.includes("id token")
    ) {
      return "ERRO_LOGIN_SUPABASE";
    }
    if (mensagem.includes("perfil") || mensagem.includes("profile")) {
      return "ERRO_LOGIN_PERFIL";
    }
    if (mensagem.includes("navigate") || mensagem.includes("navega")) {
      return "ERRO_LOGIN_NAVEGACAO";
    }
  }

  return "ERRO_LOGIN_DESCONHECIDO";
}

function LoginPage() {
  const navigate = useNavigate();
  const { initialized, isAuthenticated, perfil } = useAuth();
  const buttonRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<AuthDiagnosticPhase>("loading_script");
  const [erro, setErro] = useState("");
  const [aEntrar, setAEntrar] = useState(false);
  const [origin, setOrigin] = useState("origem atual");
  const rawGoogleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const googleClientId = typeof rawGoogleClientId === "string" ? rawGoogleClientId.trim() : "";
  const googleClientIdStatus = getGoogleClientIdStatus(rawGoogleClientId);

  useEffect(() => {
    setOrigin(getCurrentOrigin());
  }, []);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      logAuthDiagnostic("UNEXPECTED_JAVASCRIPT_ERROR", {
        phase: phaseRef.current,
        errorName: event.error instanceof Error ? event.error.name : "ErrorEvent",
      });
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      logAuthDiagnostic("UNEXPECTED_JAVASCRIPT_ERROR", {
        phase: phaseRef.current,
        errorName: event.reason instanceof Error ? event.reason.name : "UnhandledRejection",
      });
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    console.info("[Tribuno Auth] Configuração Google", {
      status: googleClientIdStatus,
      loaded: googleClientIdStatus === "loaded",
    });
  }, [googleClientId.length, googleClientIdStatus, origin]);

  useEffect(() => {
    if (!initialized || !isAuthenticated) return;

    const onboardingNecessario = !perfilCompleto(perfil);
    const destino = onboardingNecessario ? "/completar-perfil" : "/";

    navigate({ to: destino, replace: true });
  }, [initialized, isAuthenticated, navigate, perfil]);

  useEffect(() => {
    if (googleClientIdStatus !== "loaded" || !buttonRef.current) return;

    let disposed = false;
    let activeAttemptId: string | undefined;
    let callbackReceived = false;
    let callbackTimeoutId: number | undefined;
    const buttonElement = buttonRef.current;

    function clearCallbackTimeout() {
      if (callbackTimeoutId !== undefined) window.clearTimeout(callbackTimeoutId);
      callbackTimeoutId = undefined;
    }

    function beginGoogleAttempt() {
      if (activeAttemptId && !callbackReceived) return activeAttemptId;

      activeAttemptId = createAuthAttemptId();
      callbackReceived = false;
      phaseRef.current = "waiting_google_callback";
      logAuthDiagnostic("GOOGLE_INTERACTION_INFERRED", {
        attemptId: activeAttemptId,
        phase: phaseRef.current,
        ...getSafeBrowserAuthContext(),
      });
      clearCallbackTimeout();
      callbackTimeoutId = window.setTimeout(() => {
        if (callbackReceived || disposed) return;
        logAuthDiagnostic("GOOGLE_CALLBACK_NOT_EXECUTED", {
          attemptId: activeAttemptId,
          phase: "waiting_google_callback",
          reason: "callback_timeout",
        });
        logAuthDiagnostic("SUPABASE_REQUEST_NOT_STARTED", {
          attemptId: activeAttemptId,
          phase: "waiting_google_callback",
          reason: "callback_timeout",
        });
        setErro(
          `${mensagensErroLogin.ERRO_LOGIN_GOOGLE_CALLBACK} Código: ERRO_LOGIN_GOOGLE_CALLBACK`,
        );
      }, GOOGLE_CALLBACK_TIMEOUT_MS);
      return activeAttemptId;
    }

    const handlePointerDown = () => beginGoogleAttempt();
    const handleWindowBlur = () => {
      window.setTimeout(() => {
        if (disposed || !buttonElement.contains(document.activeElement)) return;
        beginGoogleAttempt();
      }, 0);
    };

    buttonElement.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("blur", handleWindowBlur);

    function inicializarGoogle() {
      if (disposed) return;
      if (!window.google || !buttonRef.current) {
        logAuthDiagnostic("GIS_SCRIPT_FAILED", {
          phase: "loading_script",
          reason: "script_load_failed",
          ...getSafeBrowserAuthContext(),
        });
        logAuthDiagnostic("SUPABASE_REQUEST_NOT_STARTED", {
          phase: "loading_script",
          reason: "script_load_failed",
        });
        setErro("O login Google não ficou disponível. Recarregue a página e tente novamente.");
        return;
      }

      logAuthDiagnostic("GIS_SCRIPT_LOADED", {
        phase: "loading_script",
        ...getSafeBrowserAuthContext(),
      });
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        use_fedcm_for_button: true,
        button_auto_select: false,
        callback: async (response) => {
          const attemptId = activeAttemptId ?? createAuthAttemptId();
          activeAttemptId = attemptId;
          callbackReceived = true;
          clearCallbackTimeout();
          phaseRef.current = "processing_google_callback";
          logAuthDiagnostic("GOOGLE_CALLBACK_EXECUTED", {
            attemptId,
            phase: phaseRef.current,
          });

          let supabaseCallInvoked = false;
          try {
            setAEntrar(true);
            setErro("");

            if (!response.credential) {
              logAuthDiagnostic("GOOGLE_CREDENTIAL_MISSING", {
                attemptId,
                phase: phaseRef.current,
              });
              logAuthDiagnostic("SUPABASE_REQUEST_NOT_STARTED", {
                attemptId,
                phase: phaseRef.current,
                reason: "credential_missing",
              });
              throw new Error("A Google não devolveu credencial.");
            }

            logAuthDiagnostic("GOOGLE_CREDENTIAL_PRESENT", {
              attemptId,
              phase: phaseRef.current,
            });

            const googleUser = userFromCredential(response.credential);
            phaseRef.current = "calling_supabase";
            supabaseCallInvoked = true;
            const authState = await loginComGoogle(googleUser, response.credential, attemptId);
            phaseRef.current = "completed";

            const onboardingNecessario = !perfilCompleto(authState.perfil);
            const destino = onboardingNecessario ? "/completar-perfil" : "/";

            navigate({
              to: destino,
              replace: true,
            });
          } catch (error) {
            if (!supabaseCallInvoked && response.credential) {
              logAuthDiagnostic("SUPABASE_REQUEST_NOT_STARTED", {
                attemptId,
                phase: phaseRef.current,
                reason: "callback_processing_failed",
              });
            }
            const codigo = codigoLoginDoErro(error);
            if (codigo === "ERRO_LOGIN_DESCONHECIDO") {
              logAuthDiagnostic("UNEXPECTED_JAVASCRIPT_ERROR", {
                attemptId,
                phase: phaseRef.current,
                errorName: error instanceof Error ? error.name : "UnknownError",
              });
            }
            console.error("[Tribuno Auth] Erro no fluxo de login", {
              codigo,
              supabaseConfigurado: isSupabaseConfigured(),
            });

            setErro(`${mensagensErroLogin[codigo]} Código: ${codigo}`);
          } finally {
            setAEntrar(false);
          }
        },
      });

      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        shape: "pill",
        text: "continue_with",
        width: 320,
      });
      phaseRef.current = "button_ready";
      logAuthDiagnostic("GIS_BUTTON_INITIALIZED", {
        phase: phaseRef.current,
        ...getSafeBrowserAuthContext(),
      });
    }

    if (window.google) {
      inicializarGoogle();
    } else {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = inicializarGoogle;
      script.onerror = () => {
        if (disposed) return;
        logAuthDiagnostic("GIS_SCRIPT_FAILED", {
          phase: "loading_script",
          reason: "script_load_failed",
          ...getSafeBrowserAuthContext(),
        });
        logAuthDiagnostic("SUPABASE_REQUEST_NOT_STARTED", {
          phase: "loading_script",
          reason: "script_load_failed",
        });
        setErro(
          "Não foi possível carregar o login Google. Verifique a ligação à internet, bloqueadores do browser ou políticas de rede.",
        );
      };
      document.head.appendChild(script);
    }

    return () => {
      disposed = true;
      clearCallbackTimeout();
      buttonElement.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [googleClientId, googleClientIdStatus, navigate]);

  const googleClientIdError =
    googleClientIdStatus === "missing"
      ? "A variável VITE_GOOGLE_CLIENT_ID não foi encontrada pelo Vite. Confirme que o ficheiro .env está na raiz do projeto e reinicie o servidor de desenvolvimento."
      : "A variável VITE_GOOGLE_CLIENT_ID existe, mas está vazia. Verifique se .env.local está a sobrepor o valor ou se há espaços/aspas inválidas.";

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-md p-6 shadow-none">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-foreground text-background">
            <ShieldCheck className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground">
              Entrar no Tribuno
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Use a sua conta Google para aceder ao gabinete digital.
            </p>
          </div>
        </div>

        {googleClientIdStatus === "loaded" ? (
          <div className="space-y-4">
            <div ref={buttonRef} className="flex justify-center" />
            {aEntrar && (
              <p className="text-center text-sm text-muted-foreground">A carregar o perfil...</p>
            )}
            <p className="text-center text-xs leading-5 text-muted-foreground">
              Se a Google bloquear o acesso, confirme que a origem{" "}
              <span className="font-medium text-foreground">{origin}</span> está autorizada em
              Authorized JavaScript origins na Google Cloud Console.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-muted/25 p-4">
            <p className="text-sm leading-6 text-muted-foreground">{googleClientIdError}</p>
          </div>
        )}

        {erro && <p className="mt-4 text-sm text-destructive">{erro}</p>}
      </Card>
    </main>
  );
}
