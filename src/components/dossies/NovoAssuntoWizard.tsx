import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  NotebookText,
  Plus,
  Target,
} from "lucide-react";
import { adicionarNotaDossie } from "@/lib/dossie-notas-store";
import { associarAssembleiaAoDossie } from "@/lib/dossie-assembleias-store";
import { adicionarDossie } from "@/lib/dossies-store";
import { Button } from "@/components/ui/button";
import { InfoCard } from "@/components/ui/cards";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { PrioridadeDossie } from "@/lib/types";

const passos = ["Identificar", "Contexto", "Começar"];
const categorias = [
  "Habitação",
  "Saúde",
  "Mobilidade",
  "Orçamento",
  "Educação",
  "Ambiente",
  "Outro",
];
const prioridades: PrioridadeDossie[] = ["Baixa", "Média", "Alta", "Crítica"];

function Progress({ step }: { step: number }) {
  return (
    <div className="overflow-x-auto pb-1">
      <ol className="flex min-w-max items-center gap-2">
        {passos.map((passo, index) => (
          <li key={passo} className="flex items-center gap-2">
            <div
              className={[
                "flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-medium",
                index === step
                  ? "border-foreground/20 bg-foreground text-background"
                  : index < step
                    ? "border-border bg-muted text-foreground"
                    : "border-border bg-card text-muted-foreground",
              ].join(" ")}
            >
              <span>{index + 1}</span>
              <span>{passo}</span>
            </div>
            {index < passos.length - 1 && <div className="h-px w-4 bg-border" />}
          </li>
        ))}
      </ol>
    </div>
  );
}

function StepTitle({ title, question }: { title: string; question: string }) {
  return (
    <div>
      <h3 className="font-display text-xl font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{question}</p>
    </div>
  );
}

export function NovoAssuntoWizard({ assembleiaId }: { assembleiaId?: string } = {}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [titulo, setTitulo] = useState("");
  const [categoria, setCategoria] = useState("Habitação");
  const [prioridade, setPrioridade] = useState<PrioridadeDossie>("Média");
  const [resumo, setResumo] = useState("");
  const [objetivoPolitico, setObjetivoPolitico] = useState("");
  const [criarNota, setCriarNota] = useState(false);
  const [notaInicial, setNotaInicial] = useState("");
  const [aGuardar, setAGuardar] = useState(false);
  const [erroGuardar, setErroGuardar] = useState("");
  const guardarEmCurso = useRef(false);
  const tentativaId = useRef<string | undefined>(undefined);

  const dadosValidos = titulo.trim().length > 0;

  function reset() {
    setStep(0);
    setTitulo("");
    setCategoria("Habitação");
    setPrioridade("Média");
    setResumo("");
    setObjetivoPolitico("");
    setCriarNota(false);
    setNotaInicial("");
    setErroGuardar("");
    tentativaId.current = undefined;
  }

  function avancar() {
    if (step === 0 && !dadosValidos) return;
    setStep((atual) => Math.min(atual + 1, passos.length - 1));
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
          prioridade,
          objetivoPolitico: objetivoPolitico.trim(),
          resumo: resumo.trim(),
          tags: [categoria.toLowerCase()],
        },
        { id: tentativaId.current },
      );

      if (assembleiaId) await associarAssembleiaAoDossie(assunto.id, assembleiaId);
      if (criarNota && notaInicial.trim()) adicionarNotaDossie(assunto.id, notaInicial.trim());
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

      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-full max-w-none flex-col gap-0 rounded-none border-border bg-background p-0 sm:h-[88dvh] sm:max-h-[88dvh] sm:w-[min(820px,calc(100vw-2rem))] sm:rounded-3xl">
        <DialogHeader className="shrink-0 border-b border-border/70 px-5 py-4 text-left sm:px-7">
          <DialogTitle>Novo assunto</DialogTitle>
          <DialogDescription>Crie um assunto em poucos passos.</DialogDescription>
          <div className="pt-4">
            <Progress step={step} />
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          {step === 0 && (
            <div className="space-y-5">
              <StepTitle
                title="Passo 1 — Identificar o assunto"
                question="Qual é o assunto que queres acompanhar?"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="novo-assunto-nome">Nome do assunto</Label>
                  <Input
                    id="novo-assunto-nome"
                    value={titulo}
                    onChange={(event) => setTitulo(event.target.value)}
                    placeholder="Ex.: Habitação"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={categoria} onValueChange={setCategoria}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <Select
                    value={prioridade}
                    onValueChange={(value) => setPrioridade(value as PrioridadeDossie)}
                  >
                    <SelectTrigger>
                      <SelectValue />
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
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <StepTitle title="Passo 2 — Contexto" question="Porque é importante este assunto?" />
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="novo-assunto-resumo">Resumo</Label>
                  <Textarea
                    id="novo-assunto-resumo"
                    value={resumo}
                    onChange={(event) => setResumo(event.target.value)}
                    rows={4}
                    placeholder="Explique em poucas frases o que está em causa."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="novo-assunto-objetivo">Objetivo político</Label>
                  <Textarea
                    id="novo-assunto-objetivo"
                    value={objetivoPolitico}
                    onChange={(event) => setObjetivoPolitico(event.target.value)}
                    rows={4}
                    placeholder="O que pretende acompanhar, resolver ou defender?"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <StepTitle title="Passo 3 — Começar" question="Queres começar já?" />
              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={() => setCriarNota((valor) => !valor)}
                  className={[
                    "rounded-2xl border p-4 text-left transition-colors",
                    criarNota
                      ? "border-foreground/20 bg-muted"
                      : "border-border bg-card hover:bg-muted/60",
                  ].join(" ")}
                >
                  <div className="flex items-start gap-3">
                    <NotebookText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-semibold text-foreground">
                        Criar primeira nota
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        Registe já o primeiro apontamento.
                      </div>
                    </div>
                  </div>
                </button>

                {criarNota && (
                  <div className="space-y-2">
                    <Label htmlFor="novo-assunto-nota">Nota inicial</Label>
                    <Textarea
                      id="novo-assunto-nota"
                      value={notaInicial}
                      onChange={(event) => setNotaInicial(event.target.value)}
                      rows={4}
                      placeholder="Primeiro apontamento sobre este assunto."
                    />
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoCard
                    icon={FileText}
                    title="Associar documento mais tarde"
                    description="Disponível no Workspace do assunto."
                  />
                  <InfoCard
                    icon={Target}
                    title="Associar sessão mais tarde"
                    description="Disponível em Ligado a este assunto."
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border/70 bg-card px-5 py-4 sm:px-7">
          {erroGuardar && (
            <p role="alert" className="mb-3 text-sm text-destructive">
              {erroGuardar}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              disabled={step === 0 || aGuardar}
              onClick={() => setStep((atual) => Math.max(0, atual - 1))}
              className="w-full sm:w-auto"
            >
              <ChevronLeft className="h-4 w-4" />
              Voltar
            </Button>
            {step < passos.length - 1 ? (
              <Button
                type="button"
                onClick={avancar}
                disabled={aGuardar || (step === 0 && !dadosValidos)}
                className="w-full sm:w-auto"
              >
                Seguinte
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={criarAssunto}
                disabled={!dadosValidos || aGuardar}
                className="w-full sm:w-auto"
              >
                <CheckCircle2 className="h-4 w-4" />
                {aGuardar ? "A guardar…" : "Criar Assunto"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
