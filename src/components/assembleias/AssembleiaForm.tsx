import { useState } from "react";
import type { Assembleia, EstadoAssembleia } from "@/lib/types";
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

export type AssembleiaFormValues = {
  nome: string;
  data: string;
  hora: string;
  local: string;
  estado: EstadoAssembleia;
};

type AssembleiaFormProps = {
  initialValues?: Assembleia;
  submitLabel?: string;
  onSubmit: (values: AssembleiaFormValues) => void;
};

export function AssembleiaForm({
  initialValues,
  submitLabel = "Guardar Assembleia",
  onSubmit,
}: AssembleiaFormProps) {
  const [nome, setNome] = useState(initialValues?.nome ?? "");
  const [data, setData] = useState(initialValues?.data ?? "");
  const [hora, setHora] = useState(initialValues?.hora ?? "");
  const [local, setLocal] = useState(initialValues?.local ?? "");
  const [estado, setEstado] = useState<EstadoAssembleia>(
    initialValues?.estado ?? "preparacao",
  );

  const formularioValido = Boolean(nome.trim() && data && hora && local.trim());

  function guardar() {
    if (!formularioValido) return;

    onSubmit({
      nome: nome.trim(),
      data,
      hora,
      local: local.trim(),
      estado,
    });
  }

  return (
    <div className="grid gap-4 py-2">
      <div className="grid gap-2">
        <Label htmlFor="nome">Título</Label>
        <Input
          id="nome"
          value={nome}
          onChange={(event) => setNome(event.target.value)}
          placeholder="Ex.: Assembleia de Freguesia Ordinária — Setembro"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="data">Data</Label>
        <Input
          id="data"
          type="date"
          value={data}
          onChange={(event) => setData(event.target.value)}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="hora">Hora</Label>
        <Input
          id="hora"
          type="time"
          value={hora}
          onChange={(event) => setHora(event.target.value)}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="local">Local</Label>
        <Input
          id="local"
          value={local}
          onChange={(event) => setLocal(event.target.value)}
          placeholder="Ex.: Centro Cultural D. Dinis"
        />
      </div>

      <div className="grid gap-2">
        <Label>Estado</Label>
        <Select value={estado} onValueChange={(value) => setEstado(value as EstadoAssembleia)}>
          <SelectTrigger>
            <SelectValue placeholder="Selecionar estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="preparacao">Preparação</SelectItem>
            <SelectItem value="analise">Em análise</SelectItem>
            <SelectItem value="concluida">Concluída</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button onClick={guardar} disabled={!formularioValido}>
        {submitLabel}
      </Button>
    </div>
  );
}