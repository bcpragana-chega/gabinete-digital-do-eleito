import { useState } from "react";
import type { Dossie, EstadoDossie, PrioridadeDossie } from "@/lib/types";
import type { DossieInput } from "@/lib/dossies-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type DossieFormProps = {
  initialValues?: Dossie;
  submitLabel?: string;
  onSubmit: (values: DossieInput) => void;
};

const estados: Array<{ value: EstadoDossie; label: string }> = [
  { value: "ativo", label: "Ativo" },
  { value: "em acompanhamento", label: "Em acompanhamento" },
  { value: "concluido", label: "Concluído" },
];

const prioridades: PrioridadeDossie[] = ["Baixa", "Média", "Alta", "Crítica"];

function parseTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function DossieForm({
  initialValues,
  submitLabel = "Guardar Dossiê",
  onSubmit,
}: DossieFormProps) {
  const [titulo, setTitulo] = useState(initialValues?.titulo ?? "");
  const [estado, setEstado] = useState<EstadoDossie>(initialValues?.estado ?? "ativo");
  const [prioridade, setPrioridade] = useState<PrioridadeDossie>(
    initialValues?.prioridade ?? "Média",
  );
  const [objetivoPolitico, setObjetivoPolitico] = useState(initialValues?.objetivoPolitico ?? "");
  const [resumo, setResumo] = useState(initialValues?.resumo ?? "");
  const [tags, setTags] = useState(initialValues?.tags.join(", ") ?? "");

  const formularioValido = Boolean(titulo.trim());

  function guardar() {
    if (!formularioValido) return;

    onSubmit({
      titulo: titulo.trim(),
      estado,
      prioridade,
      objetivoPolitico: objetivoPolitico.trim(),
      resumo: resumo.trim(),
      tags: parseTags(tags),
    });
  }

  return (
    <div className="flex min-h-0 flex-col">
      <div className="grid max-h-[calc(100dvh-11.5rem)] gap-4 overflow-y-auto px-4 py-4 sm:max-h-[calc(100vh-13rem)] sm:px-6 sm:py-5">
        <div className="grid gap-2">
        <Label htmlFor="dossie-titulo">Título</Label>
        <Input
          id="dossie-titulo"
          value={titulo}
          onChange={(event) => setTitulo(event.target.value)}
          placeholder="Ex.: Habitação"
        />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
          <Label>Estado</Label>
          <Select value={estado} onValueChange={(value) => setEstado(value as EstadoDossie)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecionar estado" />
            </SelectTrigger>
            <SelectContent>
              {estados.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          </div>

          <div className="grid gap-2">
          <Label>Prioridade</Label>
          <Select
            value={prioridade}
            onValueChange={(value) => setPrioridade(value as PrioridadeDossie)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecionar prioridade" />
            </SelectTrigger>
            <SelectContent>
              {prioridades.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          </div>
        </div>

        <div className="grid gap-2">
        <Label htmlFor="dossie-objetivo">Objetivo político</Label>
        <Textarea
          id="dossie-objetivo"
          value={objetivoPolitico}
          onChange={(event) => setObjetivoPolitico(event.target.value)}
          placeholder="Qual é o objetivo político deste Dossiê?"
          rows={4}
        />
        </div>

        <div className="grid gap-2">
        <Label htmlFor="dossie-resumo">Resumo</Label>
        <Textarea
          id="dossie-resumo"
          value={resumo}
          onChange={(event) => setResumo(event.target.value)}
          placeholder="Resumo curto do tema, problema ou acompanhamento."
          rows={5}
        />
        </div>

        <div className="grid gap-2">
        <Label htmlFor="dossie-tags">Tags</Label>
        <Input
          id="dossie-tags"
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          placeholder="habitação, orçamento, freguesia"
        />
        <p className="text-xs text-muted-foreground">Separar tags por vírgulas.</p>
        </div>
      </div>

      <div className="shrink-0 border-t border-border/70 bg-background px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex justify-end">
          <Button type="button" onClick={guardar} disabled={!formularioValido} className="w-full sm:w-auto">
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
