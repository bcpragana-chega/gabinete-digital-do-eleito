import { useState } from "react";
import { Plus } from "lucide-react";
import { adicionarAssembleia } from "@/lib/assembleias-store";
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

export function NovaAssembleiaDialog() {
  const [open, setOpen] = useState(false);

  function guardar(values: AssembleiaFormValues) {
    adicionarAssembleia(values);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Nova Assembleia
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[calc(100vh-4rem)] gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border/70 px-6 py-5">
          <DialogTitle>Nova Assembleia</DialogTitle>
        </DialogHeader>

        <AssembleiaForm onSubmit={guardar} submitLabel="Guardar Assembleia" />
      </DialogContent>
    </Dialog>
  );
}
