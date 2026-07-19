import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, FileSearch, Plus, Trash2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { ImpactoMandatoResumo } from "@/components/documentos/ImpactoMandatoResumo";
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
import {
  analisarDocumentoCarregado,
  carregarDocumentoParaAnalise,
  confirmarAnaliseDocumento,
  confirmarDocumentoNaBiblioteca,
  corrigirCampoSessao,
  decidirDestinoAnalise,
  destinoPreparaSessao,
  destinoRequerConfirmacao,
  executarConfirmacaoAnaliseComDependencias,
  mapearTipoDocumentoInstitucional,
  obterIncertezaCampoSessao,
  prepararAnaliseInstitucionalParaRevisao,
  validarCamposConfirmacaoSessao,
  validarDadosConfirmacaoAnalise,
  type CampoSessaoEditavel,
  type ErrosCamposConfirmacaoSessao,
} from "@/lib/institutional-document-flow";
import {
  gerarTituloSessaoInstitucional,
  resolverTituloSessaoInstitucional,
} from "@/lib/institutional-session-title";
import type { AnaliseDocumentoInstitucional, Documento, TipoDocumento } from "@/lib/types";
import { useAuth } from "@/lib/auth-store";
import { marcarProximaAcaoConvocatoria } from "@/lib/onboarding-state";
import { chaveTransitoriaPorUtilizador } from "@/lib/session-transient-state";

type Step = "file" | "analysing" | "review" | "duplicate";

export function InstitutionalDocumentIntake({
  documentoInicial,
  triggerLabel,
  triggerVariant,
}: {
  documentoInicial?: Documento;
  triggerLabel?: string;
  triggerVariant?: ButtonProps["variant"];
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("file");
  const [file, setFile] = useState<File>();
  const [documento, setDocumento] = useState<Documento>();
  const [analise, setAnalise] = useState<AnaliseDocumentoInstitucional>();
  const [tituloDocumento, setTituloDocumento] = useState("");
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>("Outro");
  const [tituloSessao, setTituloSessao] = useState("");
  const [tituloPersonalizado, setTituloPersonalizado] = useState(false);
  const [duplicateId, setDuplicateId] = useState("");
  const [error, setError] = useState("");
  const [analysisNotice, setAnalysisNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ErrosCamposConfirmacaoSessao>({});
  const confirmacaoEmCurso = useRef(false);

  function reset() {
    setStep("file");
    setFile(undefined);
    setDocumento(undefined);
    setAnalise(undefined);
    setTituloDocumento("");
    setTipoDocumento("Outro");
    setTituloSessao("");
    setTituloPersonalizado(false);
    setDuplicateId("");
    setError("");
    setAnalysisNotice("");
    setSaving(false);
    setFieldErrors({});
  }

  function changeOpen(value: boolean) {
    setOpen(value);
    if (!value) {
      reset();
      return;
    }
    if (documentoInicial) {
      setDocumento(documentoInicial);
      const analiseInicial = prepararAnaliseInstitucionalParaRevisao(
        documentoInicial.analiseInstitucional ?? analiseVazia(),
      );
      setAnalise(analiseInicial);
      setTituloDocumento(documentoInicial.titulo);
      setTipoDocumento(
        documentoInicial.analiseInstitucional
          ? mapearTipoDocumentoInstitucional(analiseInicial.tipoDocumento)
          : documentoInicial.tipo,
      );
      setTituloSessao(gerarTituloSessaoInstitucional(analiseInicial.sessao));
      setTituloPersonalizado(false);
      setStep("review");
    }
  }

  async function uploadAndAnalyse() {
    if (!file) return;
    let uploadedDocument: Documento | undefined;
    setStep("analysing");
    setError("");
    setFieldErrors({});
    setAnalysisNotice("");
    try {
      const uploaded = await carregarDocumentoParaAnalise(file);
      uploadedDocument = uploaded;
      setDocumento(uploaded);
      const result = await analisarDocumentoCarregado(uploaded.id);
      setAnalise(result.analise);
      setTituloDocumento(uploaded.titulo);
      setTipoDocumento(mapearTipoDocumentoInstitucional(result.analise.tipoDocumento));
      if (destinoRequerConfirmacao(decidirDestinoAnalise(result.analise)))
        setAnalysisNotice(
          "A análise identificou apenas parte do documento. Confirme os detalhes em falta.",
        );
      setTituloSessao(gerarTituloSessaoInstitucional(result.analise.sessao));
      setTituloPersonalizado(false);
      setStep("review");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível analisar o documento.");
      setStep(uploadedDocument ? "review" : "file");
      if (!analise) setAnalise(analiseVazia());
    }
  }

  async function retry() {
    if (!documento) return uploadAndAnalyse();
    setStep("analysing");
    setError("");
    setFieldErrors({});
    setAnalysisNotice("");
    try {
      const result = await analisarDocumentoCarregado(documento.id);
      setAnalise(result.analise);
      setTipoDocumento(mapearTipoDocumentoInstitucional(result.analise.tipoDocumento));
      setTituloSessao((tituloAtual) =>
        resolverTituloSessaoInstitucional({
          tituloAtual,
          personalizado: tituloPersonalizado,
          sessao: result.analise.sessao,
        }),
      );
      if (destinoRequerConfirmacao(decidirDestinoAnalise(result.analise)))
        setAnalysisNotice(
          "A análise identificou apenas parte do documento. Confirme os detalhes em falta.",
        );
      setStep("review");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "A análise falhou.");
      setStep("review");
    }
  }

  async function confirm(mode: "criar" | "atualizar" | "criar_novo" = "criar") {
    if (!documento || !analise || confirmacaoEmCurso.current) return;
    const erroValidacao = validarDadosConfirmacaoAnalise(analise);
    if (erroValidacao) {
      setFieldErrors(validarCamposConfirmacaoSessao(analise));
      setError("");
      return;
    }
    confirmacaoEmCurso.current = true;
    setSaving(true);
    setError("");
    try {
      await executarConfirmacaoAnaliseComDependencias({
        confirmar: () =>
          confirmarAnaliseDocumento({
            documentoId: documento.id,
            analise: { ...analise, tituloSessao },
            modo: mode === "criar_novo" ? "criar_novo" : mode,
            sessaoExistenteId: mode === "atualizar" ? duplicateId : undefined,
          }),
        onDuplicado: (sessaoId) => {
          setDuplicateId(sessaoId);
          setStep("duplicate");
        },
        onConfirmado: async (result) => {
          const arrivalKey = chaveTransitoriaPorUtilizador(
            "tribuno:sessao-preparada",
            result.sessaoId,
            user?.id,
          );
          if (arrivalKey) {
            sessionStorage.setItem(
              arrivalKey,
              JSON.stringify({ userId: user?.id, pontos: analise.pontosOrdemTrabalhos.length }),
            );
          }
          if (user?.id) marcarProximaAcaoConvocatoria(user.id, false);
          setOpen(false);
          reset();
          await navigate({ to: "/sessoes/$id", params: { id: result.sessaoId } });
        },
      });
    } catch {
      setError("A criação da sessão falhou sem deixar alterações parciais.");
    } finally {
      confirmacaoEmCurso.current = false;
      setSaving(false);
    }
  }

  async function confirmDocument() {
    if (!documento || !analise || confirmacaoEmCurso.current) return;
    if (!tituloDocumento.trim()) {
      setError("Confirme o título do documento antes de guardar.");
      return;
    }
    confirmacaoEmCurso.current = true;
    setSaving(true);
    setError("");
    try {
      await confirmarDocumentoNaBiblioteca({
        documento,
        analise,
        titulo: tituloDocumento,
        tipo: tipoDocumento,
      });
      const documentoId = documento.id;
      setOpen(false);
      reset();
      await navigate({
        to: "/documentos/$documentoId",
        params: { documentoId },
        search: { origem: "biblioteca" },
      });
    } catch {
      setError("Não foi possível guardar a organização do documento. Tente novamente.");
    } finally {
      confirmacaoEmCurso.current = false;
      setSaving(false);
    }
  }

  const destino = analise ? decidirDestinoAnalise(analise) : undefined;
  const preparaSessao = destino ? destinoPreparaSessao(destino) : false;

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button
          variant={triggerVariant ?? (documentoInicial ? "secondary" : "primary")}
          size={documentoInicial ? "sm" : "default"}
        >
          <FileSearch className="h-4 w-4" />
          {triggerLabel ?? (documentoInicial ? "Analisar documento" : "Analisar PDF")}
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[92dvh] max-w-3xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {step === "review" || step === "duplicate"
              ? analise?.tipoDocumento === "convocatoria"
                ? "Dados da convocatória para rever"
                : "Dados do documento para rever"
              : "Analisar documento institucional"}
          </DialogTitle>
          <DialogDescription>
            {step === "analysing"
              ? "A analisar o contexto institucional e a preparar a próxima ação."
              : step === "review" || step === "duplicate"
                ? preparaSessao
                  ? "Reveja os dados assinalados. A Sessão só será preparada depois da sua confirmação."
                  : "Confirme os dados essenciais antes de guardar o documento na Biblioteca."
                : "Carregue o PDF para análise. Poderá rever os dados antes de confirmar."}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto py-2">
          {step === "file" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>PDF</Label>
                <Input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => setFile(e.target.files?.[0])}
                />
                <p className="text-sm text-muted-foreground">
                  Comece pelo ficheiro. Pode rever e corrigir os dados antes de confirmar.
                </p>
              </div>
              {error && <ErrorText text={error} />}
              <Button className="w-full" disabled={!file} onClick={uploadAndAnalyse}>
                Adicionar e analisar
              </Button>
            </div>
          )}
          {step === "analysing" && (
            <div className="py-16 text-center">
              <FileSearch className="mx-auto h-10 w-10 animate-pulse text-primary" />
              <h3 className="mt-4 text-lg font-semibold">A analisar o documento…</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                A ler o conteúdo e a estrutura institucional, incluindo páginas digitalizadas.
              </p>
            </div>
          )}
          {step === "review" && analise && (
            <div className="space-y-4">
              {analysisNotice && !preparaSessao && (
                <p className="rounded-xl border border-amber-300/60 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
                  {analysisNotice}
                </p>
              )}
              {preparaSessao ? (
                <ReviewForm
                  analise={analise}
                  onChange={setAnalise}
                  titulo={tituloSessao}
                  tituloPersonalizado={tituloPersonalizado}
                  onTituloAutomaticoChange={setTituloSessao}
                  validationErrors={fieldErrors}
                  onValidationErrorClear={(campo) =>
                    setFieldErrors((atuais) => ({ ...atuais, [campo]: undefined }))
                  }
                  onTituloChange={(value) => {
                    if (value.trim()) {
                      setTituloSessao(value);
                      setTituloPersonalizado(true);
                      return;
                    }
                    setTituloPersonalizado(false);
                    setTituloSessao(gerarTituloSessaoInstitucional(analise.sessao));
                  }}
                />
              ) : (
                <DocumentReviewForm
                  analise={analise}
                  titulo={tituloDocumento}
                  tipo={tipoDocumento}
                  onTituloChange={setTituloDocumento}
                  onTipoChange={setTipoDocumento}
                />
              )}
            </div>
          )}
          {step === "duplicate" && (
            <div className="space-y-4 rounded-2xl border p-5">
              <h3 className="font-semibold">Encontrei uma possível sessão duplicada</h3>
              <p className="text-sm text-muted-foreground">
                Confirme se pretende atualizar a sessão existente ou criar outra sessão.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button disabled={saving} onClick={() => confirm("atualizar")}>
                  Atualizar sessão existente
                </Button>
                <Button variant="secondary" disabled={saving} onClick={() => confirm("criar_novo")}>
                  Criar outra sessão
                </Button>
              </div>
            </div>
          )}
          {step !== "file" && step !== "analysing" && error && (
            <div className="mt-4">
              <ErrorText text={error} />
            </div>
          )}
        </div>
        {step === "review" && (
          <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-between">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="secondary" disabled={saving} onClick={retry}>
                Tentar análise novamente
              </Button>
              <Button
                disabled={saving || (!preparaSessao && !tituloDocumento.trim())}
                onClick={() => (preparaSessao ? confirm() : confirmDocument())}
              >
                {saving
                  ? "A confirmar…"
                  : preparaSessao
                    ? "Confirmar e preparar sessão"
                    : "Confirmar e guardar documento"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function analiseVazia(): AnaliseDocumentoInstitucional {
  return {
    tipoDocumento: "desconhecido",
    confiancaGlobal: 0,
    sessao: { tipo: "desconhecida" },
    pontosOrdemTrabalhos: [],
    informacaoRelevante: [],
    camposIncertos: [
      {
        campo: "documento",
        motivo: "Não consegui ler texto suficiente neste documento. Confirma os dados manualmente.",
      },
    ],
    resumoCompreensao: "",
  };
}

const tiposDocumento: TipoDocumento[] = [
  "Convocatória",
  "Ata",
  "Orçamento",
  "Execução da Receita",
  "Execução da Despesa",
  "PPI",
  "Relatório",
  "Regulamento",
  "Contrato",
  "Proposta",
  "Declaração de voto",
  "Outro",
];

function DocumentReviewForm({
  analise,
  titulo,
  tipo,
  onTituloChange,
  onTipoChange,
}: {
  analise: AnaliseDocumentoInstitucional;
  titulo: string;
  tipo: TipoDocumento;
  onTituloChange: (value: string) => void;
  onTipoChange: (value: TipoDocumento) => void;
}) {
  return (
    <div className="space-y-5" data-review-destination="biblioteca">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Título do documento" value={titulo} onChange={onTituloChange} />
        <div className="space-y-2">
          <Label>Tipo documental</Label>
          <Select value={tipo} onValueChange={(value) => onTipoChange(value as TipoDocumento)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tiposDocumento.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {analise.resumoCompreensao && (
        <div className="rounded-xl border p-4">
          <p className="text-sm font-medium">Resumo</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {analise.resumoCompreensao}
          </p>
        </div>
      )}
      {analise.informacaoRelevante.length > 0 && (
        <div className="rounded-xl border p-4">
          <p className="text-sm font-medium">Informação relevante</p>
          <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
            {analise.informacaoRelevante.map((item) => (
              <li key={`${item.titulo}:${item.descricao}`}>
                <span className="font-medium text-foreground">{item.titulo}:</span> {item.descricao}
              </li>
            ))}
          </ul>
        </div>
      )}
      <ImpactoMandatoResumo impacto={analise.impactoMandato} />
      {analise.camposIncertos.length > 0 && (
        <div className="rounded-xl border border-status-alerta/30 p-4">
          <p className="text-sm font-medium">Dados que precisam de confirmação</p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {analise.camposIncertos.map((item) => (
              <li key={`${item.campo}:${item.motivo}`}>
                • {item.campo}: {item.motivo}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Destino</p>
        <p className="mt-1 font-medium">Este documento ficará organizado na Biblioteca.</p>
      </div>
    </div>
  );
}

export function ReviewForm({
  analise,
  onChange,
  titulo,
  tituloPersonalizado,
  onTituloAutomaticoChange,
  onTituloChange,
  validationErrors = {},
  onValidationErrorClear,
}: {
  analise: AnaliseDocumentoInstitucional;
  onChange: (value: AnaliseDocumentoInstitucional) => void;
  titulo: string;
  tituloPersonalizado: boolean;
  onTituloAutomaticoChange: (value: string) => void;
  onTituloChange: (value: string) => void;
  validationErrors?: ErrosCamposConfirmacaoSessao;
  onValidationErrorClear?: (campo: keyof ErrosCamposConfirmacaoSessao) => void;
}) {
  const sessao = analise.sessao ?? { tipo: "desconhecida" as const };
  const outrasIncertezas = analise.camposIncertos.filter(
    (item) =>
      !(["orgao", "data", "hora", "local"] as CampoSessaoEditavel[]).some(
        (campo) => obterIncertezaCampoSessao(analise, campo) === item,
      ),
  );
  const updateSession = (field: string, value: string) => {
    const campoSessao = ["orgao", "data", "hora", "local"].includes(field)
      ? (field as CampoSessaoEditavel)
      : undefined;
    const next = campoSessao
      ? corrigirCampoSessao(analise, campoSessao, value)
      : { ...analise, sessao: { ...sessao, [field]: value || undefined } };
    onChange(next);
    if (campoSessao && !obterIncertezaCampoSessao(next, campoSessao)) {
      onValidationErrorClear?.(campoSessao as keyof ErrosCamposConfirmacaoSessao);
    }
    if (["tipo", "entidade", "orgao", "data"].includes(field))
      onTituloAutomaticoChange(
        resolverTituloSessaoInstitucional({
          tituloAtual: titulo,
          personalizado: tituloPersonalizado,
          sessao: next.sessao,
        }),
      );
  };
  const pontos = analise.pontosOrdemTrabalhos;
  const move = (index: number, delta: number) => {
    const next = [...pontos];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange({ ...analise, pontosOrdemTrabalhos: next.map((p, i) => ({ ...p, numero: i + 1 })) });
  };
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Título da sessão" value={titulo} onChange={onTituloChange} />
        <Field
          label="Órgão"
          value={sessao.orgao ?? ""}
          onChange={(v) => updateSession("orgao", v)}
          uncertainty={obterIncertezaCampoSessao(analise, "orgao")?.motivo}
          error={validationErrors.orgao}
        />
        <Field
          label="Entidade"
          value={sessao.entidade ?? ""}
          onChange={(v) => updateSession("entidade", v)}
        />
        <div className="space-y-2">
          <Label>Tipo de sessão</Label>
          <Select
            value={sessao.tipo ?? "desconhecida"}
            onValueChange={(v) => updateSession("tipo", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ordinaria">Ordinária</SelectItem>
              <SelectItem value="extraordinaria">Extraordinária</SelectItem>
              <SelectItem value="desconhecida">Por confirmar</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Field
          label="Data"
          type="date"
          value={sessao.data ?? ""}
          onChange={(v) => updateSession("data", v)}
          uncertainty={obterIncertezaCampoSessao(analise, "data")?.motivo}
          error={validationErrors.data}
        />
        <Field
          label="Hora"
          type="time"
          value={sessao.hora ?? ""}
          onChange={(v) => updateSession("hora", v)}
          uncertainty={obterIncertezaCampoSessao(analise, "hora")?.motivo}
          error={validationErrors.hora}
        />
        <div className="space-y-2">
          <Label>
            Local
            {obterIncertezaCampoSessao(analise, "local") && (
              <span className="ml-2 text-xs font-medium text-amber-700 dark:text-amber-300">
                Confirmação necessária
              </span>
            )}
          </Label>
          <Textarea
            value={sessao.local ?? ""}
            rows={2}
            className={
              obterIncertezaCampoSessao(analise, "local")
                ? "border-amber-500 focus-visible:ring-amber-500/30"
                : undefined
            }
            onChange={(event) => updateSession("local", event.target.value)}
          />
          {obterIncertezaCampoSessao(analise, "local") && (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              {obterIncertezaCampoSessao(analise, "local")?.motivo}
            </p>
          )}
        </div>
      </div>
      {outrasIncertezas.length > 0 && (
        <div className="rounded-xl border border-status-alerta/30 p-4">
          <p className="text-sm font-medium">Confirme estes detalhes</p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {outrasIncertezas.map((item) => (
              <li key={`${item.campo}:${item.motivo}`}>
                • {item.campo}: {item.motivo}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Ordem de trabalhos</h3>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              onChange({
                ...analise,
                pontosOrdemTrabalhos: [
                  ...pontos,
                  { numero: pontos.length + 1, titulo: "", confianca: 1 },
                ],
              })
            }
          >
            <Plus className="h-4 w-4" /> Adicionar ponto
          </Button>
        </div>
        <div className="space-y-3">
          {pontos.map((ponto, index) => (
            <div
              key={index}
              className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[auto_1fr_auto]"
            >
              <span className="pt-2 text-sm text-muted-foreground">{index + 1}.</span>
              <div className="space-y-2">
                <Input
                  value={ponto.titulo}
                  placeholder="Título do ponto"
                  onChange={(e) => {
                    const next = [...pontos];
                    next[index] = { ...ponto, titulo: e.target.value };
                    onChange({ ...analise, pontosOrdemTrabalhos: next });
                  }}
                />
                <PontoDescricaoEditor
                  descricao={ponto.descricao ?? ""}
                  onChange={(value) => {
                    const next = [...pontos];
                    next[index] = { ...ponto, descricao: value || undefined };
                    onChange({ ...analise, pontosOrdemTrabalhos: next });
                  }}
                />
              </div>
              <div className="flex sm:flex-col">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={index === pontos.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    onChange({
                      ...analise,
                      pontosOrdemTrabalhos: pontos.filter((_, i) => i !== index),
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Próxima ação recomendada
        </p>
        <p className="mt-1 font-medium">Confirmar esta informação para preparar a sessão.</p>
      </div>
    </div>
  );
}

function PontoDescricaoEditor({
  descricao,
  onChange,
}: {
  descricao: string;
  onChange: (value: string) => void;
}) {
  const [aberta, setAberta] = useState(Boolean(descricao.trim()));
  const visivel = aberta || Boolean(descricao.trim());
  if (!visivel) {
    return (
      <Button size="sm" variant="ghost" className="w-fit" onClick={() => setAberta(true)}>
        Adicionar descrição
      </Button>
    );
  }
  return (
    <div className="space-y-1">
      <Textarea
        value={descricao}
        placeholder="Descrição opcional"
        onChange={(event) => onChange(event.target.value)}
      />
      {!descricao.trim() && (
        <Button size="sm" variant="ghost" onClick={() => setAberta(false)}>
          Ocultar descrição
        </Button>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  uncertainty,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  uncertainty?: string;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {uncertainty && (
          <span className="ml-2 text-xs font-medium text-amber-700 dark:text-amber-300">
            Confirmação necessária
          </span>
        )}
      </Label>
      <Input
        type={type}
        value={value}
        className={
          error
            ? "border-destructive focus-visible:ring-destructive/30"
            : uncertainty
              ? "border-amber-500 focus-visible:ring-amber-500/30"
              : undefined
        }
        aria-invalid={Boolean(error)}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : uncertainty ? (
        <p className="text-xs text-amber-700 dark:text-amber-300">{uncertainty}</p>
      ) : null}
    </div>
  );
}
function ErrorText({ text }: { text: string }) {
  return <p className="text-sm text-destructive">{text}</p>;
}
