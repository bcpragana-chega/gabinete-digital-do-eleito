import {
  AdicionarItemPreparacao,
  type CampoPreparacao,
} from "@/components/preparacao/AdicionarItemPreparacao";
import { adicionarPonto, type NivelPrioridade } from "@/lib/pontos-store";

type Props = {
  assembleiaId: string;
  onAdicionar: () => void;
};

const campos: CampoPreparacao[] = [
  {
    tipo: "text",
    nome: "titulo",
    label: "Título do ponto",
    placeholder: "Ex: Iluminação pública em Porches",
    obrigatorio: true,
  },
  {
    tipo: "textarea",
    nome: "descricao",
    label: "Descrição",
    placeholder: "Resumo do ponto da ordem de trabalhos.",
    rows: 4,
  },
  {
    tipo: "select",
    nome: "prioridade",
    label: "Prioridade",
    opcoes: ["Alta", "Média", "Baixa"],
    obrigatorio: true,
  },
  {
    tipo: "text",
    nome: "tempoEstimado",
    label: "Tempo estimado em minutos",
    placeholder: "Ex: 10",
  },
];

export function AdicionarPontoDialog({ assembleiaId, onAdicionar }: Props) {
  return (
    <AdicionarItemPreparacao
      tituloFormulario="Novo ponto"
      descricaoFormulario="Adicione um ponto da ordem de trabalhos para preparar esta sessão."
      textoGuardar="Guardar ponto"
      campos={campos}
      valoresIniciais={{
        titulo: "",
        descricao: "",
        prioridade: "Média",
        tempoEstimado: "",
      }}
      onGuardar={(valores) => {
        adicionarPonto(assembleiaId, {
          titulo: valores.titulo.trim(),
          descricao: valores.descricao.trim(),
          prioridade: valores.prioridade as NivelPrioridade,
          tempoEstimado: valores.tempoEstimado ? Number(valores.tempoEstimado) : undefined,
        });

        onAdicionar();
      }}
    />
  );
}
