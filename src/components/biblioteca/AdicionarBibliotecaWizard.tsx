import { useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Landmark,
  NotebookText,
  Plus,
} from "lucide-react";
import { useAssembleias } from "@/lib/assembleias-store";
import { associarDocumentoAoDossie } from "@/lib/dossie-documentos-store";
import { useDossies } from "@/lib/dossies-store";
import { adicionarDocumento } from "@/lib/documentos-store";
import {
  arquivarInboxDocumento,
  associarInboxDocumentoAAssembleia,
  associarInboxDocumentoADossie,
  definirEstadoInboxDocumento,
  marcarInboxDocumentoComoTratado,
} from "@/lib/inbox-store";
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
import type { EstadoDocumento, TipoDocumento } from "@/lib/types";

type TipoBiblioteca =
  | "Lei ou regulamento"
  | "Programa eleitoral"
  | "Ata"
  | "Relatório"
  | "Contrato"
  | "Notícia"
  | "Outro";

type EstadoInicial = "Por tratar" | "Analisado" | "Arquivado";
type Ligacao = "Assunto" | "Sessão" | "Ambos" | "Nenhum por agora";

const passos = ["Documento", "Classificar", "Ligar", "Revisão"];
const tipos: TipoBiblioteca[] = [
  "Lei ou regulamento",
  "Programa eleitoral",
  "Ata",
  "Relatório",
  "Contrato",
  "Notícia",
  "Outro",
];
const estados: EstadoInicial[] = ["Por tratar", "Analisado", "Arquivado"];
const ligacoes: Ligacao[] = ["Assunto", "Sessão", "Ambos", "Nenhum por agora"];

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

function mapearTipoDocumento(tipo: TipoBiblioteca): TipoDocumento {
  if (tipo === "Lei ou regulamento") return "Regulamento";
  if (tipo === "Ata") return "Ata";
  if (tipo === "Relatório") return "Relatório";
  return "Outro";
}

function mapearEstadoDocumento(estado: EstadoInicial): EstadoDocumento {
  if (estado === "Analisado") return "Revisto";
  if (estado === "Arquivado") return "Arquivado";
  return "Por rever";
}

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

export function AdicionarBibliotecaWizard() {
  const assembleias = useAssembleias().filter((assembleia) => assembleia.estado !== "arquivada");
  const dossies = useDossies().filter((dossie) => !dossie.archivedAt);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [ficheiroNome, setFicheiroNome] = useState<string | undefined>();
  const [ficheiroTipo, setFicheiroTipo] = useState<string | undefined>();
  const [tipo, setTipo] = useState<TipoBiblioteca>("Outro");
  const [estado, setEstado] = useState<EstadoInicial>("Por tratar");
  const [ligacao, setLigacao] = useState<Ligacao>("Nenhum por agora");
  const [dossieId, setDossieId] = useState("");
  const [assembleiaId, setAssembleiaId] = useState("");

  const dadosValidos = titulo.trim().length > 0;
  const precisaAssunto = ligacao === "Assunto" || ligacao === "Ambos";
  const precisaSessao = ligacao === "Sessão" || ligacao === "Ambos";

  function reset() {
    setStep(0);
    setTitulo("");
    setDescricao("");
    setFicheiroNome(undefined);
    setFicheiroTipo(undefined);
    setTipo("Outro");
    setEstado("Por tratar");
    setLigacao("Nenhum por agora");
    setDossieId("");
    setAssembleiaId("");
  }

  function avancar() {
    if (step === 0 && !dadosValidos) return;
    setStep((atual) => Math.min(atual + 1, passos.length - 1));
  }

  function adicionar() {
    console.info("[DOCUMENTOS DIAG] PASSO 1 botão Adicionar à Biblioteca foi clicado", {
      origem: "AdicionarBibliotecaWizard",
      titulo,
      tipo,
      estado,
      ligacao,
      dossieId,
      assembleiaId,
      temFicheiroNome: Boolean(ficheiroNome),
      ficheiroTipo,
    });

    if (!dadosValidos) return;

    const documento = adicionarDocumento({
      assembleiaId: precisaSessao && assembleiaId ? assembleiaId : "biblioteca",
      titulo: titulo.trim(),
      tipo: mapearTipoDocumento(tipo),
      data: hoje(),
      estado: mapearEstadoDocumento(estado),
      ficheiroNome,
      ficheiroTipo,
      notas: [`[Biblioteca: ${tipo}]`, descricao.trim()].filter(Boolean).join("\n"),
    });

    if (precisaAssunto && dossieId) {
      associarDocumentoAoDossie(dossieId, documento.id);
      associarInboxDocumentoADossie(documento.id, dossieId);
    }

    if (precisaSessao && assembleiaId) {
      associarInboxDocumentoAAssembleia(documento.id, assembleiaId);
    }

    if (estado === "Por tratar") {
      definirEstadoInboxDocumento(documento.id, "Novo");
    }

    if (estado === "Analisado") {
      marcarInboxDocumentoComoTratado(documento.id);
    }

    if (estado === "Arquivado") {
      arquivarInboxDocumento(documento.id);
    }

    setOpen(false);
    reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Adicionar documento
        </Button>
      </DialogTrigger>

      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-full max-w-none flex-col gap-0 rounded-none border-border bg-background p-0 sm:h-[88dvh] sm:max-h-[88dvh] sm:w-[min(860px,calc(100vw-2rem))] sm:rounded-3xl">
        <DialogHeader className="shrink-0 border-b border-border/70 px-5 py-4 text-left sm:px-7">
          <DialogTitle>Adicionar à Biblioteca</DialogTitle>
          <DialogDescription>Guarde documentos e referências do mandato.</DialogDescription>
          <div className="pt-4">
            <Progress step={step} />
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          {step === 0 && (
            <div className="space-y-5">
              <StepTitle
                title="Passo 1 — Escolher documento"
                question="Que documento queres adicionar?"
              />
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="biblioteca-titulo">Título do documento</Label>
                  <Input
                    id="biblioteca-titulo"
                    value={titulo}
                    onChange={(event) => setTitulo(event.target.value)}
                    placeholder="Ex.: Regulamento municipal"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="biblioteca-ficheiro">Ficheiro</Label>
                  <Input
                    id="biblioteca-ficheiro"
                    type="file"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      setFicheiroNome(file?.name);
                      setFicheiroTipo(file?.type);
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Nesta fase é guardado apenas o nome do ficheiro e os metadados.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="biblioteca-descricao">Descrição curta</Label>
                  <Textarea
                    id="biblioteca-descricao"
                    value={descricao}
                    onChange={(event) => setDescricao(event.target.value)}
                    rows={3}
                    placeholder="Opcional"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <StepTitle title="Passo 2 — Classificar" question="Que tipo de documento é?" />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={tipo} onValueChange={(value) => setTipo(value as TipoBiblioteca)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tipos.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Estado inicial</Label>
                  <Select
                    value={estado}
                    onValueChange={(value) => setEstado(value as EstadoInicial)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {estados.map((item) => (
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

          {step === 2 && (
            <div className="space-y-5">
              <StepTitle
                title="Passo 3 — Ligar ao trabalho"
                question="Este documento está ligado a algum trabalho?"
              />
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Ligação</Label>
                  <Select value={ligacao} onValueChange={(value) => setLigacao(value as Ligacao)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ligacoes.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {precisaAssunto && (
                  <div className="space-y-2">
                    <Label>Assunto</Label>
                    <Select value={dossieId} onValueChange={setDossieId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Escolher assunto" />
                      </SelectTrigger>
                      <SelectContent>
                        {dossies.map((dossie) => (
                          <SelectItem key={dossie.id} value={dossie.id}>
                            {dossie.titulo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {precisaSessao && (
                  <div className="space-y-2">
                    <Label>Sessão</Label>
                    <Select value={assembleiaId} onValueChange={setAssembleiaId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Escolher sessão" />
                      </SelectTrigger>
                      <SelectContent>
                        {assembleias.map((assembleia) => (
                          <SelectItem key={assembleia.id} value={assembleia.id}>
                            {assembleia.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <StepTitle
                title="Passo 4 — Revisão"
                question="Confirma antes de adicionar à Biblioteca."
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoCard icon={FileText} title="Título" description={titulo || "Por preencher"} />
                <InfoCard icon={FileText} title="Tipo" description={tipo} />
                <InfoCard icon={CheckCircle2} title="Estado" description={estado} />
                <InfoCard icon={Landmark} title="Ligação" description={ligacao} />
                {ficheiroNome && (
                  <InfoCard
                    icon={FileText}
                    title="Ficheiro"
                    description={ficheiroNome}
                    className="sm:col-span-2"
                  />
                )}
                {(precisaAssunto || precisaSessao) && (
                  <InfoCard
                    icon={NotebookText}
                    title="Ligado a"
                    description={
                      [
                        dossies.find((dossie) => dossie.id === dossieId)?.titulo,
                        assembleias.find((assembleia) => assembleia.id === assembleiaId)?.nome,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Sem seleção"
                    }
                    className="sm:col-span-2"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border/70 bg-card px-5 py-4 sm:px-7">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              disabled={step === 0}
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
                disabled={step === 0 && !dadosValidos}
                className="w-full sm:w-auto"
              >
                Seguinte
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={adicionar}
                disabled={!dadosValidos}
                className="w-full sm:w-auto"
              >
                <CheckCircle2 className="h-4 w-4" />
                Adicionar à Biblioteca
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
