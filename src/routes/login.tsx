import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { loginComGoogle, perfilCompleto, useAuth, type AuthUser } from "@/lib/auth-store";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
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
    email?: string;
    picture?: string;
  };
}

function userFromCredential(credential: string): AuthUser {
  const payload = decodeJwtPayload(credential);

  return {
    id: payload.sub,
    nome: payload.name || payload.email || "Utilizador",
    email: payload.email || "",
    avatarUrl: payload.picture,
    provider: "google",
  };
}

type GoogleClientIdStatus = "missing" | "empty" | "loaded";

function getGoogleClientIdStatus(rawClientId: unknown): GoogleClientIdStatus {
  if (rawClientId === undefined) return "missing";
  if (typeof rawClientId !== "string" || rawClientId.trim().length === 0) return "empty";
  return "loaded";
}

function getCurrentOrigin() {
  if (typeof window === "undefined") return "origem indisponível";
  return window.location.origin;
}

function LoginPage() {
  const navigate = useNavigate();
  const { initialized, isAuthenticated, perfil } = useAuth();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [erro, setErro] = useState("");
  const [origin, setOrigin] = useState("origem atual");
  const rawGoogleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const googleClientId = typeof rawGoogleClientId === "string" ? rawGoogleClientId.trim() : "";
  const googleClientIdStatus = getGoogleClientIdStatus(rawGoogleClientId);

  useEffect(() => {
    setOrigin(getCurrentOrigin());
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    console.log("VITE_GOOGLE_CLIENT_ID:", import.meta.env.VITE_GOOGLE_CLIENT_ID);
    console.log("[Tribuno auth] VITE_GOOGLE_CLIENT_ID", {
      status: googleClientIdStatus,
      loaded: googleClientIdStatus === "loaded",
      length: googleClientId.length,
      origin,
    });
  }, [googleClientId.length, googleClientIdStatus, origin]);

  useEffect(() => {
    if (!initialized || !isAuthenticated) return;

    navigate({ to: perfilCompleto(perfil) ? "/" : "/completar-perfil", replace: true });
  }, [initialized, isAuthenticated, navigate, perfil]);

  useEffect(() => {
    if (googleClientIdStatus !== "loaded" || !buttonRef.current) return;

    function inicializarGoogle() {
      if (!window.google || !buttonRef.current) {
        setErro("O login Google não ficou disponível. Recarregue a página e tente novamente.");
        return;
      }

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response) => {
          try {
            if (!response.credential) throw new Error("A Google não devolveu credencial.");
            const authState = loginComGoogle(userFromCredential(response.credential));
            navigate({
              to: perfilCompleto(authState.perfil) ? "/" : "/completar-perfil",
              replace: true,
            });
          } catch (error) {
            setErro(error instanceof Error ? error.message : "Não foi possível iniciar sessão.");
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
    }

    if (window.google) {
      inicializarGoogle();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = inicializarGoogle;
    script.onerror = () =>
      setErro(
        "Não foi possível carregar o login Google. Verifique a ligação à internet, bloqueadores do browser ou políticas de rede.",
      );
    document.head.appendChild(script);
  }, [googleClientId, googleClientIdStatus, navigate]);

  function entrarModoLocal() {
    const authState = loginComGoogle({
      id: "local-dev-user",
      nome: "Utilizador",
      email: "utilizador@tribuno.local",
      provider: "local-dev",
    });
    navigate({
      to: perfilCompleto(authState.perfil) ? "/" : "/completar-perfil",
      replace: true,
    });
  }

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
            <p className="text-center text-xs leading-5 text-muted-foreground">
              Se a Google bloquear o acesso, confirme que a origem{" "}
              <span className="font-medium text-foreground">{origin}</span> está autorizada em
              Authorized JavaScript origins na Google Cloud Console.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-muted/25 p-4">
            <p className="text-sm leading-6 text-muted-foreground">
              {googleClientIdError} Em desenvolvimento, pode entrar em modo local.
            </p>
            <Button type="button" className="mt-4 w-full" onClick={entrarModoLocal}>
              Entrar em modo local
            </Button>
          </div>
        )}

        {erro && <p className="mt-4 text-sm text-destructive">{erro}</p>}
      </Card>
    </main>
  );
}
