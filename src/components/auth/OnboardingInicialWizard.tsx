import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CheckCircle2, FileSearch, LogOut, Upload } from "lucide-react";
import { PerfilEleitoForm } from "@/components/auth/PerfilEleitoForm";
import { ReviewForm } from "@/components/documentos/InstitutionalDocumentIntake";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  analisarDocumentoCarregado,
  carregarDocumentoParaAnalise,
  confirmarAnaliseDocumento,
} from "@/lib/institutional-document-flow";
import { gerarTituloSessaoInstitucional } from "@/lib/institutional-session-title";
import {
  carregarOnboardingLocal,
  guardarOnboardingLocal,
  marcarProximaAcaoConvocatoria,
  resolverInterrupcaoOnboarding,
  type OnboardingPasso,
} from "@/lib/onboarding-state";
import { logout, type AuthUser, type PerfilEleito } from "@/lib/auth-store";
import type { AnaliseDocumentoInstitucional, Documento } from "@/lib/types";
import { chaveTransitoriaPorUtilizador } from "@/lib/session-transient-state";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Passo = OnboardingPasso | "analise" | "revisao" | "duplicado";

type Props = {
  user?: AuthUser;
  perfil?: PerfilEleito;
  perfilConfigurado: boolean;
  onConcluir: () => Promise<void>;
};

const mensagensAnalise = [
  "A analisar a convocatória…",
  "A identificar a sessão e a ordem de trabalhos…",
  "A organizar a preparação…",
];

export function OnboardingInicialWizard({ user, perfil, perfilConfigurado, onConcluir }: Props) {
  const navigate = useNavigate();
  const local = carregarOnboardingLocal(user?.id);
  const [passo, setPasso] = useState<Passo>(
    perfilConfigurado ? (local?.passo ?? "confirmacao") : "identidade",
  );
  const [perfilAtual, setPerfilAtual] = useState(perfil);
  const [file, setFile] = useState<File>();
  const [documento, setDocumento] = useState<Documento>();
  const [analise, setAnalise] = useState<AnaliseDocumentoInstitucional>();
  const [titulo, setTitulo] = useState("Sessão");
  const [tituloPersonalizado, setTituloPersonalizado] = useState(false);
  const [duplicateId, setDuplicateId] = useState("");
  const [erro, setErro] = useState(
    local?.processoInterrompido
      ? "Por segurança, seleciona novamente o ficheiro para continuar."
      : "",
  );
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [mensagemIndex, setMensagemIndex] = useState(0);
  const [aSair, setASair] = useState(false);

  useEffect(() => {
    if (passo !== "analise") return;
    const interval = window.setInterval(
      () => setMensagemIndex((value) => Math.min(value + 1, mensagensAnalise.length - 1)),
      1800,
    );
    return () => window.clearInterval(interval);
  }, [passo]);

  useEffect(() => {
    if (local?.sessaoId && local.concluido) {
      void navigate({ to: "/sessoes/$id", params: { id: local.sessaoId }, replace: true });
    }
  }, [local?.concluido, local?.sessaoId, navigate]);

  function persistirPasso(next: OnboardingPasso) {
    if (user?.id) guardarOnboardingLocal(user.id, { passo: next, processoInterrompido: false });
    setPasso(next);
    setErro("");
  }

  async function sairEContinuarMaisTarde() {
    if (aSair) return;
    setASair(true);
    try {
      if (user?.id) {
        guardarOnboardingLocal(
          user.id,
          resolverInterrupcaoOnboarding({ passo, temFicheiro: Boolean(file) }),
        );
      }
      setFile(undefined);
      setDocumento(undefined);
      setAnalise(undefined);
      setDuplicateId("");
      await logout();
      await navigate({ to: "/login", replace: true });
    } finally {
      setASair(false);
    }
  }

  async function analisar() {
    if (!file || ocupado || !user?.id) return;
    setOcupado(true);
    setErro("");
    setAviso("");
    setMensagemIndex(0);
    setPasso("analise");
    guardarOnboardingLocal(user.id, { passo: "convocatoria", processoInterrompido: true });
    try {
      const uploaded = await carregarDocumentoParaAnalise(file);
      setDocumento(uploaded);
      const result = await analisarDocumentoCarregado(uploaded.id);
      setAnalise(result.analise);
      setTitulo(gerarTituloSessaoInstitucional(result.analise.sessao));
      setTituloPersonalizado(false);
      if (result.estado === "necessita_confirmacao")
        setAviso(
          "Consegui compreender parte do documento, mas preciso que confirmes alguns detalhes.",
        );
      setPasso("revisao");
    } catch {
      setErro(
        "Não foi possível analisar esta convocatória. Tenta novamente ou escolhe outro ficheiro.",
      );
      setPasso("convocatoria");
    } finally {
      setOcupado(false);
    }
  }

  async function repetirAnalise() {
    if (!documento || ocupado) return;
    setOcupado(true);
    setPasso("analise");
    setErro("");
    try {
      const result = await analisarDocumentoCarregado(documento.id);
      setAnalise(result.analise);
      if (!tituloPersonalizado) setTitulo(gerarTituloSessaoInstitucional(result.analise.sessao));
      setPasso("revisao");
    } catch {
      setErro("A análise falhou. Podes tentar novamente ou escolher outro ficheiro.");
      setPasso("revisao");
    } finally {
      setOcupado(false);
    }
  }

  async function concluirSemConvocatoria() {
    if (!user?.id || ocupado) return;
    setOcupado(true);
    marcarProximaAcaoConvocatoria(user.id, true);
    await onConcluir();
    await navigate({ to: "/", replace: true });
  }

  async function confirmar(modo: "criar" | "atualizar" | "criar_novo" = "criar") {
    if (!user?.id || !documento || !analise || ocupado) return;
    if (!analise.sessao?.orgao || !analise.sessao.data || !analise.sessao.hora) {
      setErro("Confirma o órgão, a data e a hora antes de preparar a sessão.");
      return;
    }
    setOcupado(true);
    setErro("");
    let sessaoId: string;
    try {
      const result = await confirmarAnaliseDocumento({
        documentoId: documento.id,
        analise: { ...analise, tituloSessao: titulo },
        modo: modo === "criar_novo" ? "criar_novo" : modo,
        sessaoExistenteId: modo === "atualizar" ? duplicateId : undefined,
      });
      if (result.status === "duplicado") {
        setDuplicateId(result.sessaoId);
        setPasso("duplicado");
        setOcupado(false);
        return;
      }
      sessaoId = result.sessaoId;
    } catch {
      setErro(
        "Não foi possível criar a sessão. Nenhuma criação parcial foi confirmada; tenta novamente.",
      );
      setPasso("revisao");
      setOcupado(false);
      return;
    }

    try {
      guardarOnboardingLocal(user.id, {
        concluido: true,
        processoInterrompido: false,
        semConvocatoria: false,
        sessaoId,
      });
      const wowKey = chaveTransitoriaPorUtilizador("tribuno:onboarding-wow", sessaoId, user.id);
      if (wowKey)
        sessionStorage.setItem(
          wowKey,
          JSON.stringify({
            origem: "onboarding",
            userId: user.id,
            sessaoId,
            data: analise.sessao.data,
            pontos: analise.pontosOrdemTrabalhos.length,
          }),
        );
      await onConcluir();
    } catch {
      console.warn("[Tribuno Onboarding] Sessão criada com sincronização pendente.", {
        operacao: "ONBOARDING_CONCLUSAO_LOCAL_PENDENTE",
      });
    } finally {
      setOcupado(false);
    }
    await navigate({ to: "/sessoes/$id", params: { id: sessaoId }, replace: true });
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Onboarding Beta</p>
          <h1 className="mt-1 font-display text-3xl font-semibold">Prepara a primeira sessão</h1>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" disabled={aSair} className="shrink-0">
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Sair e continuar mais tarde</span>
              <span className="sr-only sm:hidden">Sair e continuar mais tarde</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Sair da configuração inicial?</AlertDialogTitle>
              <AlertDialogDescription>
                O progresso já guardado ficará disponível quando iniciares sessão novamente. O
                Tribuno não criará nem apagará nenhum dado.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={aSair}>Continuar configuração</AlertDialogCancel>
              <AlertDialogAction
                disabled={aSair}
                onClick={(event) => {
                  event.preventDefault();
                  void sairEContinuarMaisTarde();
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {aSair ? "A terminar sessão…" : "Sair"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </header>

      {passo === "identidade" && (
        <Card className="p-5 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold">Identidade institucional</h2>
          <PerfilEleitoForm
            user={user}
            perfil={perfilAtual}
            modoOnboarding
            submitLabel="Guardar e continuar"
            afterSave={(value) => {
              setPerfilAtual(value);
              persistirPasso("confirmacao");
            }}
          />
        </Card>
      )}

      {passo === "confirmacao" && perfilAtual && (
        <Card className="p-5 sm:p-6">
          <CheckCircle2 className="h-8 w-8 text-primary" />
          <h2 className="mt-4 text-xl font-semibold">Confirma o teu contexto</h2>
          <div className="mt-5 space-y-1 rounded-xl border bg-muted/20 p-4">
            <p className="font-semibold">{perfilAtual.nomeInstitucional}</p>
            <p>{perfilAtual.cargo}</p>
            <p>
              {perfilAtual.orgao}
              {perfilAtual.freguesia
                ? ` de ${perfilAtual.freguesia}`
                : perfilAtual.municipio
                  ? ` de ${perfilAtual.municipio}`
                  : ""}
            </p>
            <p>{perfilAtual.organizacao}</p>
          </div>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => persistirPasso("identidade")}>
              Corrigir dados
            </Button>
            <Button onClick={() => persistirPasso("convocatoria")}>Continuar</Button>
          </div>
        </Card>
      )}

      {passo === "convocatoria" && (
        <Card className="p-5 sm:p-6">
          <Upload className="h-8 w-8 text-primary" />
          <h2 className="mt-4 text-xl font-semibold">Vamos preparar a tua primeira sessão.</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Carrega uma convocatória e o Tribuno organiza o trabalho por ti.
          </p>
          <div className="mt-6 space-y-2">
            <Label htmlFor="onboarding-convocatoria">Convocatória em PDF</Label>
            <Input
              id="onboarding-convocatoria"
              type="file"
              accept="application/pdf,.pdf"
              disabled={ocupado}
              onChange={(event) => setFile(event.target.files?.[0])}
            />
          </div>
          {erro && (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {erro}
            </p>
          )}
          <div className="mt-6 flex flex-col gap-2">
            <Button className="w-full" disabled={!file || ocupado} onClick={analisar}>
              Carregar convocatória
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              disabled={ocupado}
              onClick={concluirSemConvocatoria}
            >
              Ainda não tenho uma convocatória
            </Button>
          </div>
        </Card>
      )}

      {passo === "analise" && (
        <Card className="py-14 text-center">
          <FileSearch className="mx-auto h-10 w-10 animate-pulse text-primary" />
          <p className="mt-4 font-semibold" aria-live="polite">
            {mensagensAnalise[mensagemIndex]}
          </p>
        </Card>
      )}

      {passo === "revisao" && analise && (
        <Card className="max-h-[75dvh] overflow-y-auto p-4 sm:p-6">
          <h2 className="text-xl font-semibold">Confirma os dados da sessão</h2>
          {aviso && (
            <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
              {aviso}
            </p>
          )}
          <div className="mt-5">
            <ReviewForm
              analise={analise}
              onChange={setAnalise}
              titulo={titulo}
              tituloPersonalizado={tituloPersonalizado}
              onTituloAutomaticoChange={setTitulo}
              onTituloChange={(value) => {
                if (value.trim()) {
                  setTitulo(value);
                  setTituloPersonalizado(true);
                } else {
                  setTitulo(gerarTituloSessaoInstitucional(analise.sessao));
                  setTituloPersonalizado(false);
                }
              }}
            />
          </div>
          {erro && (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {erro}
            </p>
          )}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button
              variant="ghost"
              onClick={() => {
                setFile(undefined);
                persistirPasso("convocatoria");
              }}
            >
              Escolher outro ficheiro
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="secondary" disabled={ocupado} onClick={repetirAnalise}>
                Tentar análise novamente
              </Button>
              <Button disabled={ocupado} onClick={() => confirmar()}>
                Confirmar e preparar sessão
              </Button>
            </div>
          </div>
        </Card>
      )}

      {passo === "duplicado" && (
        <Card className="p-5 sm:p-6">
          <h2 className="text-xl font-semibold">Encontrei uma possível sessão duplicada</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Escolhe se queres atualizar a sessão existente ou criar outra.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button disabled={ocupado} onClick={() => confirmar("atualizar")}>
              Atualizar sessão existente
            </Button>
            <Button variant="secondary" disabled={ocupado} onClick={() => confirmar("criar_novo")}>
              Criar outra sessão
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
