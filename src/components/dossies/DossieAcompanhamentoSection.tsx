import { useMemo, useRef, useState } from "react";
import { CheckCircle2, Clock3, Plus, Save, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InfoCard } from "@/components/ui/cards";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SectionTitle, StatusBadge } from "@/components/ui/common";
import { Timeline, TimelineItem } from "@/components/ui/timeline";
import { WorkspaceSection } from "@/components/ui/workspace";
import {
  documentosAssociaveisAoAcompanhamento,
  encerrarAcompanhamento,
  registarAcontecimento,
  resolverAcompanhamento,
  useAcompanhamentos,
} from "@/lib/acompanhamentos-store";
import {
  acompanhamentoEncerrado,
  obterEstadoAtualAcompanhamento,
} from "@/lib/acompanhamento-politico";
import type { TipoAcompanhamentoPolitico } from "@/lib/types";

const tipos: Array<{ value: TipoAcompanhamentoPolitico; label: string }> = [
  { value: "entrega", label: "Entrega" },
  { value: "resposta", label: "Resposta" },
  { value: "insistencia", label: "Insistência" },
  { value: "regresso_sessao", label: "Regresso à sessão" },
  { value: "comunicacao_publica", label: "Comunicação pública" },
  { value: "nota", label: "Nota" },
];

const labelsEstado = {
  a_preparar: "A preparar",
  a_aguardar: "A aguardar",
  resposta_recebida: "Resposta recebida",
  exige_acao: "Exige ação",
  resolvido: "Resolvido",
  encerrado_sem_resolucao: "Encerrado sem resolução",
};

function hoje() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatarData(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00`));
}

export function DossieAcompanhamentoSection({ dossieId }: { dossieId: string }) {
  const eventos = useAcompanhamentos(dossieId);
  const documentos = useMemo(() => documentosAssociaveisAoAcompanhamento(dossieId), [dossieId]);
  const atual = eventos[0];
  const estado = obterEstadoAtualAcompanhamento(eventos);
  const fechado = acompanhamentoEncerrado(estado);
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState<TipoAcompanhamentoPolitico>("entrega");
  const [data, setData] = useState(hoje);
  const [descricao, setDescricao] = useState("");
  const [destinatario, setDestinatario] = useState("");
  const [prazo, setPrazo] = useState("");
  const [proximaAcaoEm, setProximaAcaoEm] = useState("");
  const [documentoId, setDocumentoId] = useState("sem-documento");
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState("");
  const mutacao = useRef(false);

  async function executar(acao: () => Promise<unknown>) {
    if (mutacao.current) return;
    mutacao.current = true;
    setAGuardar(true);
    setErro("");
    try {
      await acao();
      setAberto(false);
      setDescricao("");
      setDestinatario("");
      setPrazo("");
      setProximaAcaoEm("");
      setDocumentoId("sem-documento");
    } catch {
      setErro("Não foi possível guardar o acompanhamento. Confirma os dados e tenta novamente.");
    } finally {
      mutacao.current = false;
      setAGuardar(false);
    }
  }

  const mostraDestinatario = tipo === "entrega" || tipo === "resposta" || tipo === "insistencia";
  const mostraPlaneamento = tipo !== "resposta" && tipo !== "nota";

  return (
    <WorkspaceSection
      id="acompanhamento"
      className="scroll-mt-24"
      actions={
        !aberto && !fechado ? (
          <Button type="button" variant="secondary" size="sm" onClick={() => setAberto(true)}>
            <Plus className="mr-2 h-4 w-4" /> Registar acontecimento
          </Button>
        ) : undefined
      }
    >
      <SectionTitle
        icon={Clock3}
        title="Acompanhamento"
        description="Entregas, respostas e próximas ações deste problema político."
      />

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <InfoCard title="Estado atual" description={labelsEstado[estado]} />
        <InfoCard
          title="Próxima ação"
          description={
            atual?.proximaAcaoEm ? formatarData(atual.proximaAcaoEm) : "Sem ação marcada"
          }
        />
        <InfoCard
          title="Prazo"
          description={atual?.prazo ? formatarData(atual.prazo) : "Sem prazo"}
        />
      </div>

      {erro && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {erro}
        </p>
      )}

      {aberto && (
        <InfoCard
          className="mt-5"
          title="Registar acontecimento"
          description="Guarda apenas o essencial desta ação."
        >
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Tipo</label>
              <Select
                value={tipo}
                onValueChange={(value) => setTipo(value as TipoAcompanhamentoPolitico)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tipos.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="acompanhamento-data"
                className="text-xs font-medium text-muted-foreground"
              >
                Data
              </label>
              <Input
                id="acompanhamento-data"
                type="date"
                value={data}
                onChange={(event) => setData(event.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <label
              htmlFor="acompanhamento-descricao"
              className="text-xs font-medium text-muted-foreground"
            >
              Descrição
            </label>
            <Textarea
              id="acompanhamento-descricao"
              value={descricao}
              onChange={(event) => setDescricao(event.target.value)}
              placeholder="O que aconteceu e qual é o resultado?"
              className="min-h-24"
            />
          </div>
          {mostraDestinatario && (
            <div className="mt-4 space-y-2">
              <label
                htmlFor="acompanhamento-destinatario"
                className="text-xs font-medium text-muted-foreground"
              >
                Destinatário (opcional)
              </label>
              <Input
                id="acompanhamento-destinatario"
                value={destinatario}
                onChange={(event) => setDestinatario(event.target.value)}
              />
            </div>
          )}
          {mostraPlaneamento && (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="acompanhamento-prazo"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Prazo (opcional)
                </label>
                <Input
                  id="acompanhamento-prazo"
                  type="date"
                  value={prazo}
                  onChange={(event) => setPrazo(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="acompanhamento-proxima"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Próxima ação (opcional)
                </label>
                <Input
                  id="acompanhamento-proxima"
                  type="date"
                  value={proximaAcaoEm}
                  onChange={(event) => setProximaAcaoEm(event.target.value)}
                />
              </div>
            </div>
          )}
          {documentos.length > 0 && (
            <div className="mt-4 space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Documento criado (opcional)
              </label>
              <Select value={documentoId} onValueChange={setDocumentoId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sem-documento">Sem documento associado</SelectItem>
                  {documentos.map((documento) => (
                    <SelectItem key={documento.id} value={documento.id}>
                      {documento.titulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setAberto(false)}>
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!data || !descricao.trim() || aGuardar}
              onClick={() =>
                void executar(() =>
                  registarAcontecimento(dossieId, {
                    tipo,
                    data,
                    descricao,
                    destinatario,
                    prazo,
                    proximaAcaoEm,
                    documentoCriadoId: documentoId === "sem-documento" ? undefined : documentoId,
                  }),
                )
              }
            >
              <Save className="mr-2 h-4 w-4" />
              {aGuardar ? "A guardar…" : "Guardar"}
            </Button>
          </div>
        </InfoCard>
      )}

      {!fechado && eventos.length > 0 && !aberto && (
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={aGuardar}
            onClick={() => void executar(() => resolverAcompanhamento(dossieId))}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Marcar como resolvido
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={aGuardar}
            onClick={() =>
              window.confirm("Encerrar este acompanhamento sem resolução?") &&
              void executar(() => encerrarAcompanhamento(dossieId))
            }
          >
            <XCircle className="mr-2 h-4 w-4" />
            Encerrar sem resolução
          </Button>
        </div>
      )}

      <Timeline className="mt-6">
        {eventos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ainda não existem acontecimentos de acompanhamento.
          </p>
        ) : (
          eventos.map((evento) => (
            <TimelineItem
              key={evento.id}
              icon={evento.tipo === "resolucao" ? CheckCircle2 : Clock3}
              title={tipos.find((item) => item.value === evento.tipo)?.label ?? "Resolução"}
              description={evento.descricao}
              meta={`${formatarData(evento.data)} · ${labelsEstado[evento.estado]}`}
            >
              <div className="mt-2 flex flex-wrap gap-2">
                {evento.destinatario && (
                  <StatusBadge tone="muted" dot={false}>
                    {evento.destinatario}
                  </StatusBadge>
                )}
                {evento.prazo && (
                  <StatusBadge tone="warning" dot={false}>
                    Prazo: {formatarData(evento.prazo)}
                  </StatusBadge>
                )}
                {evento.proximaAcaoEm && (
                  <StatusBadge tone="info" dot={false}>
                    Próxima ação: {formatarData(evento.proximaAcaoEm)}
                  </StatusBadge>
                )}
              </div>
            </TimelineItem>
          ))
        )}
      </Timeline>
    </WorkspaceSection>
  );
}
