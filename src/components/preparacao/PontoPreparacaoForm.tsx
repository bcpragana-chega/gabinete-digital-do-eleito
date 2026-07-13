import { ClipboardList, NotebookText } from "lucide-react";
import { StrategyField } from "@/components/estrategia/StrategyField";
import { SectionTitle } from "@/components/ui/common";
import { WorkspaceSection } from "@/components/ui/workspace";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EstadoPonto, SentidoVoto } from "@/lib/pontos-store";

export type PontoPreparacaoCampos = {
  descricao: string;
  objetivoPolitico: string;
  posicaoPolitica: string;
  riscos: string;
  linhaIntervencao: string;
  notasInternas: string;
};

export function PontoPreparacaoForm({
  campos,
  onChange,
  estado,
  sentidoVoto,
  onEstadoChange,
  onSentidoVotoChange,
}: {
  campos: PontoPreparacaoCampos;
  onChange: (campo: keyof PontoPreparacaoCampos, valor: string) => void;
  estado: EstadoPonto;
  sentidoVoto: SentidoVoto;
  onEstadoChange: (estado: EstadoPonto) => void;
  onSentidoVotoChange: (voto: SentidoVoto) => void;
}) {
  return (
    <>
      <WorkspaceSection>
        <SectionTitle
          icon={ClipboardList}
          title="Estratégia"
          description="Resumo, objetivo político, riscos e linha de intervenção. As alterações são guardadas automaticamente."
        />

        <div className="mt-5 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado de preparação</label>
              <Select
                value={estado}
                onValueChange={(value) => onEstadoChange(value as EstadoPonto)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Por preparar", "Em preparação", "Preparado", "Concluído"].map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sentido de voto</label>
              <Select
                value={sentidoVoto}
                onValueChange={(value) => onSentidoVotoChange(value as SentidoVoto)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Por decidir", "A favor", "Contra", "Abstenção", "Livre"].map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <StrategyField
            label="Posição política"
            value={campos.posicaoPolitica}
            placeholder="Posição a defender neste ponto."
            onChange={(valor) => onChange("posicaoPolitica", valor)}
          />
          <StrategyField
            label="Resumo do ponto"
            value={campos.descricao}
            placeholder="Resumo curto do que está em discussão neste ponto."
            rows={5}
            onChange={(valor) => onChange("descricao", valor)}
          />

          <StrategyField
            label="Objetivo político"
            value={campos.objetivoPolitico}
            placeholder="Ex: Mostrar impacto concreto na freguesia e exigir calendário de execução."
            onChange={(valor) => onChange("objetivoPolitico", valor)}
          />

          <StrategyField
            label="Riscos"
            value={campos.riscos}
            placeholder="Riscos políticos, técnicos ou procedimentais a ter em conta."
            onChange={(valor) => onChange("riscos", valor)}
          />

          <StrategyField
            label="Linha de intervenção"
            value={campos.linhaIntervencao}
            placeholder="Como intervir neste ponto: tom, argumentos centrais e sequência."
            rows={6}
            onChange={(valor) => onChange("linhaIntervencao", valor)}
          />
        </div>
      </WorkspaceSection>

      <WorkspaceSection>
        <SectionTitle
          icon={NotebookText}
          title="Notas internas"
          description="Apontamentos de preparação, cautelas, perguntas e informação de apoio."
        />

        <div className="mt-5">
          <StrategyField
            label="Notas internas"
            value={campos.notasInternas}
            placeholder="Notas de preparação, cautelas, perguntas ou apontamentos internos."
            rows={7}
            onChange={(valor) => onChange("notasInternas", valor)}
          />
        </div>
      </WorkspaceSection>
    </>
  );
}
