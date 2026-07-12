import { useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle, FileUp, Loader2, Plus, Trash2 } from "lucide-react";
import { analisarConvocatoriaPdf } from "@/lib/ai/convocatoria-extractor.server";
import type { ConvocatoriaPreview } from "@/lib/ai/convocatoria-types";
import {
  detectarDuplicadoConvocatoria,
  validarFicheiroConvocatoria,
} from "@/lib/ai/convocatoria-validator";
import { useAuth } from "@/lib/auth-store";
import {
  adicionarAssembleia,
  apagarAssembleia,
  listarAssembleias,
} from "@/lib/assembleias-store";
import { adicionarDocumentoComUpload } from "@/lib/documentos-store";
import { adicionarPonto, removerPonto } from "@/lib/pontos-store";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

type EstadoFluxo = "upload" | "analise" | "preview" | "criacao" | "sucesso";

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("FILE_READ_FAILED"));
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      resolve(result.includes(",") ? result.split(",").pop() ?? "" : result);
    };
    reader.readAsDataURL(file);
  });
}

function emptyPreview(): ConvocatoriaPreview {
  return {
    orgao: "",
    bodyType: "UNKNOWN",
    tipoSessao: "Ordinária",
    titulo: "",
    data: "",
    hora: "",
    local: "",
    pontos: [],
    observacoes: [],
    avisos: [],
  };
}

function nomeDocumentoConvocatoria(preview: ConvocatoriaPreview) {
  const data = preview.data ? ` ${preview.data}` : "";
  return `Convocatória${data}`.trim();
}

export function CriarSessaoPorConvocatoriaDialog() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [estado, setEstado] = useState<EstadoFluxo>("upload");
  const [file, setFile] = useState<File | undefined>();
  const [preview, setPreview] = useState<ConvocatoriaPreview>(() => emptyPreview());
  const [erro, setErro] = useState<string | undefined>();
  const [duplicateConfirmed, setDuplicateConfirmed] = useState(false);

  const duplicado = useMemo(
    () =>
      estado === "preview" && preview.data
        ? detectarDuplicadoConvocatoria(preview, listarAssembleias())
        : undefined,
    [estado, preview],
  );

  function reset() {
    setEstado("upload");
    setFile(undefined);
    setPreview(emptyPreview());
    setErro(undefined);
    setDuplicateConfirmed(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function fechar(value: boolean) {
    setOpen(value);
    if (!value) reset();
  }

  async function analisar(fileToAnalyze: File) {
    const fileError = validarFicheiroConvocatoria(fileToAnalyze);
    if (fileError) {
      setErro(fileError.message);
      return;
    }
    if (!user?.id) {
      setErro("Inicie sessão antes de criar uma sessão por convocatória.");
      return;
    }

    setFile(fileToAnalyze);
    setErro(undefined);
    setEstado("analise");

    try {
      const fileBase64 = await fileToBase64(fileToAnalyze);
      const result = await analisarConvocatoriaPdf({
        data: {
          userId: user.id,
          fileName: fileToAnalyze.name,
          mimeType: fileToAnalyze.type,
          fileSize: fileToAnalyze.size,
          fileBase64,
        },
      });

      if (!result.ok) {
        setEstado("upload");
        setErro(result.message);
        return;
      }

      setPreview(result.preview);
      setEstado("preview");
    } catch {
      setEstado("upload");
      setErro("Não foi possível analisar a convocatória. Tente novamente ou crie a sessão manualmente.");
    }
  }

  async function criarSessao() {
    if (!file) return;
    if (!preview.titulo.trim() || !preview.data) {
      setErro("Confirme pelo menos o título e a data da sessão.");
      return;
    }
    if (duplicado && !duplicateConfirmed) {
      setErro("Já existe uma sessão semelhante. Confirme se pretende criar mesmo assim.");
      return;
    }

    setEstado("criacao");
    setErro(undefined);
    const pontosCriados: string[] = [];
    let sessaoId: string | undefined;

    try {
      const sessao = adicionarAssembleia({
        nome: preview.titulo.trim(),
        tipo: preview.tipoSessao,
        orgao: preview.orgao.trim(),
        data: preview.data,
        hora: preview.hora,
        local: preview.local.trim(),
        estado: "preparacao",
        notas: [
          preview.numero ? `Número da sessão: ${preview.numero}` : "",
          preview.convocante ? `Convocante: ${preview.convocante}` : "",
          ...preview.observacoes,
        ]
          .filter(Boolean)
          .join("\n"),
      });
      sessaoId = sessao.id;

      preview.pontos.forEach((ponto) => {
        const criado = adicionarPonto(sessao.id, {
          titulo: ponto.title.trim(),
          descricao: ponto.description.trim() || ponto.originalText?.trim() || "",
          prioridade: "Média",
        });
        pontosCriados.push(criado.id);
      });

      await adicionarDocumentoComUpload({
        assembleiaId: sessao.id,
        titulo: nomeDocumentoConvocatoria(preview),
        tipo: "Convocatória",
        data: preview.data,
        estado: "Por rever",
        origem: "upload",
        ficheiro: file,
        resumo: "Convocatória analisada automaticamente para criação de sessão.",
        textoExtraido: preview.pontos
          .map((ponto) => `${ponto.order}. ${ponto.originalText || ponto.title}`)
          .join("\n"),
        notas: JSON.stringify(
          {
            origemFluxo: "convocatoria_import_v1",
            orgao: preview.orgao,
            tipoSessao: preview.tipoSessao,
            numero: preview.numero,
            convocante: preview.convocante,
            avisos: preview.avisos,
          },
          null,
          2,
        ),
        tags: ["convocatoria", "sessao-importada"],
      });

      setEstado("sucesso");
      setTimeout(() => {
        fechar(false);
        navigate({ to: "/sessoes/$id", params: { id: sessao.id } });
      }, 450);
    } catch {
      pontosCriados.forEach((id) => removerPonto(id));
      if (sessaoId) apagarAssembleia(sessaoId);
      setEstado("preview");
      setErro("Não foi possível criar a sessão a partir da convocatória.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={fechar}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="w-full sm:w-auto">
          <FileUp className="h-4 w-4" />
          Criar sessão por convocatória
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Criar sessão por convocatória</DialogTitle>
          <DialogDescription>
            Carregue um PDF, confirme os dados extraídos e crie a sessão apenas no fim.
          </DialogDescription>
        </DialogHeader>

        {erro && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Não foi possível continuar</AlertTitle>
            <AlertDescription>{erro}</AlertDescription>
          </Alert>
        )}

        {estado === "upload" && (
          <div
            className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const dropped = event.dataTransfer.files.item(0);
              if (dropped) void analisar(dropped);
            }}
          >
            <FileUp className="mx-auto h-8 w-8 text-muted-foreground" strokeWidth={1.75} />
            <p className="mt-3 text-sm font-medium text-foreground">
              Selecione ou arraste uma convocatória em PDF
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              A sessão só será criada depois da sua confirmação.
            </p>
            <Input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              className="mt-5"
              onChange={(event) => {
                const selected = event.target.files?.item(0);
                if (selected) void analisar(selected);
              }}
            />
          </div>
        )}

        {estado === "analise" && (
          <div className="flex items-center gap-3 rounded-lg border border-border p-4 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            A analisar a convocatória...
          </div>
        )}

        {(estado === "preview" || estado === "criacao" || estado === "sucesso") && (
          <div className="space-y-5">
            {duplicado && !duplicateConfirmed && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Possível sessão duplicada</AlertTitle>
                <AlertDescription>
                  Já existe uma sessão semelhante: {duplicado.nome}. Confirme antes de criar outra.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Órgão">
                <Input
                  value={preview.orgao}
                  onChange={(event) => setPreview({ ...preview, orgao: event.target.value })}
                />
              </Field>
              <Field label="Tipo de sessão">
                <Select
                  value={preview.tipoSessao}
                  onValueChange={(value) =>
                    setPreview({
                      ...preview,
                      tipoSessao: value as ConvocatoriaPreview["tipoSessao"],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ordinária">Ordinária</SelectItem>
                    <SelectItem value="Extraordinária">Extraordinária</SelectItem>
                    <SelectItem value="Outra">Outra</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Título">
                <Input
                  value={preview.titulo}
                  onChange={(event) => setPreview({ ...preview, titulo: event.target.value })}
                />
              </Field>
              <Field label="Número">
                <Input
                  value={preview.numero ?? ""}
                  onChange={(event) => setPreview({ ...preview, numero: event.target.value })}
                />
              </Field>
              <Field label="Data">
                <Input
                  type="date"
                  value={preview.data}
                  onChange={(event) => setPreview({ ...preview, data: event.target.value })}
                />
              </Field>
              <Field label="Hora">
                <Input
                  type="time"
                  value={preview.hora}
                  onChange={(event) => setPreview({ ...preview, hora: event.target.value })}
                />
              </Field>
              <Field label="Local">
                <Input
                  value={preview.local}
                  onChange={(event) => setPreview({ ...preview, local: event.target.value })}
                />
              </Field>
              <Field label="Convocante">
                <Input
                  value={preview.convocante ?? ""}
                  onChange={(event) => setPreview({ ...preview, convocante: event.target.value })}
                />
              </Field>
            </div>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-foreground">Ordem de trabalhos</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPreview({
                      ...preview,
                      pontos: [
                        ...preview.pontos,
                        { order: preview.pontos.length + 1, title: "", description: "" },
                      ],
                    })
                  }
                >
                  <Plus className="h-4 w-4" />
                  Ponto
                </Button>
              </div>
              <div className="space-y-3">
                {preview.pontos.map((ponto, index) => (
                  <div key={`${ponto.order}-${index}`} className="rounded-lg border border-border p-3">
                    <div className="flex items-start gap-3">
                      <span className="mt-2 w-6 text-sm font-medium text-muted-foreground">
                        {index + 1}.
                      </span>
                      <div className="min-w-0 flex-1 space-y-2">
                        <Input
                          value={ponto.title}
                          onChange={(event) => {
                            const pontos = [...preview.pontos];
                            pontos[index] = { ...ponto, title: event.target.value };
                            setPreview({ ...preview, pontos });
                          }}
                        />
                        <Textarea
                          value={ponto.description}
                          onChange={(event) => {
                            const pontos = [...preview.pontos];
                            pontos[index] = { ...ponto, description: event.target.value };
                            setPreview({ ...preview, pontos });
                          }}
                          rows={2}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setPreview({
                            ...preview,
                            pontos: preview.pontos.filter((_, pontoIndex) => pontoIndex !== index),
                          })
                        }
                        aria-label="Remover ponto"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <Field label="Observações">
              <Textarea
                value={preview.observacoes.join("\n")}
                onChange={(event) =>
                  setPreview({
                    ...preview,
                    observacoes: event.target.value.split("\n").map((line) => line.trim()).filter(Boolean),
                  })
                }
                rows={3}
              />
            </Field>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={() => fechar(false)}>
                Cancelar
              </Button>
              {duplicado && !duplicateConfirmed && (
                <Button type="button" variant="outline" onClick={() => setDuplicateConfirmed(true)}>
                  Criar mesmo assim
                </Button>
              )}
              <Button type="button" onClick={criarSessao} disabled={estado === "criacao"}>
                {estado === "criacao" && <Loader2 className="h-4 w-4 animate-spin" />}
                {estado === "sucesso" ? "Sessão criada" : "Criar sessão"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
