import { useState } from "react";
import { Pencil } from "lucide-react";
import { editarAssembleia } from "@/lib/assembleias-store";
import type { Assembleia } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AssembleiaForm,
  type AssembleiaFormValues,
} from "@/components/assembleias/AssembleiaForm";

type EditarAssembleiaDialogProps = {
  assembleia: Assembleia;
};

export function EditarAssembleiaDialog({ assembleia }: EditarAssembleiaDialogProps) {
  const [open, setOpen] = useState(false);

  function guardar(values: AssembleiaFormValues) {
    editarAssembleia(assembleia.id, values);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="w-full sm:w-auto">
          <Pencil className="mr-2 h-4 w-4" />
          Editar Assembleia
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[calc(100vh-4rem)] gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border/70 px-6 py-5">
          <DialogTitle>Editar Assembleia</DialogTitle>
        </DialogHeader>

        <AssembleiaForm
          initialValues={assembleia}
          onSubmit={guardar}
          submitLabel="Guardar alterações"
        />
      </DialogContent>
    </Dialog>
  );
}
