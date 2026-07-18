import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Plus } from "lucide-react";
import { associarAssembleiaAoDossie } from "@/lib/dossie-assembleias-store";
import { adicionarDossie } from "@/lib/dossies-store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function NovoAssuntoWizard({ assembleiaId }: { assembleiaId?: string } = {}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [resumo, setResumo] = useState("");
  const [objetivoPolitico, setObjetivoPolitico] = useState("");
  const [aGuardar, setAGuardar] = useState(false);
  const [erroGuardar, setErroGuardar] = useState("");
  const guardarEmCurso = useRef(false);
  const tentativaId = useRef<string | undefined>(undefined);

  const dadosValidos = titulo.trim().length > 0;

  function reset() {
    setTitulo("");
    setResumo("");
    setObjetivoPolitico("");
    setErroGuardar("");
    tentativaId.current = undefined;
  }

  async function criarAssunto() {
    if (!dadosValidos || guardarEmCurso.current) return;
    guardarEmCurso.current = true;
    setAGuardar(true);
    setErroGuardar("");
    try {
      tentativaId.current ??= `dossie-${crypto.randomUUID()}`;
      const assunto = await adicionarDossie(
        {
          titulo: titulo.trim(),
          estado: "ativo",
          prioridade: "Média",
          objetivoPolitico: objetivoPolitico.trim(),
          resumo: resumo.trim(),
          tags: ["outro"],
        },
        { id: tentativaId.current },
      );

      if (assembleiaId) await associarAssembleiaAoDossie(assunto.id, assembleiaId);
      setOpen(false);
      reset();
      await navigate({ to: "/assuntos/$dossieId", params: { dossieId: assunto.id } });
    } catch {
      setErroGuardar("Não foi possível guardar o assunto. Os dados introduzidos foram mantidos.");
    } finally {
      guardarEmCurso.current = false;
      setAGuardar(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value && aGuardar) return;
        setOpen(value);
        if (!value && !aGuardar) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Novo assunto
        </Button>
      </DialogTrigger>

      <DialogContent className="flex max-h-[100dvh] w-full max-w-none flex-col gap-0 rounded-none border-border bg-background p-0 sm:max-h-[88dvh] sm:w-[min(680px,calc(100vw-2rem))] sm:rounded-3xl">
        <DialogHeader className="shrink-0 border-b border-border/70 px-5 py-4 text-left sm:px-7">
          <DialogTitle>Novo assunto</DialogTitle>
          <DialogDescription>Registe o tema e indique o que pretende alcançar.</DialogDescription>
        </DialogHeader>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            void criarAssunto();
          }}
        >
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
            <div className="space-y-2">
              <Label htmlFor="novo-assunto-tema">Qual é o tema?</Label>
              <Input
                id="novo-assunto-tema"
                value={titulo}
                onChange={(event) => setTitulo(event.target.value)}
                placeholder="Ex.: Habitação acessível"
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="novo-assunto-resumo">O que está em causa?</Label>
              <Textarea
                id="novo-assunto-resumo"
                value={resumo}
                onChange={(event) => setResumo(event.target.value)}
                rows={4}
                placeholder="Explique em poucas frases o contexto deste tema."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="novo-assunto-objetivo">O que pretende alcançar?</Label>
              <Textarea
                id="novo-assunto-objetivo"
                value={objetivoPolitico}
                onChange={(event) => setObjetivoPolitico(event.target.value)}
                rows={4}
                placeholder="Indique o que pretende acompanhar, resolver ou defender."
              />
            </div>
          </div>

          <div className="shrink-0 border-t border-border/70 bg-card px-5 py-4 sm:px-7">
            {erroGuardar && (
              <p role="alert" className="mb-3 text-sm text-destructive">
                {erroGuardar}
              </p>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                disabled={aGuardar}
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!dadosValidos || aGuardar}
                className="w-full sm:w-auto"
              >
                <CheckCircle2 className="h-4 w-4" />
                {aGuardar ? "A guardar…" : "Criar assunto"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
