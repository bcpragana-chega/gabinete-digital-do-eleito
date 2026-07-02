import { useState } from "react";
import { Plus } from "lucide-react";
import { adicionarDossie, type DossieInput } from "@/lib/dossies-store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DossieForm } from "@/components/dossies/DossieForm";

export function NovoDossieDialog() {
  const [open, setOpen] = useState(false);

  function guardar(values: DossieInput) {
    adicionarDossie(values);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Novo dossiê
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[calc(100vh-4rem)] max-w-2xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border/70 px-6 py-5">
          <DialogTitle>Novo Dossiê</DialogTitle>
        </DialogHeader>

        <DossieForm onSubmit={guardar} submitLabel="Guardar Dossiê" />
      </DialogContent>
    </Dialog>
  );
}
