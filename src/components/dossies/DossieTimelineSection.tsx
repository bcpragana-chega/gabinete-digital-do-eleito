import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  CalendarDays,
  FileText,
  Handshake,
  MessageSquareText,
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
import { InfoCard } from "@/components/ui/cards";
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
import { Timeline, TimelineItem } from "@/components/ui/timeline";
import { WorkspaceSection } from "@/components/ui/workspace";
import {
  adicionarEventoTimelineDossie,
  apagarEventoTimelineDossie,
  editarEventoTimelineDossie,
  useEventosTimelineDossie,
  type DossieTimelineEventoInput,
} from "@/lib/dossie-timeline-store";
import type { DossieTimelineEvento, TipoEventoTimelineDossie } from "@/lib/types";

type DossieTimelineSectionProps = {
  dossieId: string;
};

const tiposEvento: Array<{ value: TipoEventoTimelineDossie; label: string; icon: LucideIcon }> = [
  { value: "nota", label: "Nota", icon: MessageSquareText },
  { value: "documento", label: "Documento", icon: FileText },
  { value: "assembleia", label: "Sessão", icon: NotebookText },
  { value: "compromisso", label: "Compromisso", icon: ScrollText },
  { value: "reunião", label: "Reunião", icon: Users },
  { value: "outro", label: "Outro", icon: Handshake },
];

function criarInputVazio(): DossieTimelineEventoInput {
  return {
    titulo: "",
    descricao: "",
    data: new Date().toISOString().slice(0, 10),
    tipo: "outro",
  };
}

function tipoConfig(tipo: TipoEventoTimelineDossie) {
  return tiposEvento.find((item) => item.value === tipo) ?? tiposEvento[tiposEvento.length - 1];
}

function formatarData(data?: string) {
  if (!data) return "Sem data";

  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${data}T00:00:00`));
}

function eventoMeta(evento: DossieTimelineEvento) {
  const criado = formatarData(evento.createdAt.slice(0, 10));

  if (evento.updatedAt && evento.updatedAt !== evento.createdAt) {
    return `Atualizado · criado em ${criado}`;
  }

  return `Criado em ${criado}`;
}

function eventoValido(input: DossieTimelineEventoInput) {
  return Boolean(input.titulo.trim() && input.descricao.trim() && input.data && input.tipo);
}

export function DossieTimelineSection({ dossieId }: DossieTimelineSectionProps) {
  const eventos = useEventosTimelineDossie(dossieId);
  const [aCriar, setACriar] = useState(false);
  const [novoEvento, setNovoEvento] = useState<DossieTimelineEventoInput>(criarInputVazio);
  const [eventoEmEdicao, setEventoEmEdicao] = useState<string | null>(null);
  const [edicao, setEdicao] = useState<DossieTimelineEventoInput>(criarInputVazio);

  function atualizarNovo(campo: keyof DossieTimelineEventoInput, valor: string) {
    setNovoEvento((atual) => ({ ...atual, [campo]: valor }));
  }

  function atualizarEdicao(campo: keyof DossieTimelineEventoInput, valor: string) {
    setEdicao((atual) => ({ ...atual, [campo]: valor }));
  }

  function criarEvento() {
    if (!eventoValido(novoEvento)) return;

    adicionarEventoTimelineDossie(dossieId, {
      ...novoEvento,
      titulo: novoEvento.titulo.trim(),
      descricao: novoEvento.descricao.trim(),
    });
    setNovoEvento(criarInputVazio());
    setACriar(false);
  }

  function iniciarEdicao(evento: DossieTimelineEvento) {
    setEventoEmEdicao(evento.id);
    setEdicao({
      titulo: evento.titulo,
      descricao: evento.descricao,
      data: evento.data,
      tipo: evento.tipo,
    });
  }

  function guardarEdicao() {
    if (!eventoEmEdicao || !eventoValido(edicao)) return;

    editarEventoTimelineDossie(eventoEmEdicao, {
      ...edicao,
      titulo: edicao.titulo.trim(),
      descricao: edicao.descricao.trim(),
    });
    setEventoEmEdicao(null);
    setEdicao(criarInputVazio());
  }

  function apagarEvento(evento: DossieTimelineEvento) {
    const confirmado = window.confirm("Apagar este evento da timeline?");
    if (!confirmado) return;

    apagarEventoTimelineDossie(evento.id);
  }

  function renderFormulario(
    input: DossieTimelineEventoInput,
    onChange: (campo: keyof DossieTimelineEventoInput, valor: string) => void,
  ) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-[1fr_180px]">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="timeline-titulo">
              Título
            </label>
            <Input
              id="timeline-titulo"
              value={input.titulo}
              onChange={(event) => onChange("titulo", event.target.value)}
              placeholder="Ex.: Reunião com moradores"
              className="bg-card"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="timeline-data">
              Data
            </label>
            <Input
              id="timeline-data"
              type="date"
              value={input.data}
              onChange={(event) => onChange("data", event.target.value)}
              className="bg-card"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Tipo</label>
          <Select
            value={input.tipo}
            onValueChange={(value) => onChange("tipo", value as TipoEventoTimelineDossie)}
          >
            <SelectTrigger className="bg-card">
              <SelectValue placeholder="Selecionar tipo" />
            </SelectTrigger>
            <SelectContent>
              {tiposEvento.map((tipo) => (
                <SelectItem key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="timeline-descricao">
            Descrição
          </label>
          <Textarea
            id="timeline-descricao"
            value={input.descricao}
            onChange={(event) => onChange("descricao", event.target.value)}
            placeholder="Descreve o que aconteceu e porque importa para este assunto..."
            className="min-h-28 resize-y bg-card"
          />
        </div>
      </div>
    );
  }

  return (
    <WorkspaceSection
      className=""
      actions={
        !aCriar && (
          <Button type="button" variant="secondary" size="sm" onClick={() => setACriar(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar acontecimento
          </Button>
        )
      }
    >
      <SectionTitle
        icon={CalendarDays}
        title="O que aconteceu"
        description="História manual e automática deste assunto ao longo do mandato."
      />

      <div className="mt-5 space-y-5">
        {aCriar && (
          <InfoCard
            title="Novo acontecimento"
            description="Regista algo importante para este assunto."
          >
            {renderFormulario(novoEvento, atualizarNovo)}
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setACriar(false);
                  setNovoEvento(criarInputVazio());
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={criarEvento}
                disabled={!eventoValido(novoEvento)}
              >
                <Save className="mr-2 h-4 w-4" />
                Guardar acontecimento
              </Button>
            </div>
          </InfoCard>
        )}

        {eventos.length === 0 && !aCriar ? (
          <EmptyState
            compact
            title="Ainda não há acontecimentos."
            description="Adiciona o primeiro acontecimento para começar a contar a história deste assunto."
            action={
              <Button type="button" size="sm" onClick={() => setACriar(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar acontecimento
              </Button>
            }
          />
        ) : (
          <Timeline>
            {eventos.map((evento) => {
              const emEdicao = eventoEmEdicao === evento.id;
              const config = tipoConfig(evento.tipo);

              return (
                <TimelineItem
                  key={evento.id}
                  icon={config.icon}
                  title={evento.titulo}
                  description={emEdicao ? undefined : evento.descricao}
                  meta={formatarData(evento.data)}
                >
                  {emEdicao ? (
                    <>
                      {renderFormulario(edicao, atualizarEdicao)}
                      <div className="mt-4 flex flex-wrap justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEventoEmEdicao(null);
                            setEdicao(criarInputVazio());
                          }}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={guardarEdicao}
                          disabled={!eventoValido(edicao)}
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
                          {config.label}
                        </StatusBadge>
                        {evento.automatico && (
                          <StatusBadge tone="info" dot={false}>
                            Automático
                          </StatusBadge>
                        )}
                        <span className="text-xs text-muted-foreground">{eventoMeta(evento)}</span>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        {evento.origemHref && (
                          <Button asChild type="button" variant="ghost" size="sm">
                            <a href={evento.origemHref}>Abrir origem</a>
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => iniciarEdicao(evento)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => apagarEvento(evento)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Apagar
                        </Button>
                      </div>
                    </div>
                  )}
                </TimelineItem>
              );
            })}
          </Timeline>
        )}
      </div>
    </WorkspaceSection>
  );
}
