import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { DocumentoForm } from "./DocumentoForm";

export function AdicionarDocumentoSheet({ assembleiaId }: { assembleiaId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="sm"
          className="w-full gap-1.5 sm:w-auto"
          onClick={() => {
            console.info("[DOCUMENTOS DIAG] PASSO 1 botão Adicionar Documento foi clicado", {
              origem: "AdicionarDocumentoSheet",
              assembleiaId,
            });
          }}
        >
          <Plus className="h-4 w-4" />
          Adicionar documento
        </Button>
      </SheetTrigger>
      <SheetContent className="flex h-full w-full flex-col overflow-hidden p-0 sm:max-w-md">
        <SheetHeader className="shrink-0 border-b border-border/70 px-6 py-5">
          <SheetTitle>Adicionar documento</SheetTitle>
          <SheetDescription>
            Associe um documento a esta assembleia. Apenas metadados são guardados.
          </SheetDescription>
        </SheetHeader>
        <DocumentoForm
          assembleiaId={assembleiaId}
          onSaved={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
