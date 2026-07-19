# Avaliação da qualidade da IA documental

## Finalidade

Esta suite cria uma prova repetível da qualidade das respostas documentais do Tribuno. Separa verificações objetivas, executadas sem IA, da avaliação humana das dimensões que exigem juízo editorial, jurídico ou político.

Esta infraestrutura não altera prompts, modelo, chamadas OpenAI, geração, parsing, persistência, Supabase ou interface. Os casos e o avaliador vivem exclusivamente em `src/lib/ai-quality/` e os testes usam respostas simuladas.

## Arquitetura

- `cases.ts`: 18 cenários fixos e fictícios, com factos autorizados/proibidos e expectativas explícitas.
- `types.ts`: contrato tipado dos casos, verificações, grelha humana, decisões e relatório.
- `validation.ts`: validação estrutural e cobertura dos cenários obrigatórios.
- `evaluator.ts`: avaliador determinístico puro e composição da decisão por caso.
- `report.ts`: regras globais e representação JSON/Markdown.
- `fixtures.ts`: respostas e notas simuladas, apenas para testar a própria infraestrutura.
- `ai-quality.test.ts`: contratos da suite, falhas críticas e limites globais.

Os testes de produção já existentes continuam responsáveis pelos contratos do prompt, contexto institucional, base jurídica, parsing OpenAI, análise PDF, resposta vazia, pipeline de geração e persistência. A suite de qualidade não os duplica nem os substitui.

## Executar

```sh
npm test
```

O comando não requer `OPENAI_API_KEY`, internet ou Supabase. Não existe runner que faça chamadas reais automaticamente. Uma avaliação futura com respostas reais deve ser iniciada explicitamente, fora de `npm test`, e deve fornecer ao avaliador apenas o texto devolvido; segredos nunca devem entrar nos casos, fixtures ou relatórios.

## Adicionar ou atualizar um caso

1. Adicionar uma entrada legível a `AI_QUALITY_CASES` em `cases.ts`.
2. Usar apenas pessoas inexistentes, entidades fictícias ou designações institucionais genéricas.
3. Declarar factos autorizados e padrões objetivos para cada facto proibido conhecido.
4. Definir secções, elementos essenciais, nomes institucionais a preservar e comprimento mínimo.
5. Indicar as coberturas de risco e as falhas críticas aplicáveis.
6. Atualizar as contagens apenas se a especificação do corpus mudar.
7. Correr `npm test` e confirmar que a validação estrutural e de cobertura passa.

Um padrão proibido deve ser suficientemente específico para evitar falsos positivos. O avaliador não deve tentar inferir semanticamente uma alucinação que só um humano conseguiria reconhecer.

## Avaliação determinística

`evaluateDeterministically(caso, resposta)` é uma função pura. Verifica, conforme o caso:

- resposta não vazia, comprimento mínimo e sinais de truncagem;
- secções obrigatórias e secções proibidas;
- placeholders, linguagem conversacional e blocos de raciocínio interno;
- padrões de factos, datas, números, pessoas, entidades, legislação e competências proibidos;
- elementos obrigatórios e proibidos;
- presença da ação política essencial;
- preservação do tipo documental e dos nomes institucionais relevantes;
- fuga a instruções adversariais declaradas no caso.

Uma correspondência objetiva pode originar falha crítica. O resultado lista todas as verificações aprovadas/falhadas e a evidência das falhas críticas.

Este mecanismo garante apenas o que pode provar por regras explícitas. Não consegue descobrir toda e qualquer paráfrase de um facto inventado, avaliar elegância política, confirmar verdade externa ou decidir sozinho se uma afirmação nova é válida. Esses pontos pertencem à avaliação humana. Alargar a deteção automática exige novos padrões testados, não heurísticas sem evidência.

## Grelha humana de 100 pontos

O avaliador preenche todas as dimensões dentro dos máximos executáveis em `HUMAN_SCORE_MAXIMA`:

| Dimensão                                   | Máximo | Como avaliar                                                                                        |
| ------------------------------------------ | -----: | --------------------------------------------------------------------------------------------------- |
| Fidelidade aos factos fornecidos           |     20 | O texto preserva factos, incertezas e relações sem omissões materiais, extrapolações ou alterações. |
| Correção institucional e competências      |     20 | Órgão, destinatário, papel e ação respeitam o contexto e não atribuem competências indevidas.       |
| Segurança jurídica e ausência de invenções |     15 | Só usa base jurídica autorizada, distingue alegações e evita certeza não suportada.                 |
| Adequação ao tipo documental               |     15 | Estrutura, finalidade e ação correspondem ao tipo pedido.                                           |
| Utilidade política e clareza do pedido     |     10 | O eleito percebe o objetivo e consegue agir sobre um pedido concreto.                               |
| Estrutura e coerência                      |     10 | A progressão é completa, não repetitiva e liga factos, fundamento e conclusão.                      |
| Português europeu e tom institucional      |      5 | Léxico, sintaxe e registo são naturais em português europeu e adequados ao órgão.                   |
| Trabalho de revisão necessário             |      5 | Pontuação máxima quando a revisão antes de uso é nula ou meramente cosmética.                       |

Escala prática dentro de cada dimensão:

- 100% do máximo: cumpre integralmente e não exige correção substantiva;
- 75% do máximo: pequena deficiência localizada;
- 50% do máximo: várias correções ou uma correção relevante;
- 25% do máximo: falha grave, embora exista material recuperável;
- 0%: não cumpre a dimensão.

Além da pontuação, escolher um nível de revisão:

- `utilizável sem alterações`: pode ser usado como entregue;
- `utilizável com alterações mínimas`: apenas correções localizadas, sem reescrita de raciocínio, estrutura ou pedido;
- `exige revisão relevante`: requer validação adicional ou reescrita substantiva;
- `inutilizável`: não constitui uma base segura de trabalho.

Uma boa nota humana nunca anula uma falha crítica determinística ou identificada durante a revisão. Se o avaliador humano encontrar uma falha eliminatória ainda não coberta por padrão, deve registar a evidência e acrescentar um teste de regressão antes de fechar o problema.

## Decisão por caso e decisão global

Por caso, a decisão distingue:

- `approved`: pelo menos 90/100 e zero falhas críticas;
- `failed_score`: menos de 90/100 e zero falhas críticas;
- `failed_critical`: uma ou mais falhas críticas, independentemente da nota.

O Problema n.º 12 só pode fechar se todas as condições forem verdadeiras simultaneamente:

- cada caso principal tem pelo menos 90/100;
- média global de pelo menos 92/100;
- média de cada tipo documental de pelo menos 90/100;
- zero falhas críticas;
- pelo menos 80% dos casos são `utilizável sem alterações` ou `utilizável com alterações mínimas`.

`buildGlobalReport` codifica estas cinco regras. O objeto devolvido é diretamente serializável como JSON. `renderReportMarkdown` inclui decisão e nota por caso, dimensões, falhas críticas, verificações determinísticas falhadas, nível de revisão, médias por tipo, média global e percentagem utilizável.

## Limite desta missão

As fixtures demonstram que o avaliador e os limiares funcionam; não demonstram que o modelo de produção já atinge 9,0. Essa conclusão só pode resultar da execução deliberada dos 18 casos contra respostas atuais e da respetiva avaliação humana. Até essa medição, a suite mede de forma consistente, mas não corrige a IA nem declara o Problema n.º 12 fechado.
