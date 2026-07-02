# Tribuno 2.0 - Design Language

Este documento define a linguagem visual do Tribuno 2.0.

## 1. Estilo Geral

O Tribuno deve parecer um workspace moderno, organizado e calmo, inspirado na clareza de ferramentas como Notion, Linear e Apple, sem copiar nenhuma delas.

O tom visual deve ser:

- limpo;
- calmo;
- profissional;
- produtivo;
- institucional;
- discreto;
- focado.

## 2. Modern Workspace

O produto deve sentir-se como uma mesa de trabalho digital:

- informação organizada por contexto;
- módulos claros;
- cartões funcionais;
- dashboards densos mas legíveis;
- ações visíveis sem excesso;
- pouca ornamentação;
- hierarquia visual forte.

## 3. Cores

Usar a paleta existente definida em `src/styles.css`.

### Regras

- Fundo geral claro e neutro.
- Cards brancos ou quase brancos.
- Texto principal escuro e estável.
- Texto secundário discreto.
- Acento azul institucional para foco, ícones e ação.
- Estados com cores suaves, não agressivas.
- Evitar gradientes decorativos e paletas demasiado saturadas.

## 4. Tipografia

Usar:

- `Inter` para texto geral.
- `Inter Tight` para títulos.

Hierarquia:

- títulos de página fortes, mas não heroicos;
- títulos de cards compactos;
- labels pequenas e claras;
- metadados em uppercase quando forem categoria/contexto.

## 5. Cards

Cards devem representar unidades reais de trabalho:

- assembleia;
- ponto;
- documento;
- compromisso;
- dossiê;
- métrica;
- secção operacional.

Regras:

- `rounded-2xl` para secções principais;
- `rounded-xl` para itens e métricas;
- `shadow-card` por defeito;
- `shadow-elevated` apenas para hover/destaque;
- evitar cards puramente decorativos.

## 6. Botões

Botões devem ser previsíveis:

- ação principal: `default`;
- ação secundária: `secondary`;
- ação contextual: `outline`;
- ação discreta: `ghost`;
- ação perigosa: `destructive`.

Usar ícones quando melhorarem reconhecimento. Não usar ícones decorativos em excesso.

## 7. Badges

Badges comunicam estado, tipo ou contagem.

Regras:

- estados usam `rounded-full` e podem ter ponto;
- tipos/categorias podem usar `rounded-md` e uppercase;
- contadores devem ser discretos;
- badges não devem competir com títulos.

## 8. Inputs

Inputs devem parecer ferramentas de trabalho, não formulários burocráticos.

Regras:

- labels claras;
- placeholders úteis mas curtos;
- campos longos quando o utilizador precisa pensar/escrever;
- evitar campos obrigatórios sem valor imediato;
- autosave deve ser discreto quando existir.

## 9. Dashboards

Dashboards devem ser executivos:

- poucas métricas;
- valores legíveis;
- estado visível;
- progresso simples;
- pendentes e concluídos claros;
- próximo passo evidente.

Um dashboard não deve ser uma parede de números.

## 10. Espaçamentos

O produto deve respirar sem parecer vazio.

Regras:

- páginas: padding generoso;
- cards: `p-5` ou `p-6`;
- listas: gaps consistentes;
- formulários: blocos agrupados;
- dashboards: grelha compacta.

## 11. Comportamento Visual

- Hover deve confirmar interatividade.
- Foco deve ser visível.
- Mudanças de estado devem ser subtis.
- A interface deve evitar saltos de layout.
- Elementos clicáveis devem ser reconhecíveis.
- O visual deve reforçar confiança e controlo.

## 12. O Que Evitar

- Ecrãs com aspeto promocional.
- Hero sections dentro da aplicação.
- Demasiados cards dentro de cards.
- Badges com significados inconsistentes.
- Cores novas sem token.
- Texto explicativo excessivo dentro da UI.
- Ornamentação que não ajuda a decisão.

