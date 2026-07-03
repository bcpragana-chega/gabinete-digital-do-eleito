import { useState } from "react";
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
};

export function EditarDossieDialog({ dossie, compact = false }: EditarDossieDialogProps) {
  const [open, setOpen] = useState(false);

  function guardar(values: DossieInput) {
    editarDossie(dossie.id, values);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={compact ? "ghost" : "secondary"}
          size="sm"
          className={compact ? "px-2.5" : "w-full sm:w-auto"}
        >
          <Pencil className={compact ? "h-4 w-4" : "mr-2 h-4 w-4"} />
          <span className={compact ? "sr-only" : undefined}>Editar</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[calc(100vh-4rem)] max-w-2xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border/70 px-6 py-5">
          <DialogTitle>Editar assunto</DialogTitle>
        </DialogHeader>

        <DossieForm initialValues={dossie} onSubmit={guardar} submitLabel="Guardar alterações" />
      </DialogContent>
    </Dialog>
  );
}
