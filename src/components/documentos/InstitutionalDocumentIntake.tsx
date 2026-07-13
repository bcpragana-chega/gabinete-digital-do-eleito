import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, FileSearch, Plus, Trash2 } from "lucide-react";
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
} from "@/lib/institutional-document-flow";
import type { AnaliseDocumentoInstitucional, Documento } from "@/lib/types";

type Step = "file" | "analysing" | "review" | "duplicate";

export function InstitutionalDocumentIntake({
  documentoInicial,
}: {
  documentoInicial?: Documento;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("file");
  const [file, setFile] = useState<File>();
  const [documento, setDocumento] = useState<Documento>();
  const [analise, setAnalise] = useState<AnaliseDocumentoInstitucional>();
  const [tituloSessao, setTituloSessao] = useState("");
  const [duplicateId, setDuplicateId] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function reset() {
    setStep("file");
    setFile(undefined);
    setDocumento(undefined);
    setAnalise(undefined);
    setTituloSessao("");
    setDuplicateId("");
    setError("");
    setSaving(false);
  }

  function changeOpen(value: boolean) {
    setOpen(value);
    if (!value) {
      reset();
      return;
    }
    if (documentoInicial) {
      setDocumento(documentoInicial);
      setAnalise(documentoInicial.analiseInstitucional ?? analiseVazia());
      const data = documentoInicial.analiseInstitucional?.sessao?.data;
      setTituloSessao(data ? `Sessão de ${data}` : "");
      setStep("review");
    }
  }

  async function uploadAndAnalyse() {
    if (!file) return;
    let uploadedDocument: Documento | undefined;
    setStep("analysing");
    setError("");
    try {
      const uploaded = await carregarDocumentoParaAnalise(file);
      uploadedDocument = uploaded;
      setDocumento(uploaded);
      const result = await analisarDocumentoCarregado(uploaded.id);
      setAnalise(result.analise);
      const data = result.analise.sessao?.data;
      setTituloSessao(data ? `Sessão de ${data}` : "");
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
    try {
      const result = await analisarDocumentoCarregado(documento.id);
      setAnalise(result.analise);
      setStep("review");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "A análise falhou.");
      setStep("review");
    }
  }

  async function confirm(mode: "criar" | "atualizar" | "criar_novo" = "criar") {
    if (!documento || !analise) return;
    if (!analise.sessao?.orgao || !analise.sessao.data || !analise.sessao.hora) {
      setError("Confirme o órgão, a data e a hora antes de preparar a sessão.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = await confirmarAnaliseDocumento({
        documentoId: documento.id,
        analise: { ...analise, tituloSessao },
        modo: mode === "criar_novo" ? "criar_novo" : mode,
        sessaoExistenteId: mode === "atualizar" ? duplicateId : undefined,
      });
      if (result.status === "duplicado") {
        setDuplicateId(result.sessaoId);
        setStep("duplicate");
        return;
      }
      sessionStorage.setItem(
        `tribuno:sessao-preparada:${result.sessaoId}`,
        String(analise.pontosOrdemTrabalhos.length),
      );
      setOpen(false);
      reset();
      await navigate({ to: "/sessoes/$id", params: { id: result.sessaoId } });
    } catch {
      setError("A criação da sessão falhou sem deixar alterações parciais.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button
          variant={documentoInicial ? "secondary" : "primary"}
          size={documentoInicial ? "sm" : "default"}
        >
          <FileSearch className="h-4 w-4" />
          {documentoInicial ? "Compreender" : "Compreender PDF"}
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[92dvh] max-w-3xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {step === "review" || step === "duplicate"
              ? analise?.tipoDocumento === "convocatoria"
                ? "Compreendi a convocatória"
                : "Compreendi o documento"
              : "Adicionar documento institucional"}
          </DialogTitle>
          <DialogDescription>
            {step === "analysing"
              ? "A identificar o contexto institucional e a preparar a próxima ação."
              : "O eleito confirma sempre a informação antes de ser criada uma sessão."}
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
                  Comece pelo ficheiro. Não precisa de preencher título, tipo, data ou sessão.
                </p>
              </div>
              {error && <ErrorText text={error} />}
              <Button className="w-full" disabled={!file} onClick={uploadAndAnalyse}>
                Adicionar e compreender
              </Button>
            </div>
          )}
          {step === "analysing" && (
            <div className="py-16 text-center">
              <FileSearch className="mx-auto h-10 w-10 animate-pulse text-primary" />
              <h3 className="mt-4 text-lg font-semibold">A compreender o documento…</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                A identificar o contexto institucional e a preparar a próxima ação.
              </p>
            </div>
          )}
          {step === "review" && analise && (
            <ReviewForm
              analise={analise}
              onChange={setAnalise}
              titulo={tituloSessao}
              onTituloChange={setTituloSessao}
            />
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
              <Button disabled={saving} onClick={() => confirm()}>
                {saving ? "A confirmar…" : "Confirmar e preparar sessão"}
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

function ReviewForm({
  analise,
  onChange,
  titulo,
  onTituloChange,
}: {
  analise: AnaliseDocumentoInstitucional;
  onChange: (value: AnaliseDocumentoInstitucional) => void;
  titulo: string;
  onTituloChange: (value: string) => void;
}) {
  const sessao = analise.sessao ?? { tipo: "desconhecida" as const };
  const updateSession = (field: string, value: string) =>
    onChange({ ...analise, sessao: { ...sessao, [field]: value || undefined } });
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
      <div className="rounded-xl bg-muted/50 p-4">
        <p className="text-sm">
          {analise.resumoCompreensao ||
            "Não consegui ler texto suficiente neste documento. Confirma os dados manualmente."}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Título da sessão" value={titulo} onChange={onTituloChange} />
        <Field
          label="Órgão"
          value={sessao.orgao ?? ""}
          onChange={(v) => updateSession("orgao", v)}
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
        />
        <Field
          label="Hora"
          type="time"
          value={sessao.hora ?? ""}
          onChange={(v) => updateSession("hora", v)}
        />
        <Field
          label="Local"
          value={sessao.local ?? ""}
          onChange={(v) => updateSession("local", v)}
        />
      </div>
      {analise.camposIncertos.length > 0 && (
        <div className="rounded-xl border border-status-alerta/30 p-4">
          <p className="text-sm font-medium">Preciso de confirmar estes detalhes</p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {analise.camposIncertos.map((item) => (
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
                <Textarea
                  value={ponto.descricao ?? ""}
                  placeholder="Descrição opcional"
                  onChange={(e) => {
                    const next = [...pontos];
                    next[index] = { ...ponto, descricao: e.target.value };
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

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
function ErrorText({ text }: { text: string }) {
  return <p className="text-sm text-destructive">{text}</p>;
}
