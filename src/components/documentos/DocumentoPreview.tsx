import { FileText } from "lucide-react";

export function DocumentoPreview({
  ficheiroNome,
}: {
  ficheiroNome?: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-background/50 px-5 py-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        <FileText className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <p className="mt-3 text-sm font-medium text-foreground">
        {ficheiroNome ?? "Sem ficheiro associado"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground italic">
        Pré-visualização disponível em fase futura
      </p>
    </div>
  );
}
