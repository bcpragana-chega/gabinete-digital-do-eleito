import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  FileText,
  NotebookText,
  Pencil,
  Plus,
  Save,
  ScrollText,
  Trash2,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SectionTitle, StatusBadge } from "@/components/ui/common";
import { EmptyState } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { WorkspaceSection } from "@/components/ui/workspace";
import {
  associarAssembleiaAoDossie,
  desassociarAssembleiaDoDossie,
  useAssembleiasDoDossie,
} from "@/lib/dossie-assembleias-store";
import {
  associarDocumentoAoDossie,
  desassociarDocumentoDoDossie,
  useDocumentosDoDossie,
} from "@/lib/dossie-documentos-store";
import {
  adicionarRelacionadoDossie,
  apagarRelacionadoDossie,
  editarRelacionadoDossie,
  useRelacionadosDossie,
  type DossieRelacionadoInput,
} from "@/lib/dossie-relacionados-store";
import { listarAssembleias } from "@/lib/assembleias-store";
import { listarDocumentosLocais } from "@/lib/documentos-store";
import { documentos as documentosMock } from "@/lib/mock-data";
import type { Assembleia, CategoriaRelacionadoDossie, Documento, DossieRelacionado } from "@/lib/types";

type DossieRelacionadosSectionProps = {
  dossieId: string;
};

type CategoriaConfig = {
  value: CategoriaRelacionadoDossie;
  label: string;
  singular: string;
  description: string;
  tipoPlaceholder: string;
  icon: LucideIcon;
};

const categorias: CategoriaConfig[] = [
  {
    value: "documentos",
    label: "Documentos",
    singular: "Documento",
    description: "Documentos recebidos, criados ou anexados ao Dossiê.",
    tipoPlaceholder: "Ex.: relatório, ata, proposta",
    icon: FileText,
  },
  {
    value: "assembleias",
    label: "Assembleias",
    singular: "Assembleia",
    description: "Sessões, pontos e decisões que alimentam este tema.",
    tipoPlaceholder: "Ex.: assembleia municipal, reunião pública",
    icon: NotebookText,
  },
  {
    value: "pessoas",
    label: "Pessoas",
    singular: "Pessoa",
    description: "Munícipes, eleitos, técnicos e outros atores individuais.",
    tipoPlaceholder: "Ex.: munícipe, vereador, técnico",
    icon: Users,
  },
  {
    value: "entidades",
    label: "Entidades",
    singular: "Entidade",
    description: "Câmara, juntas, serviços, associações e organismos externos.",
    tipoPlaceholder: "Ex.: câmara, junta, associação",
    icon: Building2,
  },
  {
    value: "compromissos",
    label: "Compromissos",
    singular: "Compromisso",
    description: "Pedidos, respostas, promessas e ações de seguimento.",
    tipoPlaceholder: "Ex.: pedido, resposta, promessa",
    icon: ScrollText,
  },
];

function criarInputVazio(categoria: CategoriaRelacionadoDossie): DossieRelacionadoInput {
  return {
    categoria,
    nome: "",
    descricao: "",
    tipo: "",
  };
}

function itemValido(input: DossieRelacionadoInput) {
  return Boolean(input.nome.trim() && input.descricao.trim() && input.tipo.trim());
}

function formatarData(data?: string) {
  if (!data) return "Sem data";

  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(data));
}

function itemMeta(item: DossieRelacionado) {
  if (item.updatedAt && item.updatedAt !== item.createdAt) {
    return `Atualizado em ${formatarData(item.updatedAt)} · criado em ${formatarData(item.createdAt)}`;
  }

  return `Criado em ${formatarData(item.createdAt)}`;
}

function documentosUnicos(documentos: Documento[]) {
  const porId = new Map<string, Documento>();
  documentos.forEach((documento) => porId.set(documento.id, documento));
  return Array.from(porId.values()).sort((a, b) => b.data.localeCompare(a.data));
}

function assembleiasUnicas(assembleias: Assembleia[]) {
  const porId = new Map<string, Assembleia>();
  assembleias.forEach((assembleia) => porId.set(assembleia.id, assembleia));

  return Array.from(porId.values()).sort((a, b) => {
    const dataA = `${a.data}T${a.hora || "00:00"}`;
    const dataB = `${b.data}T${b.hora || "00:00"}`;
    return dataB.localeCompare(dataA);
  });
}

function useDocumentosExistentes() {
  const [documentos, setDocumentos] = useState<Documento[]>([]);

  useEffect(() => {
    const atualizar = () => {
      setDocumentos(documentosUnicos([...documentosMock, ...listarDocumentosLocais()]));
    };

    atualizar();
    window.addEventListener("storage", atualizar);

    return () => window.removeEventListener("storage", atualizar);
  }, []);

  return documentos;
}

function useAssembleiasExistentes() {
  const [assembleias, setAssembleias] = useState<Assembleia[]>([]);

  useEffect(() => {
    const atualizar = () => {
      setAssembleias(assembleiasUnicas(listarAssembleias()));
    };

    atualizar();
    window.addEventListener("storage", atualizar);

    return () => window.removeEventListener("storage", atualizar);
  }, []);

  return assembleias;
}

export function DossieRelacionadosSection({ dossieId }: DossieRelacionadosSectionProps) {
  const relacionados = useRelacionadosDossie(dossieId);
  const documentosExistentes = useDocumentosExistentes();
  const relacoesDocumentos = useDocumentosDoDossie(dossieId);
  const assembleiasExistentes = useAssembleiasExistentes();
  const relacoesAssembleias = useAssembleiasDoDossie(dossieId);
  const [categoriaAberta, setCategoriaAberta] = useState<CategoriaRelacionadoDossie | null>(null);
  const [categoriaEmCriacao, setCategoriaEmCriacao] = useState<CategoriaRelacionadoDossie | null>(
    null,
  );
  const [novoItem, setNovoItem] = useState<DossieRelacionadoInput | null>(null);
  const [itemEmEdicao, setItemEmEdicao] = useState<string | null>(null);
  const [edicao, setEdicao] = useState<DossieRelacionadoInput | null>(null);
  const [documentoParaAssociar, setDocumentoParaAssociar] = useState("");
  const [assembleiaParaAssociar, setAssembleiaParaAssociar] = useState("");

  const documentosAssociados = useMemo(() => {
    return relacoesDocumentos
      .map((relacao) =>
        documentosExistentes.find((documento) => documento.id === relacao.documentoId),
      )
      .filter((documento): documento is Documento => Boolean(documento));
  }, [documentosExistentes, relacoesDocumentos]);

  const documentosAssociadosIds = useMemo(
    () => new Set(relacoesDocumentos.map((relacao) => relacao.documentoId)),
    [relacoesDocumentos],
  );

  const documentosDisponiveis = useMemo(
    () => documentosExistentes.filter((documento) => !documentosAssociadosIds.has(documento.id)),
    [documentosAssociadosIds, documentosExistentes],
  );

  const assembleiasAssociadas = useMemo(() => {
    return relacoesAssembleias
      .map((relacao) =>
        assembleiasExistentes.find((assembleia) => assembleia.id === relacao.assembleiaId),
      )
      .filter((assembleia): assembleia is Assembleia => Boolean(assembleia));
  }, [assembleiasExistentes, relacoesAssembleias]);

  const assembleiasAssociadasIds = useMemo(
    () => new Set(relacoesAssembleias.map((relacao) => relacao.assembleiaId)),
    [relacoesAssembleias],
  );

  const assembleiasDisponiveis = useMemo(
    () =>
      assembleiasExistentes.filter((assembleia) => !assembleiasAssociadasIds.has(assembleia.id)),
    [assembleiasAssociadasIds, assembleiasExistentes],
  );

  const configAberta = categorias.find((categoria) => categoria.value === categoriaAberta);

  function relacionadosDaCategoria(categoria: CategoriaRelacionadoDossie) {
    return relacionados.filter((item) => item.categoria === categoria);
  }

  function totalCategoria(categoria: CategoriaRelacionadoDossie) {
    const manuais = relacionadosDaCategoria(categoria).length;
    if (categoria === "documentos") return manuais + documentosAssociados.length;
    if (categoria === "assembleias") return manuais + assembleiasAssociadas.length;
    return manuais;
  }

  function abrirCategoria(categoria: CategoriaRelacionadoDossie) {
    setCategoriaAberta(categoria);
    limparGestao();
  }

  function fecharCategoria() {
    setCategoriaAberta(null);
    limparGestao();
  }

  function limparGestao() {
    setCategoriaEmCriacao(null);
    setNovoItem(null);
    setItemEmEdicao(null);
    setEdicao(null);
    setDocumentoParaAssociar("");
    setAssembleiaParaAssociar("");
  }

  function iniciarCriacao(categoria: CategoriaRelacionadoDossie) {
    setCategoriaEmCriacao(categoria);
    setNovoItem(criarInputVazio(categoria));
    setItemEmEdicao(null);
    setEdicao(null);
  }

  function atualizarNovo(campo: keyof DossieRelacionadoInput, valor: string) {
    setNovoItem((atual) => (atual ? { ...atual, [campo]: valor } : atual));
  }

  function atualizarEdicao(campo: keyof DossieRelacionadoInput, valor: string) {
    setEdicao((atual) => (atual ? { ...atual, [campo]: valor } : atual));
  }

  function criarItem() {
    if (!novoItem || !itemValido(novoItem)) return;

    adicionarRelacionadoDossie(dossieId, {
      ...novoItem,
      nome: novoItem.nome.trim(),
      descricao: novoItem.descricao.trim(),
      tipo: novoItem.tipo.trim(),
    });
    setCategoriaEmCriacao(null);
    setNovoItem(null);
  }

  function iniciarEdicao(item: DossieRelacionado) {
    setItemEmEdicao(item.id);
    setEdicao({
      categoria: item.categoria,
      nome: item.nome,
      descricao: item.descricao,
      tipo: item.tipo,
    });
    setCategoriaEmCriacao(null);
    setNovoItem(null);
  }

  function guardarEdicao() {
    if (!itemEmEdicao || !edicao || !itemValido(edicao)) return;

    editarRelacionadoDossie(itemEmEdicao, {
      ...edicao,
      nome: edicao.nome.trim(),
      descricao: edicao.descricao.trim(),
      tipo: edicao.tipo.trim(),
    });
    setItemEmEdicao(null);
    setEdicao(null);
  }

  function apagarItem(item: DossieRelacionado) {
    const confirmado = window.confirm("Apagar este item relacionado?");
    if (!confirmado) return;
    apagarRelacionadoDossie(item.id);
  }

  function associarDocumento() {
    if (!documentoParaAssociar) return;
    associarDocumentoAoDossie(dossieId, documentoParaAssociar);
    setDocumentoParaAssociar("");
  }

  function desassociarDocumento(documento: Documento) {
    const confirmado = window.confirm(`Desassociar o documento "${documento.titulo}" deste Dossiê?`);
    if (!confirmado) return;
    desassociarDocumentoDoDossie(dossieId, documento.id);
  }

  function associarAssembleia() {
    if (!assembleiaParaAssociar) return;
    associarAssembleiaAoDossie(dossieId, assembleiaParaAssociar);
    setAssembleiaParaAssociar("");
  }

  function desassociarAssembleia(assembleia: Assembleia) {
    const confirmado = window.confirm(`Desassociar a assembleia "${assembleia.nome}" deste Dossiê?`);
    if (!confirmado) return;
    desassociarAssembleiaDoDossie(dossieId, assembleia.id);
  }

  function renderFormulario(
    config: CategoriaConfig,
    input: DossieRelacionadoInput,
    onChange: (campo: keyof DossieRelacionadoInput, valor: string) => void,
  ) {
    return (
      <div className="grid gap-4 rounded-2xl border border-border/70 bg-background p-4">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
          <div className="min-w-0 space-y-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor={`${config.value}-nome`}>
              Nome / título
            </label>
            <Input
              id={`${config.value}-nome`}
              value={input.nome}
              onChange={(event) => onChange("nome", event.target.value)}
              placeholder={`Ex.: ${config.singular} relevante`}
            />
          </div>
          <div className="min-w-0 space-y-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor={`${config.value}-tipo`}>
              Tipo
            </label>
            <Input
              id={`${config.value}-tipo`}
              value={input.tipo}
              onChange={(event) => onChange("tipo", event.target.value)}
              placeholder={config.tipoPlaceholder}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground" htmlFor={`${config.value}-descricao`}>
            Descrição curta
          </label>
          <Textarea
            id={`${config.value}-descricao`}
            value={input.descricao}
            onChange={(event) => onChange("descricao", event.target.value)}
            placeholder="Explica porque este item importa para o Dossiê..."
            className="min-h-24 resize-y"
          />
        </div>
      </div>
    );
  }

  function renderDocumentosReais() {
    if (documentosExistentes.length === 0) {
      return (
        <EmptyState
          compact
          title="Ainda não há documentos disponíveis."
          description="Quando existirem documentos no sistema, poderás associá-los aqui."
        />
      );
    }

    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <Select
            value={documentoParaAssociar}
            onValueChange={setDocumentoParaAssociar}
            disabled={documentosDisponiveis.length === 0}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  documentosDisponiveis.length === 0
                    ? "Todos os documentos já estão associados"
                    : "Selecionar documento existente"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {documentosDisponiveis.map((documento) => (
                <SelectItem key={documento.id} value={documento.id}>
                  {documento.titulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={associarDocumento}
            disabled={!documentoParaAssociar}
          >
            <Plus className="mr-2 h-4 w-4" />
            Associar
          </Button>
        </div>

        {documentosAssociados.length === 0 ? (
          <EmptyState
            compact
            title="Sem documentos reais associados."
            description="Seleciona um documento existente para o ligar a este Dossiê."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {documentosAssociados.map((documento) => (
              <RelatedItem
                key={documento.id}
                icon={FileText}
                title={documento.titulo}
                description={documento.notas || "Documento associado ao Dossiê."}
                meta={`${documento.tipo} · ${documento.estado} · ${formatarData(documento.data)}`}
                actions={
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => desassociarDocumento(documento)}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Desassociar
                  </Button>
                }
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderAssembleiasReais() {
    if (assembleiasExistentes.length === 0) {
      return (
        <EmptyState
          compact
          title="Ainda não há assembleias disponíveis."
          description="Quando existirem assembleias no sistema, poderás associá-las aqui."
        />
      );
    }

    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <Select
            value={assembleiaParaAssociar}
            onValueChange={setAssembleiaParaAssociar}
            disabled={assembleiasDisponiveis.length === 0}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  assembleiasDisponiveis.length === 0
                    ? "Todas as assembleias já estão associadas"
                    : "Selecionar assembleia existente"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {assembleiasDisponiveis.map((assembleia) => (
                <SelectItem key={assembleia.id} value={assembleia.id}>
                  {assembleia.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={associarAssembleia}
            disabled={!assembleiaParaAssociar}
          >
            <Plus className="mr-2 h-4 w-4" />
            Associar
          </Button>
        </div>

        {assembleiasAssociadas.length === 0 ? (
          <EmptyState
            compact
            title="Sem assembleias reais associadas."
            description="Seleciona uma assembleia existente para a ligar a este Dossiê."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {assembleiasAssociadas.map((assembleia) => (
              <RelatedItem
                key={assembleia.id}
                icon={NotebookText}
                title={assembleia.nome}
                description={assembleia.local}
                meta={`${assembleia.estado} · ${formatarData(assembleia.data)}${assembleia.hora ? ` · ${assembleia.hora}` : ""}`}
                actions={
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => desassociarAssembleia(assembleia)}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Desassociar
                  </Button>
                }
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderManuais(config: CategoriaConfig) {
    const itens = relacionadosDaCategoria(config.value);
    const estaACriar = categoriaEmCriacao === config.value && novoItem;

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Itens manuais</h3>
            <p className="text-sm text-muted-foreground">
              Registos simples ligados apenas a este Dossiê.
            </p>
          </div>
          {!estaACriar && (
            <Button type="button" variant="secondary" size="sm" onClick={() => iniciarCriacao(config.value)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar manual
            </Button>
          )}
        </div>

        {estaACriar && (
          <div className="space-y-4">
            {renderFormulario(config, novoItem, atualizarNovo)}
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCategoriaEmCriacao(null);
                  setNovoItem(null);
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
              <Button type="button" size="sm" onClick={criarItem} disabled={!itemValido(novoItem)}>
                <Save className="mr-2 h-4 w-4" />
                Guardar
              </Button>
            </div>
          </div>
        )}

        {itens.length === 0 && !estaACriar ? (
          <EmptyState
            compact
            title={`Sem ${config.label.toLowerCase()} manuais.`}
            description="Adiciona um item manual para começar a ligar conhecimento."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {itens.map((item) => {
              const emEdicao = itemEmEdicao === item.id && edicao;

              if (emEdicao) {
                return (
                  <div key={item.id} className="space-y-4 rounded-2xl border border-border/70 p-4">
                    {renderFormulario(config, edicao, atualizarEdicao)}
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setItemEmEdicao(null);
                          setEdicao(null);
                        }}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={guardarEdicao}
                        disabled={!itemValido(edicao)}
                      >
                        <Save className="mr-2 h-4 w-4" />
                        Guardar
                      </Button>
                    </div>
                  </div>
                );
              }

              return (
                <RelatedItem
                  key={item.id}
                  icon={config.icon}
                  title={item.nome}
                  description={item.descricao}
                  meta={`${item.tipo} · ${itemMeta(item)}`}
                  actions={
                    <>
                      <Button type="button" variant="ghost" size="sm" onClick={() => iniciarEdicao(item)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                      <Button type="button" variant="secondary" size="sm" onClick={() => apagarItem(item)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Apagar
                      </Button>
                    </>
                  }
                />
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <WorkspaceSection className="border-border/60 bg-white shadow-none">
      <SectionTitle
        icon={Building2}
        title="Relacionados"
        description="Relações que começam a preparar o Knowledge Graph do Dossiê."
      />

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {categorias.map((config) => {
          const Icon = config.icon;
          const total = totalCategoria(config.value);

          return (
            <Card key={config.value} className="flex min-h-48 min-w-0 flex-col p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <StatusBadge tone="muted" dot={false}>
                  {total} {total === 1 ? "item" : "itens"}
                </StatusBadge>
              </div>
              <div className="mt-4 min-w-0">
                <h3 className="line-clamp-1 text-base font-semibold text-foreground">{config.label}</h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                  {config.description}
                </p>
              </div>
              <div className="mt-auto flex justify-end pt-5">
                <Button type="button" variant="secondary" size="sm" onClick={() => abrirCategoria(config.value)}>
                  Gerir
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog
        open={Boolean(configAberta)}
        onOpenChange={(open) => {
          if (!open) fecharCategoria();
        }}
      >
        {configAberta && (
          <DialogContent className="max-h-[86vh] w-[calc(100vw-2rem)] max-w-5xl overflow-y-auto rounded-2xl border-border/70 p-0">
            <DialogHeader className="border-b border-border/70 px-6 py-5">
              <DialogTitle className="text-xl">{configAberta.label}</DialogTitle>
              <DialogDescription>{configAberta.description}</DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 p-6">
              {configAberta.value === "documentos" && (
                <ManagementBlock
                  title="Documentos existentes"
                  description="Associa documentos reais já registados no sistema sem os duplicar."
                >
                  {renderDocumentosReais()}
                </ManagementBlock>
              )}

              {configAberta.value === "assembleias" && (
                <ManagementBlock
                  title="Assembleias existentes"
                  description="Associa assembleias reais já registadas no sistema sem as duplicar."
                >
                  {renderAssembleiasReais()}
                </ManagementBlock>
              )}

              <ManagementBlock
                title={`${configAberta.label} manuais`}
                description="Itens criados diretamente neste Dossiê."
              >
                {renderManuais(configAberta)}
              </ManagementBlock>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </WorkspaceSection>
  );
}

function ManagementBlock({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/70 bg-card p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function RelatedItem({
  icon: Icon,
  title,
  description,
  meta,
  actions,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  meta?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-4 rounded-2xl border border-border/70 bg-background p-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          <h4 className="line-clamp-2 break-words text-sm font-semibold leading-6 text-foreground">{title}</h4>
          {description && (
            <p className="mt-1 line-clamp-2 break-words text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          )}
          {meta && <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">{meta}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap justify-end gap-2">{actions}</div>}
    </div>
  );
}
