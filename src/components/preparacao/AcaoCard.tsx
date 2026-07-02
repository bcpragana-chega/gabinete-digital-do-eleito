import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AcaoPendente } from "@/lib/mock-preparacao";
import { EstadoAcaoBadge } from "./badges";

export function AcaoCard({ item }: { item: AcaoPendente }) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-elevated">
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="text-sm font-medium leading-snug text-foreground">{item.tarefa}</p>
        <EstadoAcaoBadge estado={item.estado} />
      </div>

      {item.prazo && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span>Prazo: {item.prazo}</span>
        </div>
      )}

      <div className="mt-5 flex justify-end border-t border-border pt-3">
        <Button size="sm" variant="secondary">
          Marcar
        </Button>
      </div>
    </article>
  );
}
