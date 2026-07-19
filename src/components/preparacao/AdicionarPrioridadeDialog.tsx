import {
  AdicionarItemPreparacao,
  type CampoPreparacao,
} from "@/components/preparacao/AdicionarItemPreparacao";
import {
  adicionarPrioridade,
  type EstadoPrioridade,
  type NivelPrioridade,
} from "@/lib/preparacao-store";

type Props = {
  assembleiaId: string;
  onAdicionar: () => void;
};

const campos: CampoPreparacao[] = [
  {
    tipo: "text",
    nome: "titulo",
    label: "Título",
    placeholder: "Ex: Iluminação pública em Porches",
    obrigatorio: true,
  },
  {
    tipo: "textarea",
    nome: "descricao",
    label: "Descrição",
    placeholder: "Explique o que pretende defender, perguntar ou acompanhar.",
    obrigatorio: true,
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
    tipo: "select",
    nome: "estado",
    label: "Estado",
    opcoes: ["Por preparar", "Preparado", "Acompanhar"],
    obrigatorio: true,
  },
];

export function AdicionarPrioridadeDialog({ assembleiaId, onAdicionar }: Props) {
  return (
    <AdicionarItemPreparacao
      tituloFormulario="Nova prioridade"
      descricaoFormulario="Defina um tema que pretende preparar para esta sessão."
      textoGuardar="Guardar prioridade"
      campos={campos}
      valoresIniciais={{
        titulo: "",
        descricao: "",
        prioridade: "Média",
        estado: "Por preparar",
      }}
      onGuardar={(valores) => {
        adicionarPrioridade(assembleiaId, {
          titulo: valores.titulo.trim(),
          descricao: valores.descricao.trim(),
          prioridade: valores.prioridade as NivelPrioridade,
          estado: valores.estado as EstadoPrioridade,
          documentos: [],
        });

        onAdicionar();
      }}
    />
  );
}
