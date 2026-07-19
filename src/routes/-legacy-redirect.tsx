import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { construirDestinoLegado } from "./-legacy-redirect-path";

type LegacyRedirectProps = {
  to: string;
  params?: Record<string, string>;
};

export function LegacyRedirect({ to, params }: LegacyRedirectProps) {
  const router = useRouter();

  useEffect(() => {
    const queryEHash = `${window.location.search}${window.location.hash}`;
    router.history.replace(construirDestinoLegado(to, params, queryEHash));
  }, [params, router.history, to]);

  return null;
}
