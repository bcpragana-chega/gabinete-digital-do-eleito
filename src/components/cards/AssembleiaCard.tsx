import { Link } from "@tanstack/react-router";
import { Calendar, MapPin, FileText, ChevronRight } from "lucide-react";
import type { Assembleia } from "@/lib/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatarData, getDocumentosByAssembleia } from "@/lib/mock-data";

export function AssembleiaCard({ assembleia }: { assembleia: Assembleia }) {
  const numDocs = getDocumentosByAssembleia(assembleia.id).length;

  return (
    <Link
      to="/assembleias/$id"
      params={{ id: assembleia.id }}
      className="group block rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:shadow-elevated hover:border-foreground/15"
    >
      <div className="flex items-start justify-between gap-4">
        <StatusBadge estado={assembleia.estado} />
        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>

      <h3 className="mt-4 font-display text-base font-semibold leading-snug text-foreground line-clamp-2">
        {assembleia.nome}
      </h3>

      <dl className="mt-4 space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span>
            {formatarData(assembleia.data)} · {assembleia.hora}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span className="truncate">{assembleia.local}</span>
        </div>
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span>{numDocs} documentos</span>
        </div>
      </dl>
    </Link>
  );
}
