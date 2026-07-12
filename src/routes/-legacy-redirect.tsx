import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

type LegacyRedirectProps = {
  to: string;
  params?: Record<string, string>;
};

export function LegacyRedirect({ to, params }: LegacyRedirectProps) {
  const router = useRouter();

  useEffect(() => {
    const destino = Object.entries(params ?? {}).reduce(
      (path, [param, value]) => path.replace(`$${param}`, encodeURIComponent(value)),
      to,
    );
    router.history.replace(destino);
  }, [params, router.history, to]);

  return null;
}
