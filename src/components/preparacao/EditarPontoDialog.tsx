import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { atualizarPontoConfirmado, type PontoOrdemTrabalhos } from "@/lib/pontos-store";

export function EditarPontoDialog({
  ponto,
  onUpdated,
}: {
  ponto: PontoOrdemTrabalhos;
  onUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState(ponto.titulo);
  const [descricao, setDescricao] = useState(ponto.descricao);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function guardar() {
    if (!titulo.trim()) return;
    setSaving(true);
    setError("");
    try {
      await atualizarPontoConfirmado(ponto.id, {
        titulo: titulo.trim(),
        descricao: descricao.trim(),
      });
      onUpdated();
      setOpen(false);
    } catch {
      setError("Não foi possível guardar o ponto no Supabase.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="ghost">
          <Pencil className="h-4 w-4" /> Editar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar ponto</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Título</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Descrição</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={5} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="button" disabled={saving || !titulo.trim()} onClick={guardar}>
            {saving ? "A guardar…" : "Guardar alterações"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
