import { Button } from "@/components/ui/button";
import type { DocumentoACriar } from "@/lib/mock-preparacao";
import { PrioridadeBadge, TipoDocumentoBadge } from "./badges";

export function DocumentoACriarCard({ item }: { item: DocumentoACriar }) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-elevated">
      <div className="mb-3 flex items-center justify-between gap-3">
        <TipoDocumentoBadge tipo={item.tipo} />
        <PrioridadeBadge nivel={item.prioridade} />
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">{item.motivo}</p>

      <div className="mt-5 flex justify-end border-t border-border pt-3">
        <Button size="sm" variant="outline" disabled>
          Criar futuramente
        </Button>
      </div>
    </article>
  );
}
