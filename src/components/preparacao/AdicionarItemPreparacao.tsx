import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export type CampoPreparacao =
  | {
      tipo: "text";
      nome: string;
      label: string;
      placeholder?: string;
      obrigatorio?: boolean;
    }
  | {
      tipo: "textarea";
      nome: string;
      label: string;
      placeholder?: string;
      obrigatorio?: boolean;
      rows?: number;
    }
  | {
      tipo: "select";
      nome: string;
      label: string;
      opcoes: string[];
      obrigatorio?: boolean;
    };

type ValoresFormulario = Record<string, string>;

type Props = {
  tituloBotao?: string;
  tituloFormulario: string;
  descricaoFormulario: string;
  textoGuardar: string;
  campos: CampoPreparacao[];
  valoresIniciais: ValoresFormulario;
  onGuardar: (valores: ValoresFormulario) => void;
};

export function AdicionarItemPreparacao({
  tituloBotao = "Adicionar",
  tituloFormulario,
  descricaoFormulario,
  textoGuardar,
  campos,
  valoresIniciais,
  onGuardar,
}: Props) {
  const [aberto, setAberto] = useState(false);
  const [valores, setValores] = useState<ValoresFormulario>(valoresIniciais);

  function atualizarCampo(nome: string, valor: string) {
    setValores((atuais) => ({
      ...atuais,
      [nome]: valor,
    }));
  }

  function limparFormulario() {
    setValores(valoresIniciais);
  }

  function formularioValido() {
    return campos.every((campo) => {
      if (!campo.obrigatorio) return true;
      return valores[campo.nome]?.trim().length > 0;
    });
  }

  function guardar() {
    if (!formularioValido()) return;

    onGuardar(valores);
    limparFormulario();
    setAberto(false);
  }

  if (!aberto) {
    return (
      <Button size="sm" variant="outline" onClick={() => setAberto(true)}>
        <Plus className="mr-2 h-4 w-4" />
        {tituloBotao}
      </Button>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="mb-4">
        <h3 className="font-display text-base font-semibold tracking-tight text-foreground">
          {tituloFormulario}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {descricaoFormulario}
        </p>
      </div>

      <div className="space-y-3">
        {campos.map((campo) => (
          <div key={campo.nome}>
            <label className="mb-1 block text-xs font-medium text-foreground">
              {campo.label}
            </label>

            {campo.tipo === "text" && (
              <input
                value={valores[campo.nome] ?? ""}
                onChange={(event) =>
                  atualizarCampo(campo.nome, event.target.value)
                }
                placeholder={campo.placeholder}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            )}

            {campo.tipo === "textarea" && (
              <textarea
                value={valores[campo.nome] ?? ""}
                onChange={(event) =>
                  atualizarCampo(campo.nome, event.target.value)
                }
                placeholder={campo.placeholder}
                rows={campo.rows ?? 4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            )}

            {campo.tipo === "select" && (
              <select
                value={valores[campo.nome] ?? ""}
                onChange={(event) =>
                  atualizarCampo(campo.nome, event.target.value)
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              >
                {campo.opcoes.map((opcao) => (
                  <option key={opcao} value={opcao}>
                    {opcao}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              limparFormulario();
              setAberto(false);
            }}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={guardar}>
            {textoGuardar}
          </Button>
        </div>
      </div>
    </div>
  );
}