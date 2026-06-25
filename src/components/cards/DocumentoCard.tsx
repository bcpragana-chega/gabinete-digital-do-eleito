import { Link } from "@tanstack/react-router";
import { FileText, ChevronRight } from "lucide-react";
import type { Documento } from "@/lib/types";
import { formatarDataCurta } from "@/lib/mock-data";

export function DocumentoCard({ documento }: { documento: Documento }) {
  return (
    <Link
      to="/assembleias/$id/documentos/$docId"
      params={{ id: documento.assembleiaId, docId: documento.id }}
      className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card transition-all hover:shadow-elevated hover:border-foreground/15"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        <FileText className="h-4 w-4" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {documento.tipo}
        </div>
        <div className="mt-0.5 font-medium text-foreground truncate">{documento.nome}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {formatarDataCurta(documento.data)} · {documento.paginas} páginas
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
