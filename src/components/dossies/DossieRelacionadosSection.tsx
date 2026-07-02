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
import { EntityCard, InfoCard } from "@/components/ui/cards";
import { SectionTitle, StatusBadge } from "@/components/ui/common";
import { EmptyState } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
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

  documentos.forEach((documento) => {
    porId.set(documento.id, documento);
  });

  return Array.from(porId.values()).sort((a, b) => b.data.localeCompare(a.data));
}

function assembleiasUnicas(assembleias: Assembleia[]) {
  const porId = new Map<string, Assembleia>();

  assembleias.forEach((assembleia) => {
    porId.set(assembleia.id, assembleia);
  });

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

    return () => {
      window.removeEventListener("storage", atualizar);
    };
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

    return () => {
      window.removeEventListener("storage", atualizar);
    };
  }, []);

  return assembleias;
}

export function DossieRelacionadosSection({ dossieId }: DossieRelacionadosSectionProps) {
  const relacionados = useRelacionadosDossie(dossieId);
  const documentosExistentes = useDocumentosExistentes();
  const relacoesDocumentos = useDocumentosDoDossie(dossieId);
  const assembleiasExistentes = useAssembleiasExistentes();
  const relacoesAssembleias = useAssembleiasDoDossie(dossieId);
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

  function relacionadosDaCategoria(categoria: CategoriaRelacionadoDossie) {
    return relacionados.filter((item) => item.categoria === categoria);
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
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-[1fr_180px]">
          <div className="space-y-2">
            <label
              className="text-xs font-medium text-muted-foreground"
              htmlFor={`${config.value}-nome`}
            >
              Nome / título
            </label>
            <Input
              id={`${config.value}-nome`}
              value={input.nome}
              onChange={(event) => onChange("nome", event.target.value)}
              placeholder={`Ex.: ${config.singular} relevante`}
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <label
              className="text-xs font-medium text-muted-foreground"
              htmlFor={`${config.value}-tipo`}
            >
              Tipo
            </label>
            <Input
              id={`${config.value}-tipo`}
              value={input.tipo}
              onChange={(event) => onChange("tipo", event.target.value)}
              placeholder={config.tipoPlaceholder}
              className="bg-background"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label
            className="text-xs font-medium text-muted-foreground"
            htmlFor={`${config.value}-descricao`}
          >
            Descrição curta
          </label>
          <Textarea
            id={`${config.value}-descricao`}
            value={input.descricao}
            onChange={(event) => onChange("descricao", event.target.value)}
            placeholder="Explica porque este item importa para o Dossiê..."
            className="min-h-24 resize-y bg-background"
          />
        </div>
      </div>
    );
  }

  return (
    <WorkspaceSection>
      <SectionTitle
        icon={Building2}
        title="Relacionados"
        description="Relações manuais que começam a preparar o Knowledge Graph do Dossiê."
      />

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {categorias.map((config) => {
          const itens = relacionadosDaCategoria(config.value);
          const totalItens = (() => {
            if (config.value === "documentos") return itens.length + documentosAssociados.length;
            if (config.value === "assembleias") return itens.length + assembleiasAssociadas.length;
            return itens.length;
          })();
          const Icon = config.icon;
          const estaACriar = categoriaEmCriacao === config.value && novoItem;

          return (
            <EntityCard
              key={config.value}
              icon={config.icon}
              eyebrow="Relacionado"
              title={config.label}
              description={config.description}
              meta={
                <StatusBadge tone="muted" dot={false}>
                  {totalItens} {totalItens === 1 ? "item" : "itens"}
                </StatusBadge>
              }
              actions={
                !estaACriar && (
                  <Button type="button" variant="outline" size="sm" onClick={() => iniciarCriacao(config.value)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar
                  </Button>
                )
              }
            >
              <div className="space-y-4">
                {config.value === "documentos" && (
                  <InfoCard
                    title="Documentos existentes"
                    description="Associa documentos reais já registados no sistema sem os duplicar."
                  >
                    {documentosExistentes.length === 0 ? (
                      <EmptyState
                        compact
                        title="Ainda não há documentos disponíveis."
                        description="Quando existirem documentos no sistema, poderás associá-los aqui."
                      />
                    ) : (
                      <div className="space-y-4">
                        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                          <Select
                            value={documentoParaAssociar}
                            onValueChange={setDocumentoParaAssociar}
                            disabled={documentosDisponiveis.length === 0}
                          >
                            <SelectTrigger className="bg-background">
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
                          <div className="space-y-3">
                            {documentosAssociados.map((documento) => (
                              <InfoCard
                                key={documento.id}
                                icon={FileText}
                                title={documento.titulo}
                                description={documento.notas || "Documento associado ao Dossiê."}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <StatusBadge tone="muted" dot={false}>
                                      {documento.tipo}
                                    </StatusBadge>
                                    <StatusBadge tone="info" dot={false}>
                                      {documento.estado}
                                    </StatusBadge>
                                    <span className="text-xs text-muted-foreground">
                                      {formatarData(documento.data)}
                                    </span>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => desassociarDocumento(documento)}
                                  >
                                    <X className="mr-2 h-4 w-4" />
                                    Desassociar
                                  </Button>
                                </div>
                              </InfoCard>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </InfoCard>
                )}

                {config.value === "assembleias" && (
                  <InfoCard
                    title="Assembleias existentes"
                    description="Associa assembleias reais já registadas no sistema sem as duplicar."
                  >
                    {assembleiasExistentes.length === 0 ? (
                      <EmptyState
                        compact
                        title="Ainda não há assembleias disponíveis."
                        description="Quando existirem assembleias no sistema, poderás associá-las aqui."
                      />
                    ) : (
                      <div className="space-y-4">
                        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                          <Select
                            value={assembleiaParaAssociar}
                            onValueChange={setAssembleiaParaAssociar}
                            disabled={assembleiasDisponiveis.length === 0}
                          >
                            <SelectTrigger className="bg-background">
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
                          <div className="space-y-3">
                            {assembleiasAssociadas.map((assembleia) => (
                              <InfoCard
                                key={assembleia.id}
                                icon={NotebookText}
                                title={assembleia.nome}
                                description={assembleia.local}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <StatusBadge tone="muted" dot={false}>
                                      {assembleia.estado}
                                    </StatusBadge>
                                    <span className="text-xs text-muted-foreground">
                                      {formatarData(assembleia.data)}
                                      {assembleia.hora ? ` · ${assembleia.hora}` : ""}
                                    </span>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => desassociarAssembleia(assembleia)}
                                  >
                                    <X className="mr-2 h-4 w-4" />
                                    Desassociar
                                  </Button>
                                </div>
                              </InfoCard>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </InfoCard>
                )}

                {estaACriar && (
                  <InfoCard
                    title={`Novo ${config.singular.toLowerCase()}`}
                    description="Este item fica apenas ligado manualmente ao Dossiê."
                  >
                    {renderFormulario(config, novoItem, atualizarNovo)}
                    <div className="mt-4 flex flex-wrap justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
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
                  </InfoCard>
                )}

                {itens.length === 0 && !estaACriar ? (
                  <EmptyState
                    compact
                    title={`Sem ${config.label.toLowerCase()} relacionados.`}
                    description="Adiciona um item manual para começar a ligar conhecimento."
                  />
                ) : (
                  itens.map((item) => {
                    const emEdicao = itemEmEdicao === item.id && edicao;

                    return (
                      <InfoCard key={item.id} icon={Icon} title={item.nome} description={emEdicao ? undefined : item.descricao}>
                        {emEdicao ? (
                          <>
                            {renderFormulario(config, edicao, atualizarEdicao)}
                            <div className="mt-4 flex flex-wrap justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
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
                          </>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <StatusBadge tone="muted" dot={false}>
                                {item.tipo}
                              </StatusBadge>
                              <span className="text-xs text-muted-foreground">{itemMeta(item)}</span>
                            </div>
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => iniciarEdicao(item)}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => apagarItem(item)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Apagar
                              </Button>
                            </div>
                          </div>
                        )}
                      </InfoCard>
                    );
                  })
                )}
              </div>
            </EntityCard>
          );
        })}
      </div>
    </WorkspaceSection>
  );
}
