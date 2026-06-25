import { cn } from "@/lib/utils";
import type {
  EstadoAcao,
  EstadoPrioridade,
  NivelPrioridade,
  TipoDocumento,
} from "@/lib/mock-preparacao";

const prioridadeStyles: Record<NivelPrioridade, string> = {
  Alta: "bg-status-preparacao/15 text-status-preparacao ring-1 ring-inset ring-status-preparacao/30",
  Média: "bg-status-analise/15 text-status-analise ring-1 ring-inset ring-status-analise/30",
  Baixa: "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
};

export function PrioridadeBadge({
  nivel,
  className,
}: {
  nivel: NivelPrioridade;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        prioridadeStyles[nivel],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {nivel}
    </span>
  );
}

const estadoPrioridadeStyles: Record<EstadoPrioridade, string> = {
  "Por preparar": "bg-muted text-muted-foreground",
  Preparado: "bg-status-concluida/15 text-status-concluida",
  Acompanhar: "bg-status-analise/15 text-status-analise",
};

export function EstadoPrioridadeBadge({ estado }: { estado: EstadoPrioridade }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider",
        estadoPrioridadeStyles[estado],
      )}
    >
      {estado}
    </span>
  );
}

const estadoAcaoStyles: Record<EstadoAcao, string> = {
  Pendente: "bg-muted text-muted-foreground",
  "Em curso": "bg-status-analise/15 text-status-analise",
  Concluída: "bg-status-concluida/15 text-status-concluida",
};

export function EstadoAcaoBadge({ estado }: { estado: EstadoAcao }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider",
        estadoAcaoStyles[estado],
      )}
    >
      {estado}
    </span>
  );
}

export function TipoDocumentoBadge({ tipo }: { tipo: TipoDocumento }) {
  return (
    <span className="inline-flex items-center rounded-md bg-accent px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-accent-foreground">
      {tipo}
    </span>
  );
}
