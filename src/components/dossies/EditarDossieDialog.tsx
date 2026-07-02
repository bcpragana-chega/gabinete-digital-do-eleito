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
};

export function EditarDossieDialog({ dossie }: EditarDossieDialogProps) {
  const [open, setOpen] = useState(false);

  function guardar(values: DossieInput) {
    editarDossie(dossie.id, values);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="mr-2 h-4 w-4" />
          Editar
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Dossiê</DialogTitle>
        </DialogHeader>

        <DossieForm initialValues={dossie} onSubmit={guardar} submitLabel="Guardar alterações" />
      </DialogContent>
    </Dialog>
  );
}
