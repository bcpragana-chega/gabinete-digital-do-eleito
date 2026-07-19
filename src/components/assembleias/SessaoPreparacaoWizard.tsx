import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Landmark,
  ListChecks,
  MapPin,
  Plus,
  ScrollText,
} from "lucide-react";
import { AdicionarDocumentoSheet } from "@/components/documentos/AdicionarDocumentoSheet";
import { AdicionarPontoDialog } from "@/components/preparacao/AdicionarPontoDialog";
import { Button } from "@/components/ui/button";
import { EntityCard, InfoCard } from "@/components/ui/cards";
import { StatusBadge } from "@/components/ui/common";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import {
  adicionarDocumentoACriarRascunho,
  listarDocumentosACriarDaAssembleia,
  subscreverDocumentosACriar,
} from "@/lib/documentos-a-criar-store";
import { guardarEstrategiaDaAssembleia, type EstrategiaSessao } from "@/lib/estrategia-store";
import { useDossies } from "@/lib/dossies-store";
import { editarDocumento } from "@/lib/documentos-store";
import { documentoRevisto } from "@/lib/session-flow";
import type { PontoOrdemTrabalhos } from "@/lib/pontos-store";
import type {
  Assembleia,
  Documento,
  DocumentoCriado,
  Dossie,
  TipoDocumentoCriado,
} from "@/lib/types";

type SessaoPreparacaoWizardProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assembleia: Assembleia;
  documentos: Documento[];
  pontos: PontoOrdemTrabalhos[];
  documentosACriar: DocumentoCriado[];
  estrategia: EstrategiaSessao;
  onPontosChange: () => void;
};

const passos = ["Dados", "Documentos", "Pontos", "Estratégia", "Documentos", "Revisão"];

const tiposDocumentoACriar: TipoDocumentoCriado[] = [
  "Moção",
  "Recomendação",
  "Requerimento",
  "Declaração de voto",
  "Intervenção",
];

function pontoPreparado(ponto: PontoOrdemTrabalhos) {
  return ponto.estado === "Preparado" || ponto.estado === "Concluído";
}

function StepTitle({ title, question }: { title: string; question: string }) {
  return (
    <div className="space-y-1">
      <h3 className="font-display text-xl font-semibold text-foreground">{title}</h3>
      <p className="text-sm leading-6 text-muted-foreground">{question}</p>
    </div>
  );
}

function Progress({ activeStep }: { activeStep: number }) {
  return (
    <div className="overflow-x-auto pb-1">
      <ol className="flex min-w-max items-center gap-2">
        {passos.map((passo, index) => {
          const active = index === activeStep;
          const done = index < activeStep;

          return (
            <li key={`${passo}-${index}`} className="flex items-center gap-2">
              <div
                className={[
                  "flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-medium",
                  active
                    ? "border-foreground/20 bg-foreground text-background"
                    : done
                      ? "border-border bg-muted text-foreground"
                      : "border-border bg-card text-muted-foreground",
                ].join(" ")}
              >
                <span>{index + 1}</span>
                <span>{passo}</span>
              </div>
              {index < passos.length - 1 && (
                <div className="h-px w-4 bg-border" aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function SessaoPreparacaoWizard({
  open,
  onOpenChange,
  assembleia,
  documentos,
  pontos,
  documentosACriar,
  estrategia,
  onPontosChange,
}: SessaoPreparacaoWizardProps) {
  const todosAssuntos = useDossies();
  const assuntos = useMemo(
    () => todosAssuntos.filter((assunto) => !assunto.archivedAt),
    [todosAssuntos],
  );
  const [step, setStep] = useState(0);
  const [estrategiaForm, setEstrategiaForm] = useState(estrategia);
  const [rascunhos, setRascunhos] = useState(documentosACriar);
  const [tipoRascunho, setTipoRascunho] = useState<TipoDocumentoCriado>("Moção");
  const [assuntoRascunhoId, setAssuntoRascunhoId] = useState("");
  const [pontoRascunhoId, setPontoRascunhoId] = useState("");
  const [tituloRascunho, setTituloRascunho] = useState("");

  useEffect(() => {
    if (!open) return;

    setStep(0);
    setEstrategiaForm(estrategia);
    setRascunhos(listarDocumentosACriarDaAssembleia(assembleia.id));
    setAssuntoRascunhoId(assuntos[0]?.id ?? "");
    setPontoRascunhoId(pontos[0]?.id ?? "");
  }, [assembleia.id, assuntos, estrategia, open, pontos]);

  useEffect(() => {
    if (!open) return;

    const atualizar = () => setRascunhos(listarDocumentosACriarDaAssembleia(assembleia.id));
    atualizar();
    return subscreverDocumentosACriar(atualizar);
  }, [assembleia.id, open]);

  const documentosAnalisados = documentos.filter(documentoRevisto);
  const pontosPreparados = pontos.filter(pontoPreparado);
  const estrategiaPreenchida = [
    estrategiaForm.objetivoPolitico,
    estrategiaForm.mensagemPrincipal,
    estrategiaForm.naoFazer,
  ].some((campo) => campo.trim().length > 0);
  const alertasPendentes = [
    documentos.length > documentosAnalisados.length
      ? `${documentos.length - documentosAnalisados.length} documentos por analisar`
      : null,
    pontos.length > pontosPreparados.length
      ? `${pontos.length - pontosPreparados.length} pontos por preparar`
      : null,
    !estrategiaPreenchida ? "Estratégia por preencher" : null,
  ].filter(Boolean);

  function guardarEstrategia() {
    const atualizada = guardarEstrategiaDaAssembleia(assembleia.id, {
      objetivoPolitico: estrategiaForm.objetivoPolitico,
      mensagemPrincipal: estrategiaForm.mensagemPrincipal,
      naoFazer: estrategiaForm.naoFazer,
      adversariosPrevisiveis: estrategiaForm.adversariosPrevisiveis,
      notasLivres: estrategiaForm.notasLivres,
    });
    setEstrategiaForm(atualizada);
  }

  function criarRascunho() {
    const pontoId = pontoRascunhoId || pontos[0]?.id;
    if (!pontoId || !assuntoRascunhoId || !tituloRascunho.trim()) return;

    const novo = adicionarDocumentoACriarRascunho({
      assuntoId: assuntoRascunhoId,
      assembleiaId: assembleia.id,
      pontoId,
      tipo: tipoRascunho,
      titulo: tituloRascunho.trim(),
      conteudo: "",
    });

    setRascunhos((atuais) => [novo, ...atuais]);
    setTituloRascunho("");
  }

  function seguinte() {
    if (step === 3) guardarEstrategia();
    setStep((atual) => Math.min(atual + 1, passos.length - 1));
  }

  function concluir() {
    guardarEstrategia();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-full max-w-none flex-col gap-0 rounded-none border-border bg-background p-0 sm:h-[92dvh] sm:max-h-[92dvh] sm:w-[min(1040px,calc(100vw-2rem))] sm:rounded-3xl">
        <DialogHeader className="shrink-0 border-b border-border/70 px-5 py-4 text-left sm:px-7">
          <DialogTitle>Preparar Sessão</DialogTitle>
          <DialogDescription>Um passo de cada vez. Pode voltar quando precisar.</DialogDescription>
          <div className="pt-4">
            <Progress activeStep={step} />
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          {step === 0 && <WizardStepDados assembleia={assembleia} />}

          {step === 1 && (
            <WizardStepDocumentos
              assembleiaId={assembleia.id}
              documentos={documentos}
              documentosAnalisadosIds={
                new Set(documentosAnalisados.map((documento) => documento.id))
              }
              onMarcarAnalisado={(documentoId) =>
                editarDocumento(documentoId, { estado: "Revisto" })
              }
            />
          )}

          {step === 2 && (
            <WizardStepPontos
              assembleiaId={assembleia.id}
              pontos={pontos}
              onPontosChange={onPontosChange}
            />
          )}

          {step === 3 && (
            <WizardStepEstrategia estrategia={estrategiaForm} onChange={setEstrategiaForm} />
          )}

          {step === 4 && (
            <WizardStepDocumentosCriar
              assembleiaId={assembleia.id}
              assuntos={assuntos}
              pontos={pontos}
              rascunhos={rascunhos}
              tipo={tipoRascunho}
              titulo={tituloRascunho}
              assuntoId={assuntoRascunhoId}
              pontoId={pontoRascunhoId}
              onTipoChange={setTipoRascunho}
              onTituloChange={setTituloRascunho}
              onAssuntoChange={setAssuntoRascunhoId}
              onPontoChange={setPontoRascunhoId}
              onCriar={criarRascunho}
            />
          )}

          {step === 5 && (
            <WizardStepRevisao
              assembleia={assembleia}
              documentos={documentos}
              documentosAnalisados={documentosAnalisados.length}
              pontos={pontos}
              pontosPreparados={pontosPreparados.length}
              rascunhos={rascunhos}
              alertasPendentes={alertasPendentes}
            />
          )}
        </div>

        <div className="shrink-0 border-t border-border/70 bg-card px-5 py-4 sm:px-7">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              disabled={step === 0}
              onClick={() => setStep((atual) => Math.max(atual - 1, 0))}
              className="w-full sm:w-auto"
            >
              <ChevronLeft className="h-4 w-4" />
              Voltar
            </Button>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              {step === 3 && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={guardarEstrategia}
                  className="w-full sm:w-auto"
                >
                  Guardar
                </Button>
              )}
              {step < passos.length - 1 ? (
                <Button type="button" onClick={seguinte} className="w-full sm:w-auto">
                  Seguinte
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button type="button" onClick={concluir} className="w-full sm:w-auto">
                  <CheckCircle2 className="h-4 w-4" />
                  Concluir preparação
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WizardStepDados({ assembleia }: { assembleia: Assembleia }) {
  return (
    <div className="space-y-5">
      <StepTitle title="Passo 1 — Dados da Sessão" question="Confirma os dados da sessão." />
      <div className="grid gap-3 sm:grid-cols-2">
        <InfoCard icon={Landmark} title="Título" description={assembleia.nome} />
        <InfoCard icon={CalendarDays} title="Data" description={assembleia.data} />
        <InfoCard icon={Clock} title="Hora" description={assembleia.hora} />
        <InfoCard icon={MapPin} title="Local" description={assembleia.local} />
        <InfoCard title="Estado" description={assembleia.estado} className="sm:col-span-2" />
      </div>
    </div>
  );
}

function WizardStepDocumentos({
  assembleiaId,
  documentos,
  documentosAnalisadosIds,
  onMarcarAnalisado,
}: {
  assembleiaId: string;
  documentos: Documento[];
  documentosAnalisadosIds: Set<string>;
  onMarcarAnalisado: (documentoId: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <StepTitle title="Passo 2 — Documentos" question="Já analisaste os documentos?" />
        <AdicionarDocumentoSheet assembleiaId={assembleiaId} />
      </div>

      {documentos.length === 0 ? (
        <InfoCard
          icon={FileText}
          title="Ainda não há documentos"
          description="Adicione documentos para continuar a preparação."
        />
      ) : (
        <div className="grid gap-3">
          {documentos.map((documento) => {
            const analisado = documentosAnalisadosIds.has(documento.id);

            return (
              <EntityCard
                key={documento.id}
                icon={FileText}
                eyebrow={documento.tipo}
                title={documento.titulo}
                description={documento.notas || documento.ficheiroNome || "Documento da sessão."}
                meta={
                  <StatusBadge tone={analisado ? "success" : "warning"}>
                    {analisado ? "Analisado" : "Por analisar"}
                  </StatusBadge>
                }
                actions={
                  analisado ? (
                    <Button type="button" variant="ghost" size="sm" disabled>
                      Feito
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => onMarcarAnalisado(documento.id)}
                    >
                      Marcar analisado
                    </Button>
                  )
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function WizardStepPontos({
  assembleiaId,
  pontos,
  onPontosChange,
}: {
  assembleiaId: string;
  pontos: PontoOrdemTrabalhos[];
  onPontosChange: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <StepTitle title="Passo 3 — Pontos" question="Quais os pontos a preparar?" />
        <AdicionarPontoDialog assembleiaId={assembleiaId} onAdicionar={onPontosChange} />
      </div>

      {pontos.length === 0 ? (
        <InfoCard
          icon={ListChecks}
          title="Ainda não há pontos"
          description="Adicione os pontos da ordem de trabalhos para preparar a sessão."
        />
      ) : (
        <div className="grid gap-3">
          {pontos.map((ponto) => {
            const preparado = pontoPreparado(ponto);

            return (
              <EntityCard
                key={ponto.id}
                icon={ListChecks}
                eyebrow={`Ponto ${ponto.numero}`}
                title={ponto.titulo}
                description={ponto.descricao || "Sem descrição."}
                meta={
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge tone={preparado ? "success" : "warning"}>
                      {preparado ? "Preparado" : "Pendente"}
                    </StatusBadge>
                    <StatusBadge tone="muted" dot={false}>
                      {ponto.prioridade}
                    </StatusBadge>
                  </div>
                }
                actions={
                  <Button asChild variant="secondary" size="sm">
                    <Link
                      to="/sessoes/$id/preparacao/pontos/$pontoId"
                      params={{ id: assembleiaId, pontoId: ponto.id }}
                    >
                      Abrir
                    </Link>
                  </Button>
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function WizardStepEstrategia({
  estrategia,
  onChange,
}: {
  estrategia: EstrategiaSessao;
  onChange: (estrategia: EstrategiaSessao) => void;
}) {
  function atualizar(campo: keyof EstrategiaSessao, valor: string) {
    onChange({ ...estrategia, [campo]: valor });
  }

  return (
    <div className="space-y-5">
      <StepTitle title="Passo 4 — Estratégia" question="Qual é a estratégia?" />
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="wizard-objetivo">Objetivo político da sessão</Label>
          <Textarea
            id="wizard-objetivo"
            value={estrategia.objetivoPolitico}
            onChange={(event) => atualizar("objetivoPolitico", event.target.value)}
            rows={3}
            placeholder="O que quer alcançar nesta sessão?"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wizard-linha">Linha geral de intervenção</Label>
          <Textarea
            id="wizard-linha"
            value={estrategia.mensagemPrincipal}
            onChange={(event) => atualizar("mensagemPrincipal", event.target.value)}
            rows={3}
            placeholder="Qual é a mensagem principal?"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wizard-riscos">Riscos e alertas</Label>
          <Textarea
            id="wizard-riscos"
            value={estrategia.naoFazer}
            onChange={(event) => atualizar("naoFazer", event.target.value)}
            rows={3}
            placeholder="O que exige cuidado?"
          />
        </div>
      </div>
    </div>
  );
}

function WizardStepDocumentosCriar({
  assembleiaId,
  assuntos,
  pontos,
  rascunhos,
  tipo,
  titulo,
  assuntoId,
  pontoId,
  onTipoChange,
  onTituloChange,
  onAssuntoChange,
  onPontoChange,
  onCriar,
}: {
  assembleiaId: string;
  assuntos: Dossie[];
  pontos: PontoOrdemTrabalhos[];
  rascunhos: DocumentoCriado[];
  tipo: TipoDocumentoCriado;
  titulo: string;
  assuntoId: string;
  pontoId: string;
  onTipoChange: (tipo: TipoDocumentoCriado) => void;
  onTituloChange: (titulo: string) => void;
  onAssuntoChange: (assuntoId: string) => void;
  onPontoChange: (pontoId: string) => void;
  onCriar: () => void;
}) {
  return (
    <div className="space-y-5">
      <StepTitle title="Passo 5 — Documentos" question="Que documentos queres preparar?" />

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="grid gap-3 lg:grid-cols-[180px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)_auto] lg:items-end">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select
              value={tipo}
              onValueChange={(valor) => onTipoChange(valor as TipoDocumentoCriado)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tiposDocumentoACriar.map((opcao) => (
                  <SelectItem key={opcao} value={opcao}>
                    {opcao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Assunto de origem</Label>
            <Select
              value={assuntoId}
              onValueChange={onAssuntoChange}
              disabled={assuntos.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Escolher assunto" />
              </SelectTrigger>
              <SelectContent>
                {assuntos.map((assunto) => (
                  <SelectItem key={assunto.id} value={assunto.id}>
                    {assunto.titulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Ponto</Label>
            <Select value={pontoId} onValueChange={onPontoChange} disabled={pontos.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder="Escolher ponto" />
              </SelectTrigger>
              <SelectContent>
                {pontos.map((ponto) => (
                  <SelectItem key={ponto.id} value={ponto.id}>
                    {ponto.numero}. {ponto.titulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wizard-titulo-rascunho">Título</Label>
            <Input
              id="wizard-titulo-rascunho"
              value={titulo}
              onChange={(event) => onTituloChange(event.target.value)}
              placeholder="Ex.: Recomendação sobre habitação"
            />
          </div>

          <Button
            type="button"
            onClick={onCriar}
            disabled={assuntos.length === 0 || pontos.length === 0 || titulo.trim().length === 0}
            className="w-full lg:w-auto"
          >
            <Plus className="h-4 w-4" />
            Criar
          </Button>
        </div>
      </div>

      {pontos.length === 0 && (
        <InfoCard
          title="Adicione primeiro um ponto"
          description="Os documentos ficam ligados a um ponto da ordem de trabalhos."
        />
      )}

      {assuntos.length === 0 && (
        <InfoCard
          title="Crie primeiro um assunto"
          description="Novos documentos devem nascer de um assunto para manter contexto e histórico."
        />
      )}

      <div className="grid gap-3">
        {rascunhos.length === 0 ? (
          <InfoCard
            icon={ScrollText}
            title="Ainda não há rascunhos"
            description="Crie uma moção, recomendação, requerimento ou declaração de voto."
          />
        ) : (
          rascunhos.map((rascunho) => (
            <EntityCard
              key={rascunho.id}
              icon={ScrollText}
              eyebrow={rascunho.tipo}
              title={rascunho.titulo}
              description={rascunho.estado}
              actions={
                <Button asChild variant="secondary" size="sm">
                  <Link
                    to="/documentos/$documentoId"
                    params={{ documentoId: rascunho.id }}
                    search={{ origem: "sessao", sessaoId: assembleiaId }}
                  >
                    Abrir
                  </Link>
                </Button>
              }
            />
          ))
        )}
      </div>
    </div>
  );
}

function WizardStepRevisao({
  assembleia,
  documentos,
  documentosAnalisados,
  pontos,
  pontosPreparados,
  rascunhos,
  alertasPendentes,
}: {
  assembleia: Assembleia;
  documentos: Documento[];
  documentosAnalisados: number;
  pontos: PontoOrdemTrabalhos[];
  pontosPreparados: number;
  rascunhos: DocumentoCriado[];
  alertasPendentes: (string | null)[];
}) {
  return (
    <div className="space-y-5">
      <StepTitle title="Passo 6 — Revisão Final" question="Está tudo pronto para concluir?" />
      <div className="grid gap-3 sm:grid-cols-2">
        <InfoCard icon={Landmark} title="Sessão" description={assembleia.nome} />
        <InfoCard
          icon={FileText}
          title="Documentos analisados"
          description={`${documentosAnalisados} de ${documentos.length}`}
        />
        <InfoCard
          icon={ListChecks}
          title="Pontos preparados"
          description={`${pontosPreparados} de ${pontos.length}`}
        />
        <InfoCard
          icon={ScrollText}
          title="Documentos criados"
          description={`${rascunhos.length} rascunhos`}
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h4 className="text-sm font-semibold text-foreground">Alertas pendentes</h4>
        {alertasPendentes.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Sem alertas pendentes.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {alertasPendentes.map((alerta) => (
              <li key={alerta} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {alerta}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
