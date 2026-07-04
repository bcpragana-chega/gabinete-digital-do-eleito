import { FileText } from "lucide-react";
import type { PrioridadeAssembleia } from "@/lib/preparacao-store";
import { EstadoPrioridadeBadge, PrioridadeBadge } from "./badges";

export function PrioridadeCard({ item }: { item: PrioridadeAssembleia }) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-elevated">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="font-display text-base font-semibold leading-snug tracking-tight text-foreground">
          {item.titulo}
        </h3>
        <PrioridadeBadge nivel={item.prioridade} />
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{item.descricao}</p>

      {item.documentos.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {item.documentos.map((doc) => (
            <li key={doc} className="flex items-start gap-2 text-xs text-muted-foreground">
              <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
              <span className="truncate">{doc}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex items-center justify-between border-t border-border pt-3">
        <EstadoPrioridadeBadge estado={item.estado} />
      </div>
    </article>
  );
}
