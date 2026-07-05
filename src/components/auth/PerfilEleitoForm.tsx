import { useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";
import { UserAvatar } from "@/components/auth/UserAvatar";
import { Button } from "@/components/ui/button";
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
  cargosEleito,
  guardarPerfilEleito,
  nomeVisivel,
  normalizarPerfilEleito,
  orgaosEleito,
  PerfilErro,
  type AuthUser,
  type CargoEleito,
  type OrgaoEleito,
  type PerfilEleito,
  type PerfilErroCodigo,
} from "@/lib/auth-store";
import { diagnosticarSessaoSupabase, isSupabaseConfigured } from "@/lib/supabase";

type PerfilEleitoFormProps = {
  user?: AuthUser;
  perfil?: PerfilEleito;
  submitLabel?: string;
  onSaved?: (perfil: PerfilEleito) => void;
};

const mensagensErroPerfil: Record<PerfilErroCodigo, string> = {
  ERRO_PERFIL_VALIDACAO:
    "Não foi possível validar o perfil. Confirme os campos obrigatórios e tente novamente.",
  ERRO_PERFIL_SUPABASE:
    "O perfil foi guardado neste dispositivo, mas não foi possível sincronizar agora.",
  ERRO_PERFIL_LOCAL:
    "Não foi possível guardar o perfil neste dispositivo. Verifique o espaço disponível ou as permissões do navegador.",
  ERRO_PERFIL_DESCONHECIDO:
    "Não foi possível guardar o perfil. Tente novamente ou recarregue a página.",
};

function tamanhoTexto(valor: string) {
  return valor.trim().length;
}

function payloadSeguro(perfil: Omit<PerfilEleito, "updatedAt">) {
  return {
    nomeInstitucionalLength: tamanhoTexto(perfil.nomeInstitucional),
    cargo: perfil.cargo,
    orgao: perfil.orgao,
    organizacaoLength: tamanhoTexto(perfil.organizacao),
    territorioLength: tamanhoTexto(perfil.territorio),
    temAssinaturaInstitucional: Boolean(perfil.assinaturaInstitucional?.trim()),
  };
}

function codigoDoErro(error: unknown): PerfilErroCodigo {
  if (error instanceof PerfilErro) return error.codigo;

  if (error instanceof Error) {
    const mensagem = error.message.toLocaleLowerCase("pt-PT");
    if (mensagem.includes("localstorage") || mensagem.includes("quota")) {
      return "ERRO_PERFIL_LOCAL";
    }
    if (mensagem.includes("supabase") || mensagem.includes("auth") || mensagem.includes("rls")) {
      return "ERRO_PERFIL_SUPABASE";
    }
    if (mensagem.includes("inválido") || mensagem.includes("valid")) {
      return "ERRO_PERFIL_VALIDACAO";
    }
  }

  return "ERRO_PERFIL_DESCONHECIDO";
}

async function diagnosticoSupabase(userId?: string) {
  const diagnostico = await diagnosticarSessaoSupabase();
  return {
    ...diagnostico,
    userIdCorrespondeAoSupabase: Boolean(
      userId && diagnostico.supabaseUserId && userId === diagnostico.supabaseUserId,
    ),
  };
}

export function PerfilEleitoForm({
  user,
  perfil,
  submitLabel = "Guardar perfil",
  onSaved,
}: PerfilEleitoFormProps) {
  const perfilNormalizado = useMemo(() => normalizarPerfilEleito(perfil), [perfil]);
  const nomeInicial = useMemo(
    () => nomeVisivel(user, perfilNormalizado),
    [perfilNormalizado, user],
  );
  const [nomeInstitucional, setNomeInstitucional] = useState(
    perfilNormalizado?.nomeInstitucional || nomeInicial,
  );
  const [cargo, setCargo] = useState<CargoEleito>(
    perfilNormalizado?.cargo || "Membro da Assembleia Municipal",
  );
  const [orgao, setOrgao] = useState<OrgaoEleito>(
    perfilNormalizado?.orgao || "Assembleia Municipal",
  );
  const [organizacao, setOrganizacao] = useState(perfilNormalizado?.organizacao || "");
  const [territorio, setTerritorio] = useState(perfilNormalizado?.territorio || "");
  const [assinaturaInstitucional, setAssinaturaInstitucional] = useState(
    perfilNormalizado?.assinaturaInstitucional || "",
  );
  const [aGuardar, setAGuardar] = useState(false);
  const [nomeEditadoManualmente, setNomeEditadoManualmente] = useState(false);
  const [erro, setErro] = useState("");
  const [codigoErro, setCodigoErro] = useState<PerfilErroCodigo | undefined>();

  useEffect(() => {
    if (nomeEditadoManualmente) return;

    const nomeGuardado = perfilNormalizado?.nomeInstitucional;

    if (nomeGuardado) {
      setNomeInstitucional(nomeGuardado);
      return;
    }

    if (nomeInicial.trim()) {
      setNomeInstitucional(nomeInicial);
    }
  }, [nomeEditadoManualmente, nomeInicial, perfilNormalizado?.nomeInstitucional]);

  const podeGuardar = Boolean(
    nomeInstitucional.trim() && cargo && orgao && organizacao.trim() && territorio.trim(),
  );

  function limparErro() {
    setErro("");
    setCodigoErro(undefined);
  }

  function registarCampoAlterado(campo: string, valor: string) {
    console.info("[Tribuno Perfil] Campo alterado", {
      campo,
      length: valor.length,
      userId: user?.id,
      supabaseConfigurado: isSupabaseConfigured(),
    });
  }

  function alterarTexto(
    campo: string,
    valor: string,
    setter: React.Dispatch<React.SetStateAction<string>>,
  ) {
    try {
      limparErro();
      registarCampoAlterado(campo, valor);
      setter(valor);
    } catch (error) {
      const codigo = codigoDoErro(error);
      console.error("[Tribuno Perfil] Erro ao alterar campo", {
        codigo,
        campo,
        userId: user?.id,
        supabaseConfigurado: isSupabaseConfigured(),
        error,
      });
      setCodigoErro(codigo);
      setErro(mensagensErroPerfil[codigo]);
    }
  }

  function alterarOpcao<T extends CargoEleito | OrgaoEleito>(
    campo: string,
    valor: string,
    setter: React.Dispatch<React.SetStateAction<T>>,
  ) {
    try {
      limparErro();
      registarCampoAlterado(campo, valor);
      setter(valor as T);
    } catch (error) {
      const codigo = codigoDoErro(error);
      console.error("[Tribuno Perfil] Erro ao alterar opção", {
        codigo,
        campo,
        userId: user?.id,
        supabaseConfigurado: isSupabaseConfigured(),
        error,
      });
      setCodigoErro(codigo);
      setErro(mensagensErroPerfil[codigo]);
    }
  }

  async function guardar() {
    if (aGuardar) return;

    if (!podeGuardar) {
      const codigo: PerfilErroCodigo = "ERRO_PERFIL_VALIDACAO";
      const diagnostico = await diagnosticoSupabase(user?.id);
      console.warn("[Tribuno Perfil] Validação falhou antes de guardar", {
        codigo,
        userId: user?.id,
        diagnostico,
        campos: {
          nomeInstitucionalLength: nomeInstitucional.length,
          temCargo: Boolean(cargo),
          temOrgao: Boolean(orgao),
          organizacaoLength: organizacao.length,
          territorioLength: territorio.length,
        },
      });
      setCodigoErro(codigo);
      setErro(mensagensErroPerfil[codigo]);
      return;
    }

    limparErro();
    setAGuardar(true);

    const payload = {
      nomeInstitucional: nomeInstitucional.trim(),
      cargo,
      orgao,
      organizacao: organizacao.trim(),
      territorio: territorio.trim(),
      assinaturaInstitucional: assinaturaInstitucional.trim(),
    };
    const diagnostico = await diagnosticoSupabase(user?.id);

    console.info("[Tribuno Perfil] Submit iniciado", {
      userId: user?.id,
      diagnostico,
      payload: payloadSeguro(payload),
    });

    try {
      const atualizado = await guardarPerfilEleito(payload);
      console.info("[Tribuno Perfil] Perfil guardado", {
        userId: user?.id,
        diagnostico,
        payload: payloadSeguro(payload),
      });
      onSaved?.(atualizado);
    } catch (error) {
      const codigo = codigoDoErro(error);

      console.error("[Tribuno Perfil] Erro ao guardar perfil", {
        codigo,
        userId: user?.id,
        diagnostico,
        payload: payloadSeguro(payload),
        error,
      });

      setCodigoErro(codigo);
      setErro(mensagensErroPerfil[codigo]);
    } finally {
      setAGuardar(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-muted/25 p-4">
        <UserAvatar user={user} perfil={perfilNormalizado} className="h-12 w-12" />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground">
            {user?.nome || "Conta autenticada"}
          </div>
          <div className="truncate text-sm text-muted-foreground">
            {user?.email || "Email da conta Google"}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="perfil-nome">Nome público/institucional</Label>
          <Input
            id="perfil-nome"
            value={nomeInstitucional}
            onChange={(event) => {
              try {
                setNomeEditadoManualmente(true);
                alterarTexto("nomeInstitucional", event.target.value, setNomeInstitucional);
              } catch (error) {
                const codigo = codigoDoErro(error);
                console.error("[Tribuno Perfil] Erro no handler do nome", {
                  codigo,
                  userId: user?.id,
                  error,
                });
                setCodigoErro(codigo);
                setErro(mensagensErroPerfil[codigo]);
              }
            }}
            placeholder="Ex: Nome institucional"
          />
        </div>

        <div className="space-y-2">
          <Label>Função/cargo</Label>
          <Select value={cargo} onValueChange={(value) => alterarOpcao("cargo", value, setCargo)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {cargosEleito.map((opcao) => (
                <SelectItem key={opcao} value={opcao}>
                  {opcao}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Órgão</Label>
          <Select value={orgao} onValueChange={(value) => alterarOpcao("orgao", value, setOrgao)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {orgaosEleito.map((opcao) => (
                <SelectItem key={opcao} value={opcao}>
                  {opcao}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="perfil-organizacao">Organização/partido/lista/movimento</Label>
          <Input
            id="perfil-organizacao"
            value={organizacao}
            onChange={(event) => alterarTexto("organizacao", event.target.value, setOrganizacao)}
            placeholder="Ex: Movimento independente"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="perfil-territorio">Freguesia/concelho</Label>
          <Input
            id="perfil-territorio"
            value={territorio}
            onChange={(event) => alterarTexto("territorio", event.target.value, setTerritorio)}
            placeholder="Ex: Aveiro"
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="perfil-assinatura">Assinatura institucional opcional</Label>
          <Textarea
            id="perfil-assinatura"
            value={assinaturaInstitucional}
            onChange={(event) =>
              alterarTexto(
                "assinaturaInstitucional",
                event.target.value,
                setAssinaturaInstitucional,
              )
            }
            placeholder="Nome, cargo e grupo político para usar futuramente em documentos."
            rows={3}
          />
        </div>
      </div>

      <div className="flex justify-end">
        {erro && (
          <p className="mr-auto max-w-md text-sm leading-6 text-destructive" role="alert">
            {erro} {codigoErro ? `Código: ${codigoErro}` : null}
          </p>
        )}
        <Button type="button" onClick={guardar} disabled={!podeGuardar || aGuardar}>
          <Save className="h-4 w-4" />
          {aGuardar ? "A guardar..." : submitLabel}
        </Button>
      </div>
    </div>
  );
}
