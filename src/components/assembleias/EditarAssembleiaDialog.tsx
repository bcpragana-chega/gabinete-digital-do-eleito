import { useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { editarAssembleiaConfirmada } from "@/lib/assembleias-store";
import type { Assembleia } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AssembleiaForm, type AssembleiaFormValues } from "@/components/assembleias/AssembleiaForm";

type EditarAssembleiaDialogProps = {
  assembleia: Assembleia;
};

export function EditarAssembleiaDialog({ assembleia }: EditarAssembleiaDialogProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  async function guardar(values: AssembleiaFormValues) {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError("");
    try {
      await editarAssembleiaConfirmada(assembleia.id, values);
      setOpen(false);
    } catch {
      setError("Não foi possível guardar a sessão. Tenta novamente.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !saving && setOpen(value)}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="w-full sm:w-auto">
          <Pencil className="mr-2 h-4 w-4" />
          Editar sessão
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[calc(100vh-4rem)] gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border/70 px-6 py-5">
          <DialogTitle>Editar sessão</DialogTitle>
        </DialogHeader>

        <AssembleiaForm
          initialValues={assembleia}
          onSubmit={guardar}
          submitLabel="Guardar alterações"
          submitting={saving}
        />
        {error && <p className="px-6 pb-4 text-sm text-destructive">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
