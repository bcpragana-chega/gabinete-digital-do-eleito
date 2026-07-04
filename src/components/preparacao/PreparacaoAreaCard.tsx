import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  icon: LucideIcon;
  titulo: string;
  descricao: string;
  to?: string;
  params?: Record<string, string>;
  children?: ReactNode;
  disabled?: boolean;
  badge?: string;
};

export function PreparacaoAreaCard({
  icon: Icon,
  titulo,
  descricao,
  to,
  params,
  children,
  disabled = false,
  badge,
}: Props) {
  const content = (
    <section
      className={
        disabled
          ? "rounded-2xl border border-dashed border-border bg-card p-6 shadow-card opacity-80"
          : "group cursor-pointer rounded-2xl border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
      }
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>

        {badge ? (
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {badge}
          </span>
        ) : (
          <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
        )}
      </div>

      <h2 className="mt-5 font-display text-xl font-semibold tracking-tight text-foreground">
        {titulo}
      </h2>

      <p className="mt-2 text-sm text-muted-foreground">{descricao}</p>

      {children && <div className="mt-5">{children}</div>}
    </section>
  );

  if (disabled || !to) {
    return content;
  }

  return (
    <Link to={to as never} params={params as never} className="block">
      {content}
    </Link>
  );
}
