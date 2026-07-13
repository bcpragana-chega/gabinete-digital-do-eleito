import { useRef, useState } from "react";
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
  onGuardar: (valores: ValoresFormulario) => Promise<void> | void;
  onCancelar?: () => void;
  erroGuardar?: string;
};

export function AdicionarItemPreparacao({
  tituloBotao = "Adicionar",
  tituloFormulario,
  descricaoFormulario,
  textoGuardar,
  campos,
  valoresIniciais,
  onGuardar,
  onCancelar,
  erroGuardar,
}: Props) {
  const [aberto, setAberto] = useState(false);
  const [valores, setValores] = useState<ValoresFormulario>(valoresIniciais);
  const [aGuardar, setAGuardar] = useState(false);
  const guardarEmCurso = useRef(false);

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

  async function guardar() {
    if (!formularioValido() || guardarEmCurso.current) return;
    guardarEmCurso.current = true;
    setAGuardar(true);
    try {
      await onGuardar(valores);
      limparFormulario();
      setAberto(false);
    } catch {
      // O consumidor apresenta a mensagem específica e os valores permanecem intactos.
    } finally {
      guardarEmCurso.current = false;
      setAGuardar(false);
    }
  }

  if (!aberto) {
    return (
      <Button
        size="sm"
        variant="secondary"
        onClick={() => setAberto(true)}
        className="w-full sm:w-auto"
      >
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
        <p className="mt-1 text-xs text-muted-foreground">{descricaoFormulario}</p>
      </div>

      <div className="space-y-3">
        {campos.map((campo) => (
          <div key={campo.nome}>
            <label className="mb-1 block text-xs font-medium text-foreground">{campo.label}</label>

            {campo.tipo === "text" && (
              <input
                disabled={aGuardar}
                value={valores[campo.nome] ?? ""}
                onChange={(event) => atualizarCampo(campo.nome, event.target.value)}
                placeholder={campo.placeholder}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            )}

            {campo.tipo === "textarea" && (
              <textarea
                disabled={aGuardar}
                value={valores[campo.nome] ?? ""}
                onChange={(event) => atualizarCampo(campo.nome, event.target.value)}
                placeholder={campo.placeholder}
                rows={campo.rows ?? 4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            )}

            {campo.tipo === "select" && (
              <select
                disabled={aGuardar}
                value={valores[campo.nome] ?? ""}
                onChange={(event) => atualizarCampo(campo.nome, event.target.value)}
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

        {erroGuardar && (
          <p role="alert" className="text-sm text-destructive">
            {erroGuardar}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="secondary"
            disabled={aGuardar}
            onClick={() => {
              limparFormulario();
              onCancelar?.();
              setAberto(false);
            }}
          >
            Cancelar
          </Button>
          <Button type="button" disabled={aGuardar} onClick={() => void guardar()}>
            {aGuardar ? "A guardar…" : textoGuardar}
          </Button>
        </div>
      </div>
    </div>
  );
}
