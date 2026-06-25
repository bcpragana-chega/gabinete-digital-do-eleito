
# Fase 2 — Centro Visual de Preparação da Assembleia

Objetivo: transformar `/assembleias/:id/preparacao` num **mockup visual rico** que permita validar se o layout de preparação é útil e claro para um eleito local. Sem CRUD, sem persistência, sem localStorage, sem IA, sem formulários. Apenas cartões mock com dados autárquicos realistas, no mesmo design premium da Fase 1.

## Âmbito

A página de preparação deixa de ter placeholders e passa a ter quatro secções totalmente renderizadas a partir de dados mock estáticos:

1. Prioridades da Assembleia
2. Perguntas sugeridas
3. Ações pendentes
4. Documentos a criar

Os botões existem visualmente mas não têm comportamento (ou abrem um `Tooltip` "Disponível em breve"). Nenhuma rota nova, nenhum estado, nenhuma escrita.

## Dados mock

Novo ficheiro `src/lib/mock-preparacao.ts` exportando quatro arrays tipados, com os temas pedidos:

- Execução do PPI
- Transferências correntes
- Novas instalações da Junta
- Centro Cultural D. Dinis
- Transferências de capital
- Aquisição de terrenos para estacionamento

**Fallback:** os mesmos arrays são usados para qualquer `:id`. A página nunca aparece vazia — independentemente da assembleia selecionada, mostra sempre estes mocks. Sem ramificação por `id`.

Tipos:

```ts
type Prioridade = "Alta" | "Média" | "Baixa";

type PrioridadeAssembleia = {
  id: string;
  titulo: string;
  prioridade: Prioridade;
  descricao: string;
  documentos: string[];          // títulos dos documentos relacionados
  estado: "Por preparar" | "Preparado" | "Acompanhar";
};

type PerguntaSugerida = {
  id: string;
  tema: string;
  pergunta: string;
  prioridade: Prioridade;
  documentos: string[];
};

type AcaoPendente = {
  id: string;
  tarefa: string;
  estado: "Pendente" | "Em curso" | "Concluída";
  prazo?: string;                // ex.: "15 jul 2026"
};

type DocumentoACriar = {
  id: string;
  tipo: "Moção" | "Recomendação" | "Requerimento" | "Declaração de voto" | "Intervenção";
  motivo: string;
  prioridade: Prioridade;
};
```

Cada array com 3–4 entradas distribuídas pelos temas acima.

## Componentes novos

Todos em `src/components/preparacao/`, sem estado, props-in props-out, usando os tokens já definidos:

- `PrioridadeCard.tsx` — header com título + badge de prioridade, descrição, lista discreta de documentos relacionados, badge de estado no rodapé.
- `PerguntaCard.tsx` — chip de tema, pergunta em destaque, badge de prioridade, documentos relacionados, botão `Selecionar pergunta` (visual, sem `onClick`).
- `AcaoCard.tsx` — tarefa, badge de estado, prazo opcional em texto secundário, botão `Marcar` (visual).
- `DocumentoACriarCard.tsx` — badge de tipo, motivo, badge de prioridade, botão `Criar futuramente` desativado (`disabled`).
- `SecaoPreparacao.tsx` — wrapper de secção com título, contador (`{n} itens`) e grid responsiva (`grid gap-4 md:grid-cols-2 xl:grid-cols-3`).

Badges reutilizam o componente `Badge` do shadcn já presente, com variantes mapeadas por uma pequena função `prioridadeVariant()` / `estadoVariant()` local — sem novos tokens de cor.

## Alterações na rota

`src/routes/assembleias.$id.preparacao.tsx`:

- Remover os quatro blocos de placeholder atuais.
- Importar os mocks e os quatro componentes.
- Renderizar quatro `SecaoPreparacao` na mesma ordem do pedido.
- Manter o header da página (título da assembleia, data, breadcrumb) tal como está hoje.
- Os mesmos mocks são usados para qualquer `:id` (fallback universal).

Nenhuma alteração noutras rotas, na sidebar, no `TopBar`, nem em `mock-data.ts`.

## Fora de âmbito

CRUD, edição, formulários, localStorage, persistência, importação/exportação, estado global, backend, IA, chat, novos tokens de cor ou fontes.

## Critério de validação

Ao abrir `/assembleias/:id/preparacao` (qualquer id) o utilizador vê uma página densa, profissional, com as quatro secções preenchidas com conteúdo autárquico realista.
