import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CalendarPlus, Plus } from "lucide-react";
import { adicionarAssembleia } from "@/lib/assembleias-store";
import {
  carregarTentativaCriacaoSessao,
  executarTentativaCriacaoSessao,
  guardarTentativaCriacaoSessao,
  removerTentativaCriacaoSessao,
  type TentativaCriacaoSessao,
} from "@/lib/session-creation-attempt";
import { gerarTituloSessaoManual } from "@/lib/institutional-session-title";
import { obterUtilizadorSupabaseValidado } from "@/lib/supabase";
import { obterUserIdAtual } from "@/lib/user-storage";
import { InstitutionalDocumentIntake } from "@/components/documentos/InstitutionalDocumentIntake";
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

const tiposSessao = ["Ordinária", "Extraordinária", "Reunião de câmara", "Outra"] as const;
type TipoSessao = (typeof tiposSessao)[number];

type DraftCriacaoSessao = {
  tipoSessao: TipoSessao;
  data: string;
  hora: string;
  local: string;
  tituloAdicional?: string;
  titulo?: string;
};

export function NovaSessaoWizard({
  triggerLabel = "Preparar próxima sessão",
}: {
  triggerLabel?: string;
} = {}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [tipoSessao, setTipoSessao] = useState<TipoSessao>("Ordinária");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [local, setLocal] = useState("");
  const [tituloAdicional, setTituloAdicional] = useState("");
  const [aGuardar, setAGuardar] = useState(false);
  const [erroGuardar, setErroGuardar] = useState("");
  const guardarEmCurso = useRef(false);
  const tentativaRef = useRef<TentativaCriacaoSessao | undefined>(undefined);

  const dadosValidos = Boolean(data && hora && local.trim());
  const nomeSessao = gerarTituloSessaoManual({ tipoSessao, data, tituloAdicional });

  function reset() {
    setTipoSessao("Ordinária");
    setData("");
    setHora("");
    setLocal("");
    setTituloAdicional("");
    setErroGuardar("");
    tentativaRef.current = undefined;
  }

  function obterDraft(): DraftCriacaoSessao {
    return { tipoSessao, data, hora, local, tituloAdicional };
  }

  function restaurarTentativaPendente() {
    const ownerId = obterUserIdAtual();
    if (!ownerId) return;
    const persistida = carregarTentativaCriacaoSessao<DraftCriacaoSessao>(ownerId);
    if (!persistida) return;
    const draft = persistida.draft;
    tentativaRef.current = persistida.tentativa;
    setTipoSessao(tiposSessao.includes(draft.tipoSessao) ? draft.tipoSessao : "Ordinária");
    setData(draft.data ?? "");
    setHora(draft.hora ?? "");
    setLocal(draft.local ?? "");
    setTituloAdicional(draft.tituloAdicional ?? draft.titulo ?? "");
    setErroGuardar(
      persistida.tentativa.sessaoConfirmada
        ? "A sessão foi criada. Conclua esta tentativa para abrir o workspace."
        : "Existe uma tentativa de criação por concluir. Pode tentar novamente.",
    );
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
        pontos: [],
        documentos: [],
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
        criarPonto: async () => undefined,
        criarDocumento: async () => undefined,
        onProgress: (atualizada) => guardarTentativaCriacaoSessao(owner.id, atualizada, draft),
      });

      if (!resultado.concluida) {
        guardarTentativaCriacaoSessao(owner.id, resultado.tentativa, draft);
        setErroGuardar(
          "Não foi possível criar a sessão. Os dados foram mantidos; tente novamente.",
        );
        return;
      }

      const sessaoId = resultado.tentativa.sessaoId;
      removerTentativaCriacaoSessao(owner.id);
      setOpen(false);
      reset();
      await navigate({ to: "/sessoes/$id", params: { id: sessaoId } });
    } catch {
      setErroGuardar("Não foi possível criar a sessão. Os dados foram mantidos; tente novamente.");
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
        if (value) restaurarTentativaPendente();
      }}
    >
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>

      <DialogContent className="flex max-h-[100dvh] w-full max-w-none flex-col gap-0 overflow-hidden rounded-none border-border bg-background p-0 sm:max-h-[92dvh] sm:w-[min(720px,calc(100vw-2rem))] sm:rounded-3xl">
        <DialogHeader className="shrink-0 border-b border-border/70 px-5 py-4 text-left sm:px-7">
          <DialogTitle>Preparar próxima sessão</DialogTitle>
          <DialogDescription>
            Se já recebeu a convocatória, o Tribuno pode organizar a sessão automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4">
            <p className="text-sm font-semibold text-foreground">Começar pela convocatória</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Carregue o PDF para o Tribuno identificar os dados e a ordem de trabalhos.
            </p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Pode corrigir os dados extraídos antes de confirmar a sessão.
            </p>
            <div className="mt-3">
              <InstitutionalDocumentIntake triggerLabel="Carregar convocatória" />
            </div>
          </div>

          <div className="my-5 flex items-center gap-3" aria-hidden="true">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              ou
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form
            id="form-criar-sessao-manual"
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void criarSessao();
            }}
          >
            <div>
              <h3 className="font-display text-lg font-semibold text-foreground">
                Criar manualmente
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Registe apenas os dados essenciais. Pode preparar o resto no workspace da sessão.
              </p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                A sessão só será criada quando selecionar “Criar sessão”.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="nova-sessao-tipo">Tipo de sessão</Label>
                <Select
                  value={tipoSessao}
                  onValueChange={(value) => setTipoSessao(value as TipoSessao)}
                >
                  <SelectTrigger id="nova-sessao-tipo">
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
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nova-sessao-hora">Hora</Label>
                <Input
                  id="nova-sessao-hora"
                  type="time"
                  value={hora}
                  onChange={(event) => setHora(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="nova-sessao-local">Local</Label>
                <Input
                  id="nova-sessao-local"
                  value={local}
                  onChange={(event) => setLocal(event.target.value)}
                  placeholder="Ex.: Salão Nobre"
                  required
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="nova-sessao-titulo-adicional">Título adicional (opcional)</Label>
                <Input
                  id="nova-sessao-titulo-adicional"
                  value={tituloAdicional}
                  onChange={(event) => setTituloAdicional(event.target.value)}
                  placeholder="Ex.: Orçamento suplementar"
                />
                <p className="text-xs leading-5 text-muted-foreground">
                  Título gerado: <span className="font-medium text-foreground">{nomeSessao}</span>
                </p>
              </div>
            </div>

            {erroGuardar && (
              <p role="alert" className="text-sm text-destructive">
                {erroGuardar}
              </p>
            )}
          </form>
        </div>

        <div className="shrink-0 border-t border-border/70 bg-card px-5 py-4 sm:px-7">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              disabled={aGuardar}
              onClick={() => {
                setOpen(false);
                reset();
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="form-criar-sessao-manual"
              disabled={!dadosValidos || aGuardar}
            >
              <CalendarPlus className="mr-2 h-4 w-4" />
              {aGuardar ? "A guardar…" : "Criar sessão"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
