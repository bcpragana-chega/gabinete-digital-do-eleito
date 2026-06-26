import {
  AdicionarItemPreparacao,
  type CampoPreparacao,
} from "@/components/preparacao/AdicionarItemPreparacao";
import {
  adicionarPergunta,
  type NivelPrioridade,
} from "@/lib/preparacao-store";

type Props = {
  assembleiaId: string;
  onAdicionar: () => void;
};

const campos: CampoPreparacao[] = [
  {
    tipo: "text",
    nome: "tema",
    label: "Tema",
    placeholder: "Ex: Iluminação pública",
    obrigatorio: true,
  },
  {
    tipo: "textarea",
    nome: "pergunta",
    label: "Pergunta",
    placeholder: "Ex: Qual é o plano da Junta para resolver este problema?",
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
];

export function AdicionarPerguntaDialog({ assembleiaId, onAdicionar }: Props) {
  return (
    <AdicionarItemPreparacao
      tituloFormulario="Nova pergunta"
      descricaoFormulario="Registe uma pergunta para usar durante a assembleia."
      textoGuardar="Guardar pergunta"
      campos={campos}
      valoresIniciais={{
        tema: "",
        pergunta: "",
        prioridade: "Média",
      }}
      onGuardar={(valores) => {
        adicionarPergunta(assembleiaId, {
          tema: valores.tema.trim(),
          pergunta: valores.pergunta.trim(),
          prioridade: valores.prioridade as NivelPrioridade,
          documentos: [],
        });

        onAdicionar();
      }}
    />
  );
}