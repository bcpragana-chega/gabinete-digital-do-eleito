import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PerguntaSugerida } from "@/lib/mock-preparacao";
import { PrioridadeBadge } from "./badges";

export function PerguntaCard({ item }: { item: PerguntaSugerida }) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-elevated">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="inline-flex items-center rounded-md bg-accent px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-accent-foreground">
          {item.tema}
        </span>
        <PrioridadeBadge nivel={item.prioridade} />
      </div>

      <p className="font-display text-[15px] leading-snug text-foreground">
        {item.pergunta}
      </p>

      {item.documentos.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {item.documentos.map((doc) => (
            <li
              key={doc}
              className="flex items-start gap-2 text-xs text-muted-foreground"
            >
              <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
              <span className="truncate">{doc}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex justify-end border-t border-border pt-3">
        <Button size="sm" variant="outline">
          Selecionar pergunta
        </Button>
      </div>
    </article>
  );
}
