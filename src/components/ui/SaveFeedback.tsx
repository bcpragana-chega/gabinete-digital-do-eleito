import { cn } from "@/lib/utils";

export type SaveFeedbackState = "saving" | "saved" | "error" | "unsaved";

export function SaveFeedback({
  state,
  className,
}: {
  state: SaveFeedbackState;
  className?: string;
}) {
  const label =
    state === "saving"
      ? "A guardar..."
      : state === "saved"
        ? "Guardado"
        : state === "error"
          ? "Erro ao guardar"
          : "Alterações por guardar";

  return (
    <span
      className={cn(
        "text-xs",
        state === "saved" && "text-muted-foreground",
        state === "saving" && "text-muted-foreground",
        state === "unsaved" && "text-foreground/80",
        state === "error" && "text-destructive",
        className,
      )}
      role={state === "error" ? "alert" : undefined}
    >
      {label}
    </span>
  );
}
