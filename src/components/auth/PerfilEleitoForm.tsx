import { useMemo, useState } from "react";
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
  orgaosEleito,
  type AuthUser,
  type CargoEleito,
  type OrgaoEleito,
  type PerfilEleito,
} from "@/lib/auth-store";

type PerfilEleitoFormProps = {
  user?: AuthUser;
  perfil?: PerfilEleito;
  submitLabel?: string;
  onSaved?: (perfil: PerfilEleito) => void;
};

export function PerfilEleitoForm({
  user,
  perfil,
  submitLabel = "Guardar perfil",
  onSaved,
}: PerfilEleitoFormProps) {
  const nomeInicial = useMemo(() => nomeVisivel(user, perfil), [perfil, user]);
  const [nomeInstitucional, setNomeInstitucional] = useState(
    perfil?.nomeInstitucional || nomeInicial,
  );
  const [cargo, setCargo] = useState<CargoEleito>(
    perfil?.cargo || "Membro da Assembleia Municipal",
  );
  const [orgao, setOrgao] = useState<OrgaoEleito>(perfil?.orgao || "Assembleia Municipal");
  const [organizacao, setOrganizacao] = useState(perfil?.organizacao || "");
  const [territorio, setTerritorio] = useState(perfil?.territorio || "");
  const [assinaturaInstitucional, setAssinaturaInstitucional] = useState(
    perfil?.assinaturaInstitucional || "",
  );

  const podeGuardar = Boolean(
    nomeInstitucional.trim() && cargo && orgao && organizacao.trim() && territorio.trim(),
  );

  function guardar() {
    if (!podeGuardar) return;

    const atualizado = guardarPerfilEleito({
      nomeInstitucional: nomeInstitucional.trim(),
      cargo,
      orgao,
      organizacao: organizacao.trim(),
      territorio: territorio.trim(),
      assinaturaInstitucional: assinaturaInstitucional.trim(),
    });
    onSaved?.(atualizado);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-muted/25 p-4">
        <UserAvatar user={user} perfil={perfil} className="h-12 w-12" />
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
            onChange={(event) => setNomeInstitucional(event.target.value)}
            placeholder="Ex: Nome institucional"
          />
        </div>

        <div className="space-y-2">
          <Label>Função/cargo</Label>
          <Select value={cargo} onValueChange={(value) => setCargo(value as CargoEleito)}>
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
          <Select value={orgao} onValueChange={(value) => setOrgao(value as OrgaoEleito)}>
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
            onChange={(event) => setOrganizacao(event.target.value)}
            placeholder="Ex: Movimento independente"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="perfil-territorio">Freguesia/concelho</Label>
          <Input
            id="perfil-territorio"
            value={territorio}
            onChange={(event) => setTerritorio(event.target.value)}
            placeholder="Ex: Aveiro"
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="perfil-assinatura">Assinatura institucional opcional</Label>
          <Textarea
            id="perfil-assinatura"
            value={assinaturaInstitucional}
            onChange={(event) => setAssinaturaInstitucional(event.target.value)}
            placeholder="Nome, cargo e grupo político para usar futuramente em documentos."
            rows={3}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="button" onClick={guardar} disabled={!podeGuardar}>
          <Save className="h-4 w-4" />
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
