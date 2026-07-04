import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function SecaoPreparacao({
  icon: Icon,
  titulo,
  descricao,
  total,
  action,
  children,
}: {
  icon: LucideIcon;
  titulo: string;
  descricao: string;
  total: number;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mb-10">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Icon className="h-4 w-4" strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
              {titulo}
            </h2>
            <p className="text-xs text-muted-foreground">{descricao}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {total} {total === 1 ? "item" : "itens"}
          </span>
          {action}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  );
}
