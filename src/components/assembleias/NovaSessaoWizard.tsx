import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Landmark,
  ListChecks,
  Plus,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { adicionarAssembleia } from "@/lib/assembleias-store";
import { adicionarDocumentoConfirmado } from "@/lib/documentos-store";
import { guardarEstrategiaDaAssembleia } from "@/lib/estrategia-store";
import { adicionarPonto, type NivelPrioridade } from "@/lib/pontos-store";
import {
  carregarTentativaCriacaoSessao,
  executarTentativaCriacaoSessao,
  guardarTentativaCriacaoSessao,
  removerTentativaCriacaoSessao,
  type TentativaCriacaoSessao,
} from "@/lib/session-creation-attempt";
import { obterUtilizadorSupabaseValidado } from "@/lib/supabase";
import { obterUserIdAtual } from "@/lib/user-storage";
import { Button } from "@/components/ui/button";
import { EntityCard, InfoCard } from "@/components/ui/cards";
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

type DocumentoTemporario = {
  id: string;
  titulo: string;
  tipo: TipoDocumento;
  data: string;
  estado: EstadoDocumento;
  notas: string;
  ficheiroNome?: string;
  ficheiroTipo?: string;
};

type PontoTemporario = {
  id: string;
  titulo: string;
  descricao: string;
  prioridade: NivelPrioridade;
};

type DraftCriacaoSessao = {
  titulo: string;
  tipoSessao: (typeof tiposSessao)[number];
  data: string;
  hora: string;
  local: string;
  documentos: DocumentoTemporario[];
  pontos: PontoTemporario[];
  objetivoPolitico: string;
  linhaGeral: string;
  riscos: string;
};

const passos = ["Dados", "Documentos", "Pontos", "Estratégia", "Revisão"];

const tiposSessao = ["Ordinária", "Extraordinária", "Reunião de câmara", "Outra"] as const;
const tiposDocumento: TipoDocumento[] = [
  "Convocatória",
  "Ata",
  "Orçamento",
  "Relatório",
  "Regulamento",
  "Contrato",
  "Outro",
];

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

function novoDocumentoTemporario(): DocumentoTemporario {
  return {
    id: "",
    titulo: "",
    tipo: "Convocatória",
    data: hoje(),
    estado: "Por rever",
    notas: "",
  };
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

export function NovaSessaoWizard() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [titulo, setTitulo] = useState("");
  const [tipoSessao, setTipoSessao] = useState<(typeof tiposSessao)[number]>("Ordinária");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [local, setLocal] = useState("");
  const [documentos, setDocumentos] = useState<DocumentoTemporario[]>([]);
  const [documentoEmEdicao, setDocumentoEmEdicao] = useState(false);
  const [documento, setDocumento] = useState<DocumentoTemporario>(() => novoDocumentoTemporario());
  const [pontos, setPontos] = useState<PontoTemporario[]>([]);
  const [ponto, setPonto] = useState<PontoTemporario>({
    id: "",
    titulo: "",
    descricao: "",
    prioridade: "Média",
  });
  const [objetivoPolitico, setObjetivoPolitico] = useState("");
  const [linhaGeral, setLinhaGeral] = useState("");
  const [riscos, setRiscos] = useState("");
  const [aGuardar, setAGuardar] = useState(false);
  const [erroGuardar, setErroGuardar] = useState("");
  const guardarEmCurso = useRef(false);
  const tentativaRef = useRef<TentativaCriacaoSessao | undefined>(undefined);

  const dadosValidos = Boolean(titulo.trim() && data && hora && local.trim());
  const nomeSessao = `Sessão ${tipoSessao.toLowerCase()} — ${titulo.trim()}`;

  function reset() {
    setStep(0);
    setTitulo("");
    setTipoSessao("Ordinária");
    setData("");
    setHora("");
    setLocal("");
    setDocumentos([]);
    setDocumentoEmEdicao(false);
    setDocumento(novoDocumentoTemporario());
    setPontos([]);
    setPonto({ id: "", titulo: "", descricao: "", prioridade: "Média" });
    setObjetivoPolitico("");
    setLinhaGeral("");
    setRiscos("");
    setErroGuardar("");
    tentativaRef.current = undefined;
  }

  function obterDraft(): DraftCriacaoSessao {
    return {
      titulo,
      tipoSessao,
      data,
      hora,
      local,
      documentos,
      pontos,
      objetivoPolitico,
      linhaGeral,
      riscos,
    };
  }

  function restaurarTentativaPendente() {
    const ownerId = obterUserIdAtual();
    if (!ownerId) return;
    const persistida = carregarTentativaCriacaoSessao<DraftCriacaoSessao>(ownerId);
    if (!persistida) return;
    const draft = persistida.draft;
    tentativaRef.current = persistida.tentativa;
    setTitulo(draft.titulo);
    setTipoSessao(draft.tipoSessao);
    setData(draft.data);
    setHora(draft.hora);
    setLocal(draft.local);
    setDocumentos(draft.documentos);
    setPontos(draft.pontos);
    setObjetivoPolitico(draft.objetivoPolitico);
    setLinhaGeral(draft.linhaGeral);
    setRiscos(draft.riscos);
    setStep(passos.length - 1);
    setErroGuardar(
      persistida.tentativa.sessaoConfirmada
        ? "A sessão foi criada, mas ainda existem dados por confirmar. Podes retomar agora."
        : "Existe uma tentativa de criação por concluir. Podes retomar agora.",
    );
  }

  function abrirFormularioDocumento() {
    setDocumento(novoDocumentoTemporario());
    setDocumentoEmEdicao(true);
  }

  function fecharFormularioDocumento() {
    setDocumento(novoDocumentoTemporario());
    setDocumentoEmEdicao(false);
  }

  function guardarDocumentoTemporario() {
    if (!documento.titulo.trim()) return false;

    setDocumentos((atuais) => [
      ...atuais,
      { ...documento, id: crypto.randomUUID(), titulo: documento.titulo.trim() },
    ]);
    fecharFormularioDocumento();
    return true;
  }

  function removerDocumentoTemporario(id: string) {
    setDocumentos((atuais) => atuais.filter((item) => item.id !== id));
  }

  function adicionarPontoTemporario() {
    if (!ponto.titulo.trim()) return;
    setPontos((atuais) => [
      ...atuais,
      { ...ponto, id: `ponto-${crypto.randomUUID()}`, titulo: ponto.titulo.trim() },
    ]);
    setPonto({ id: "", titulo: "", descricao: "", prioridade: "Média" });
  }

  async function criarSessao() {
    if (!dadosValidos || guardarEmCurso.current) return;
    guardarEmCurso.current = true;
    setAGuardar(true);
    setErroGuardar("");
    try {
      const owner = await obterUtilizadorSupabaseValidado();
      if (!owner?.id) throw new Error("AUTH_REQUIRED");
      const draft = obterDraft();
      const tentativa =
        tentativaRef.current ??
        ({
          tentativaId: crypto.randomUUID(),
          sessaoId: `asm-${crypto.randomUUID()}`,
          sessaoConfirmada: false,
          pontosConfirmados: new Set<string>(),
          documentosConfirmados: new Set<string>(),
        } satisfies TentativaCriacaoSessao);
      tentativaRef.current = tentativa;
      guardarTentativaCriacaoSessao(owner.id, tentativa, draft);

      const resultado = await executarTentativaCriacaoSessao({
        tentativa,
        pontos: pontos.map((item) => ({ id: item.id, value: item })),
        documentos: documentos.map((item) => ({ id: item.id, value: item })),
        criarSessao: (sessaoId) =>
          adicionarAssembleia(
            {
              nome: nomeSessao,
              data,
              hora,
              local: local.trim(),
              estado: "preparacao",
            },
            { id: sessaoId },
          ),
        criarPonto: (sessaoId, item, pontoId) =>
          adicionarPonto(
            sessaoId,
            {
              titulo: item.titulo,
              descricao: item.descricao.trim(),
              prioridade: item.prioridade,
            },
            { id: pontoId },
          ),
        criarDocumento: (sessaoId, item, documentoId) =>
          adicionarDocumentoConfirmado(
            {
              assembleiaId: sessaoId,
              titulo: item.titulo,
              tipo: item.tipo,
              data: item.data || data,
              estado: item.estado,
              notas: item.notas.trim() || undefined,
              ficheiroNome: item.ficheiroNome,
              ficheiroTipo: item.ficheiroTipo,
            },
            { id: documentoId },
          ),
        onProgress: (atualizada) => guardarTentativaCriacaoSessao(owner.id, atualizada, draft),
      });
      if (!resultado.concluida) {
        guardarTentativaCriacaoSessao(owner.id, resultado.tentativa, draft);
        setErroGuardar(
          resultado.tentativa.sessaoConfirmada
            ? "A sessão foi criada, mas não foi possível guardar toda a preparação. Os dados pendentes foram mantidos; tenta novamente."
            : "Não foi possível confirmar a sessão. Os dados foram mantidos; tenta novamente.",
        );
        return;
      }
      const sessaoId = resultado.tentativa.sessaoId;

      if (objetivoPolitico.trim() || linhaGeral.trim() || riscos.trim()) {
        guardarEstrategiaDaAssembleia(sessaoId, {
          objetivoPolitico: objetivoPolitico.trim(),
          mensagemPrincipal: linhaGeral.trim(),
          naoFazer: riscos.trim(),
          adversariosPrevisiveis: "",
          notasLivres: "",
        });
      }

      removerTentativaCriacaoSessao(owner.id);
      setOpen(false);
      reset();
      await navigate({ to: "/sessoes/$id", params: { id: sessaoId } });
    } catch {
      setErroGuardar(
        tentativaRef.current?.sessaoConfirmada
          ? "A sessão foi criada, mas não foi possível guardar toda a preparação. Os dados pendentes foram mantidos; tenta novamente."
          : "Não foi possível confirmar a sessão. Os dados foram mantidos; tenta novamente.",
      );
    } finally {
      guardarEmCurso.current = false;
      setAGuardar(false);
    }
  }

  function avancar() {
    if (step === 0 && !dadosValidos) return;
    if (step === 1 && documentoEmEdicao && documento.titulo.trim()) {
      guardarDocumentoTemporario();
    }
    setStep((atual) => Math.min(atual + 1, passos.length - 1));
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value && aGuardar) return;
        setOpen(value);
        if (!value && !aGuardar) reset();
        if (value) restaurarTentativaPendente();
      }}
    >
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Nova sessão
        </Button>
      </DialogTrigger>

      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-full max-w-none flex-col gap-0 rounded-none border-border bg-background p-0 sm:h-[92dvh] sm:max-h-[92dvh] sm:w-[min(980px,calc(100vw-2rem))] sm:rounded-3xl">
        <DialogHeader className="shrink-0 border-b border-border/70 px-5 py-4 text-left sm:px-7">
          <DialogTitle>Nova sessão</DialogTitle>
          <DialogDescription>Crie a sessão passo a passo.</DialogDescription>
          <div className="pt-4">
            <Progress step={step} />
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          {step === 0 && (
            <div className="space-y-5">
              <StepTitle
                title="Passo 1 — Dados da Sessão"
                question="Quais são os dados principais?"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="nova-sessao-titulo">Título</Label>
                  <Input
                    id="nova-sessao-titulo"
                    value={titulo}
                    onChange={(event) => setTitulo(event.target.value)}
                    placeholder="Ex.: Orçamento Suplementar"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de sessão</Label>
                  <Select
                    value={tipoSessao}
                    onValueChange={(value) => setTipoSessao(value as typeof tipoSessao)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposSessao.map((tipo) => (
                        <SelectItem key={tipo} value={tipo}>
                          {tipo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nova-sessao-data">Data</Label>
                  <Input
                    id="nova-sessao-data"
                    type="date"
                    value={data}
                    onChange={(event) => setData(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nova-sessao-hora">Hora</Label>
                  <Input
                    id="nova-sessao-hora"
                    type="time"
                    value={hora}
                    onChange={(event) => setHora(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nova-sessao-local">Local</Label>
                  <Input
                    id="nova-sessao-local"
                    value={local}
                    onChange={(event) => setLocal(event.target.value)}
                    placeholder="Ex.: Salão Nobre"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <StepTitle title="Passo 2 — Documentos" question="Quer adicionar documentos agora?" />

              {!documentoEmEdicao && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={abrirFormularioDocumento}
                  className="w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar documento
                </Button>
              )}

              {documentoEmEdicao && (
                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="novo-documento-titulo">Título do documento</Label>
                      <Input
                        id="novo-documento-titulo"
                        value={documento.titulo}
                        onChange={(event) =>
                          setDocumento({ ...documento, titulo: event.target.value })
                        }
                        placeholder="Ex.: Convocatória"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select
                        value={documento.tipo}
                        onValueChange={(value) =>
                          setDocumento({ ...documento, tipo: value as TipoDocumento })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {tiposDocumento.map((tipo) => (
                            <SelectItem key={tipo} value={tipo}>
                              {tipo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="novo-documento-data">Data</Label>
                      <Input
                        id="novo-documento-data"
                        type="date"
                        value={documento.data}
                        onChange={(event) =>
                          setDocumento({ ...documento, data: event.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="novo-documento-ficheiro">Ficheiro</Label>
                      <Input
                        id="novo-documento-ficheiro"
                        type="file"
                        onChange={(event) => {
                          const ficheiro = event.target.files?.[0];
                          setDocumento({
                            ...documento,
                            ficheiroNome: ficheiro?.name,
                            ficheiroTipo: ficheiro?.type,
                          });
                        }}
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="novo-documento-notas">Notas</Label>
                      <Textarea
                        id="novo-documento-notas"
                        value={documento.notas}
                        onChange={(event) =>
                          setDocumento({ ...documento, notas: event.target.value })
                        }
                        rows={2}
                        placeholder="Opcional"
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={fecharFormularioDocumento}
                      className="w-full sm:w-auto"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={guardarDocumentoTemporario}
                      disabled={!documento.titulo.trim()}
                      className="w-full sm:w-auto"
                    >
                      Guardar documento
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid gap-3">
                {documentos.length === 0 ? (
                  <InfoCard
                    icon={FileText}
                    title="Sem documentos adicionados"
                    description="Pode avançar e adicionar documentos mais tarde."
                  />
                ) : (
                  documentos.map((item) => (
                    <div
                      key={item.id}
                      className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                          <FileText className="h-4 w-4" strokeWidth={1.75} />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-foreground">{item.titulo}</div>
                          <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                            {[item.tipo, item.ficheiroNome, item.notas].filter(Boolean).join(" · ")}
                          </div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => removerDocumentoTemporario(item.id)}
                        className="w-full text-destructive hover:text-destructive sm:w-auto"
                        aria-label={`Remover ${item.titulo}`}
                      >
                        <Trash2 className="h-4 w-4" />
                        Remover
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <StepTitle
                title="Passo 3 — Pontos da Ordem de Trabalhos"
                question="Quer adicionar pontos agora?"
              />
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Título do ponto</Label>
                    <Input
                      value={ponto.titulo}
                      onChange={(event) => setPonto({ ...ponto, titulo: event.target.value })}
                      placeholder="Ex.: Iluminação pública"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Prioridade</Label>
                    <Select
                      value={ponto.prioridade}
                      onValueChange={(value) =>
                        setPonto({ ...ponto, prioridade: value as NivelPrioridade })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Alta">Alta</SelectItem>
                        <SelectItem value="Média">Média</SelectItem>
                        <SelectItem value="Baixa">Baixa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Descrição</Label>
                    <Textarea
                      value={ponto.descricao}
                      onChange={(event) => setPonto({ ...ponto, descricao: event.target.value })}
                      rows={2}
                      placeholder="Opcional"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={adicionarPontoTemporario}
                  className="mt-4 w-full sm:w-auto"
                >
                  Adicionar ponto
                </Button>
              </div>
              <div className="grid gap-3">
                {pontos.length === 0 ? (
                  <InfoCard
                    icon={ListChecks}
                    title="Sem pontos adicionados"
                    description="Pode avançar e preparar pontos mais tarde."
                  />
                ) : (
                  pontos.map((item) => (
                    <EntityCard
                      key={item.id}
                      icon={ListChecks}
                      title={item.titulo}
                      description={item.descricao || item.prioridade}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <StepTitle
                title="Passo 4 — Estratégia inicial"
                question="Qual é a orientação inicial?"
              />
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Objetivo político</Label>
                  <Textarea
                    value={objetivoPolitico}
                    onChange={(event) => setObjetivoPolitico(event.target.value)}
                    rows={3}
                    placeholder="O que quer alcançar?"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Linha geral</Label>
                  <Textarea
                    value={linhaGeral}
                    onChange={(event) => setLinhaGeral(event.target.value)}
                    rows={3}
                    placeholder="Qual é a mensagem principal?"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Riscos e alertas</Label>
                  <Textarea
                    value={riscos}
                    onChange={(event) => setRiscos(event.target.value)}
                    rows={3}
                    placeholder="O que exige atenção?"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <StepTitle title="Passo 5 — Revisão" question="Confirme antes de criar a sessão." />
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoCard
                  icon={Landmark}
                  title="Sessão"
                  description={dadosValidos ? nomeSessao : "Dados por preencher"}
                />
                <InfoCard
                  icon={CalendarDays}
                  title="Data e hora"
                  description={data && hora ? `${data} · ${hora}` : "Por preencher"}
                />
                <InfoCard
                  icon={FileText}
                  title="Documentos"
                  description={`${documentos.length} adicionados`}
                />
                <InfoCard
                  icon={ListChecks}
                  title="Pontos"
                  description={`${pontos.length} adicionados`}
                />
                <InfoCard
                  icon={ShieldAlert}
                  title="Estratégia"
                  description={
                    objetivoPolitico || linhaGeral || riscos
                      ? "Com orientação inicial"
                      : "Sem estratégia inicial"
                  }
                  className="sm:col-span-2"
                />
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
                onClick={criarSessao}
                disabled={!dadosValidos || aGuardar}
                className="w-full sm:w-auto"
              >
                <CheckCircle2 className="h-4 w-4" />
                {aGuardar ? "A guardar…" : "Criar Sessão"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
