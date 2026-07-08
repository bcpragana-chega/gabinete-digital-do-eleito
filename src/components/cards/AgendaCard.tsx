import { Link } from "@tanstack/react-router";
import { Calendar, Clock, MapPin, ChevronRight } from "lucide-react";
import type { Assembleia } from "@/lib/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatarData } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type AgendaCardProps = {
  assembleia: Assembleia;
  className?: string;
};

export function AgendaCard({ assembleia, className }: AgendaCardProps) {
  return (
    <Link
      to="/sessoes/$id"
      params={{ id: assembleia.id }}
      className={cn(
        "group block rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:shadow-elevated hover:border-foreground/15",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <StatusBadge estado={assembleia.estado} />
          <span className="text-sm text-muted-foreground">{formatarData(assembleia.data)}</span>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>

      <h3 className="mt-4 font-display text-base font-semibold leading-snug text-foreground line-clamp-2">
        {assembleia.nome}
      </h3>

      <p className="mt-2 text-sm text-muted-foreground">{assembleia.local}</p>

      <div className="mt-4 space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span>{formatarData(assembleia.data)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span>{assembleia.hora}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span className="truncate">{assembleia.local}</span>
        </div>
      </div>
    </Link>
  );
}
