import { useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { PerfilEleitoForm } from "@/components/auth/PerfilEleitoForm";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { adicionarAssembleia } from "@/lib/assembleias-store";
import { adicionarDossie } from "@/lib/dossies-store";
import type { AuthUser, PerfilEleito } from "@/lib/auth-store";

const tiposSessao = ["Ordinária", "Extraordinária", "Reunião de câmara", "Outra"] as const;

type OnboardingInicialWizardProps = {
  user?: AuthUser;
  perfil?: PerfilEleito;
  perfilConfigurado: boolean;
  onConcluir: () => Promise<void>;
};

function formatarDataCurta(dataISO: string) {
  if (!dataISO) return "";

  const data = new Date(`${dataISO}T00:00:00`);
  if (Number.isNaN(data.getTime())) return dataISO;

  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(data);
}

export function OnboardingInicialWizard({
  user,
  perfil,
  perfilConfigurado,
  onConcluir,
}: OnboardingInicialWizardProps) {
  const [passo, setPasso] = useState(perfilConfigurado ? 2 : 1);
  const [aConcluir, setAConcluir] = useState(false);

  const [assuntoTitulo, setAssuntoTitulo] = useState("");
  const [assuntoDescricao, setAssuntoDescricao] = useState("");
  const [assuntoCriadoTitulo, setAssuntoCriadoTitulo] = useState<string | null>(null);

  const [querCriarSessao, setQuerCriarSessao] = useState<boolean | null>(null);
  const [dataSessao, setDataSessao] = useState("");
  const [horaSessao, setHoraSessao] = useState("");
  const [tipoSessao, setTipoSessao] = useState<(typeof tiposSessao)[number]>("Ordinária");
  const [sessaoCriadaTitulo, setSessaoCriadaTitulo] = useState<string | null>(null);

  useEffect(() => {
    if (perfilConfigurado && passo === 1) {
      setPasso(2);
    }
  }, [perfilConfigurado, passo]);

  const podeCriarAssunto = assuntoTitulo.trim().length > 0;
  const podeCriarSessao = Boolean(dataSessao && horaSessao);

  const resumo = useMemo(
    () => [
      {
        id: "perfil",
        done: true,
        label: "Perfil configurado",
        detalhe: perfil?.nomeInstitucional || user?.nome || "Perfil institucional",
      },
      {
        id: "assunto",
        done: Boolean(assuntoCriadoTitulo),
        label: "Assunto criado",
        detalhe: assuntoCriadoTitulo || "Ignorado",
      },
      {
        id: "sessao",
        done: Boolean(sessaoCriadaTitulo),
        label: "Sessão criada",
        detalhe: sessaoCriadaTitulo || "Ignorado",
      },
    ],
    [assuntoCriadoTitulo, perfil?.nomeInstitucional, sessaoCriadaTitulo, user?.nome],
  );

  function criarAssunto() {
    if (!podeCriarAssunto) return;

    const novo = adicionarDossie({
      titulo: assuntoTitulo.trim(),
      estado: "ativo",
      prioridade: "Média",
      objetivoPolitico: "",
      resumo: assuntoDescricao.trim(),
      tags: [],
    });

    setAssuntoCriadoTitulo(novo.titulo);
    setPasso(3);
  }

  function ignorarAssunto() {
    setAssuntoCriadoTitulo(null);
    setPasso(3);
  }

  function criarSessao() {
    if (!podeCriarSessao) return;

    const titulo = `Sessão ${tipoSessao.toLowerCase()} — ${formatarDataCurta(dataSessao)}`;

    const nova = adicionarAssembleia({
      nome: titulo,
      data: dataSessao,
      hora: horaSessao,
      local: "Local por definir",
      estado: "preparacao",
    });

    setSessaoCriadaTitulo(nova.nome);
    setPasso(4);
  }

  async function concluir() {
    if (aConcluir) return;
    setAConcluir(true);
    try {
      await onConcluir();
    } finally {
      setAConcluir(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-foreground">Configuração inicial</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Em poucos passos, deixamos o Tribuno pronto para começar.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {[1, 2, 3, 4].map((numero) => (
          <span
            key={numero}
            className={[
              "inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium",
              numero === passo
                ? "border-foreground/20 bg-foreground text-background"
                : numero < passo
                  ? "border-border bg-muted text-foreground"
                  : "border-border bg-card text-muted-foreground",
            ].join(" ")}
          >
            Passo {numero}
          </span>
        ))}
      </div>

      {passo === 1 && (
        <Card className="p-5 shadow-none sm:p-6">
          <h2 className="mb-4 text-base font-semibold text-foreground">Passo 1 — Perfil</h2>
          <PerfilEleitoForm
            user={user}
            perfil={perfil}
            submitLabel="Guardar e continuar"
            afterSave={() => setPasso(2)}
          />
        </Card>
      )}

      {passo === 2 && (
        <Card className="p-5 shadow-none sm:p-6">
          <h2 className="text-base font-semibold text-foreground">Passo 2 — Assunto inicial</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Existe algum assunto que pretende começar a acompanhar?
          </p>

          <div className="mt-5 grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="onboarding-assunto-titulo">Título</Label>
              <Input
                id="onboarding-assunto-titulo"
                value={assuntoTitulo}
                onChange={(event) => setAssuntoTitulo(event.target.value)}
                placeholder="Ex.: Habitação"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="onboarding-assunto-descricao">Descrição (opcional)</Label>
              <Textarea
                id="onboarding-assunto-descricao"
                value={assuntoDescricao}
                onChange={(event) => setAssuntoDescricao(event.target.value)}
                rows={3}
                placeholder="Contexto inicial do assunto."
              />
            </div>
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={ignorarAssunto}>
              Ignorar
            </Button>
            <Button type="button" onClick={criarAssunto} disabled={!podeCriarAssunto}>
              Criar Assunto
            </Button>
          </div>
        </Card>
      )}

      {passo === 3 && (
        <Card className="p-5 shadow-none sm:p-6">
          <h2 className="text-base font-semibold text-foreground">Passo 3 — Próxima sessão</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Já sabe quando será a próxima sessão?
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              type="button"
              variant={querCriarSessao === true ? "primary" : "secondary"}
              onClick={() => setQuerCriarSessao(true)}
            >
              Sim
            </Button>
            <Button
              type="button"
              variant={querCriarSessao === false ? "primary" : "secondary"}
              onClick={() => setQuerCriarSessao(false)}
            >
              Não
            </Button>
          </div>

          {querCriarSessao === true && (
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="onboarding-sessao-data">Data</Label>
                <Input
                  id="onboarding-sessao-data"
                  type="date"
                  value={dataSessao}
                  onChange={(event) => setDataSessao(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="onboarding-sessao-hora">Hora</Label>
                <Input
                  id="onboarding-sessao-hora"
                  type="time"
                  value={horaSessao}
                  onChange={(event) => setHoraSessao(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de sessão</Label>
                <Select
                  value={tipoSessao}
                  onValueChange={(value) => setTipoSessao(value as (typeof tiposSessao)[number])}
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
            </div>
          )}

          <div className="mt-5 flex justify-end">
            {querCriarSessao === false ? (
              <Button type="button" onClick={() => setPasso(4)}>
                Continuar
              </Button>
            ) : (
              <Button type="button" onClick={criarSessao} disabled={!podeCriarSessao}>
                Criar Sessão
              </Button>
            )}
          </div>
        </Card>
      )}

      {passo === 4 && (
        <Card className="p-5 shadow-none sm:p-6">
          <h2 className="text-base font-semibold text-foreground">Passo 4 — Resumo</h2>

          <ul className="mt-4 space-y-3">
            {resumo.map((item) => (
              <li key={item.id} className="flex items-start gap-3 rounded-xl border border-border bg-muted/20 p-3">
                <CheckCircle2
                  className={[
                    "mt-0.5 h-4 w-4 shrink-0",
                    item.done ? "text-status-concluida" : "text-muted-foreground",
                  ].join(" ")}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{item.detalhe}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-5 flex justify-end">
            <Button type="button" onClick={concluir} disabled={aConcluir}>
              {aConcluir ? "A concluir..." : "Entrar no Tribuno"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
