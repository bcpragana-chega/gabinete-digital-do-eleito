import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

type LegacyRedirectProps = {
  to: string;
  params?: Record<string, string>;
};

export function LegacyRedirect({ to, params }: LegacyRedirectProps) {
  const navigate = useNavigate();

  useEffect(() => {
    navigate({ to, params, replace: true } as never);
  }, [navigate, params, to]);

  return null;
}
