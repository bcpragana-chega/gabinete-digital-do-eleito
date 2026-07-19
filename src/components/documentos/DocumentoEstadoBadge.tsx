import type { EstadoDocumento } from "@/lib/types";
import { labelEstadoDocumento } from "@/lib/ui-labels";
import { cn } from "@/lib/utils";

const styles: Record<EstadoDocumento, string> = {
  "Por rever": "bg-status-preparacao text-status-preparacao-foreground",
  Revisto: "bg-status-concluida text-status-concluida-foreground",
};

export function DocumentoEstadoBadge({
  estado,
  className,
}: {
  estado: EstadoDocumento;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
        styles[estado],
        className,
      )}
    >
      <span className="h-1 w-1 rounded-full bg-current opacity-70" />
      {labelEstadoDocumento(estado)}
    </span>
  );
}
