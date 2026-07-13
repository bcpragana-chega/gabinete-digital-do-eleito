import { useRef, useState } from "react";
import { Pencil } from "lucide-react";
import type { Dossie } from "@/lib/types";
import { editarDossie, type DossieInput } from "@/lib/dossies-store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DossieForm } from "@/components/dossies/DossieForm";

type EditarDossieDialogProps = {
  dossie: Dossie;
  compact?: boolean;
  triggerLabel?: string;
};

export function EditarDossieDialog({
  dossie,
  compact = false,
  triggerLabel = "Editar",
}: EditarDossieDialogProps) {
  const [open, setOpen] = useState(false);
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState("");
  const guardarEmCurso = useRef(false);

  async function guardar(values: DossieInput) {
    if (guardarEmCurso.current) return;
    guardarEmCurso.current = true;
    setAGuardar(true);
    setErro("");
    try {
      await editarDossie(dossie.id, values);
      setOpen(false);
    } catch {
      setErro("Não foi possível guardar o assunto. Os dados introduzidos foram mantidos.");
    } finally {
      guardarEmCurso.current = false;
      setAGuardar(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !aGuardar && setOpen(value)}>
      <DialogTrigger asChild>
        <Button
          variant={compact ? "ghost" : "secondary"}
          size="sm"
          className={compact ? "px-2.5" : "w-full sm:w-auto"}
        >
          <Pencil className={compact ? "h-4 w-4" : "mr-2 h-4 w-4"} />
          <span className={compact ? "sr-only" : undefined}>{triggerLabel}</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[calc(100vh-4rem)] max-w-2xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border/70 px-6 py-5">
          <DialogTitle>Editar assunto</DialogTitle>
        </DialogHeader>

        <DossieForm
          initialValues={dossie}
          onSubmit={guardar}
          submitLabel="Guardar alterações"
          submitting={aGuardar}
          error={erro}
        />
      </DialogContent>
    </Dialog>
  );
}
