import { ClipboardList, NotebookText } from "lucide-react";
import { StrategyField } from "@/components/estrategia/StrategyField";
import { SectionTitle } from "@/components/ui/common";
import { WorkspaceSection } from "@/components/ui/workspace";

export type PontoPreparacaoCampos = {
  descricao: string;
  objetivoPolitico: string;
  riscos: string;
  linhaIntervencao: string;
  notasInternas: string;
};

export function PontoPreparacaoForm({
  campos,
  onChange,
}: {
  campos: PontoPreparacaoCampos;
  onChange: (campo: keyof PontoPreparacaoCampos, valor: string) => void;
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
