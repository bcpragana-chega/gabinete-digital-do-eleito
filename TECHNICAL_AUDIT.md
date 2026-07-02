# Auditoria Técnica — Tribuno 2.0

## Âmbito

Auditoria estática ao projeto React + TypeScript + TanStack Router, com foco na área de Preparação e na evolução do Tribuno 2.0 para uma plataforma completa de mandato.

Esta auditoria não altera código funcional. O objetivo é identificar riscos técnicos, dívida acumulada e oportunidades de consolidação antes de adicionar novos módulos como IA, PDF, sessão, dossiês e pesquisa.

## Sumário Executivo

O projeto tem uma base funcional coerente para a fase atual: rotas simples, stores locais em `src/lib`, componentes UI reutilizáveis e uma área de Preparação já operacional com pontos, documentos associados, rascunhos, editor e pré-visualização.

O principal risco técnico está na acumulação recente de lógica dentro das rotas e na duplicação progressiva de conceitos de domínio. A aplicação ainda é pequena o suficiente para corrigir isto sem reescrever, mas se os próximos módulos forem adicionados sobre a estrutura atual sem consolidação, a manutenção ficará mais difícil.

## Problemas Críticos

### 1. Modelos de documentos criados duplicados

**Área:** Stores, tipos TypeScript, escalabilidade  
**Ficheiros envolvidos:**
- `src/lib/preparacao-store.ts`
- `src/lib/documentos-a-criar-store.ts`
- `src/lib/mock-preparacao.ts`
- `src/lib/types.ts`
- `src/components/preparacao/DocumentoACriarCard.tsx`

**Problema:**  
Existem conceitos semelhantes para "documentos a criar" em mais do que uma origem:

- `DocumentoACriar` em `preparacao-store.ts`
- `DocumentoACriarRascunho` em `documentos-a-criar-store.ts`
- `DocumentoACriar` em `mock-preparacao.ts`
- tipos de documento também aparecem em `types.ts`

Isto cria risco de divergência entre a central de documentos, os rascunhos ligados a pontos e os componentes antigos da Preparação.

**Impacto:**  
À medida que forem adicionados PDF, templates, IA e histórico, pode tornar-se difícil saber qual é a fonte verdadeira de um documento criado. Também aumenta o risco de duplicar documentos, perder estado ou implementar a mesma funcionalidade em dois sítios.

**Recomendação:**  
Definir uma única entidade canónica para documento criado, preferencialmente em `src/lib/documentos-a-criar-store.ts` ou num futuro módulo de domínio. Depois, adaptar gradualmente os componentes antigos para deixarem de depender de `mock-preparacao.ts`.

### 2. Rotas críticas com responsabilidades excessivas

**Área:** Rotas, componentes, manutenção  
**Ficheiros envolvidos:**
- `src/routes/_app.assembleias.$id.preparacao.pontos.$pontoId.tsx` — 735 linhas
- `src/routes/_app.assembleias.$id.preparacao.pontos.$pontoId.rascunhos.$rascunhoId.tsx` — 351 linhas
- `src/routes/_app.assembleias.$id.preparacao.documentos-a-criar.tsx` — 204 linhas

**Problema:**  
A rota de detalhe do ponto concentra UI, leitura de stores, cálculos do dashboard, associação de documentos, edição de campos de preparação e criação/listagem de rascunhos. A rota do editor também mistura carregamento, edição, estado, pré-visualização e navegação.

**Impacto:**  
Cada nova funcionalidade aumenta o risco de regressões. A rota do ponto tende a tornar-se o centro de tudo, dificultando testes, reutilização e evolução para sessão, histórico, IA e exportação.

**Recomendação:**  
Sem reescrever, extrair gradualmente componentes pequenos:

- `PontoDashboard`
- `PontoPreparacaoForm`
- `DocumentosAssociadosSection`
- `DocumentosACriarSection`
- `RascunhoEditor`
- `RascunhoPreview`

As rotas devem ficar responsáveis sobretudo por parâmetros, navegação e composição.

## Problemas Importantes

### 3. Tipos TypeScript repetidos

**Área:** Tipagem, consistência de domínio  
**Ficheiros envolvidos:**
- `src/lib/types.ts`
- `src/lib/mock-preparacao.ts`
- `src/lib/preparacao-store.ts`
- `src/lib/pontos-store.ts`
- `src/lib/documentos-a-criar-store.ts`

**Problema:**  
Tipos como `NivelPrioridade`, `TipoDocumento`, estados de preparação e estados de documento aparecem repetidos em várias stores e mocks.

**Impacto:**  
Alterações futuras podem ser feitas num tipo mas não noutro. Isto é especialmente arriscado para entidades centrais como Documento, Ponto e Documento Criado.

**Recomendação:**  
Criar tipos de domínio partilhados de forma incremental, por exemplo:

- `src/lib/domain-types.ts`
- ou pastas futuras por domínio, como `src/features/documentos/types.ts`

Evitar uma migração grande imediata; começar pelos tipos mais repetidos.

### 4. Stores locais sem camada comum de persistência

**Área:** Stores, persistência, escalabilidade  
**Ficheiros envolvidos:**
- `src/lib/assembleias-store.ts`
- `src/lib/documentos-store.ts`
- `src/lib/pontos-store.ts`
- `src/lib/preparacao-store.ts`
- `src/lib/estrategia-store.ts`
- `src/lib/documentos-a-criar-store.ts`

**Problema:**  
Cada store implementa diretamente `localStorage`, parsing, serialização e defaults. Algumas têm subscrição por evento; outras não.

**Impacto:**  
A persistência fica inconsistente. Também será mais difícil migrar para uma base de dados real, adicionar versionamento de schema ou lidar com dados antigos no browser.

**Recomendação:**  
Criar um helper simples de storage com:

- leitura segura
- escrita
- fallback por defeito
- versão de schema
- migração futura
- evento de alteração padronizado

### 5. Uso frágil de `pathname.includes` para decidir sub-rotas

**Área:** Rotas TanStack Router  
**Ficheiros envolvidos:**
- `src/routes/_app.assembleias.$id.tsx`
- `src/routes/_app.assembleias.$id.preparacao.tsx`
- `src/routes/_app.assembleias.$id.preparacao.pontos.tsx`
- `src/routes/_app.assembleias.$id.preparacao.pontos.$pontoId.tsx`

**Problema:**  
Algumas rotas usam `pathname.includes(...)` para decidir se devem renderizar `<Outlet />`.

**Impacto:**  
Funciona agora, mas é frágil perante rotas com nomes parecidos, alterações futuras de estrutura e comportamentos inesperados em nested routes.

**Recomendação:**  
Quando houver oportunidade, simplificar a composição com layouts de rota mais explícitos e deixar o router resolver os filhos. Não precisa ser feito antes de estabilizar a Preparação, mas deve entrar na consolidação arquitetural.

### 6. Componentes antigos ainda dependem de mocks

**Área:** Código duplicado, dívida técnica  
**Ficheiros envolvidos:**
- `src/components/preparacao/AcaoCard.tsx`
- `src/components/preparacao/PerguntaCard.tsx`
- `src/components/preparacao/PrioridadeCard.tsx`
- `src/components/preparacao/DocumentoACriarCard.tsx`
- `src/components/preparacao/badges.tsx`
- `src/lib/mock-preparacao.ts`

**Problema:**  
Alguns componentes continuam tipados a partir de `mock-preparacao.ts`, enquanto a aplicação já tem stores reais para pontos, documentos, estratégia e rascunhos.

**Impacto:**  
Pode haver uma mistura entre dados demonstrativos e dados operacionais. Isto tende a confundir futuras alterações.

**Recomendação:**  
Manter os mocks apenas como seed/demo data ou removê-los gradualmente das áreas já operacionais.

### 7. Falta de testes automatizados

**Área:** Qualidade, regressões  
**Problema:**  
Não há evidência de uma suite de testes para stores, rotas ou fluxos principais.

**Impacto:**  
Como a aplicação depende de stores locais e fluxos encadeados, regressões podem passar despercebidas: associar documentos, editar rascunhos, guardar estados e navegar entre ponto/editor/central.

**Recomendação:**  
Começar com testes pequenos de store:

- criar rascunho
- atualizar rascunho
- associar/desassociar documento a ponto
- atualizar preparação do ponto

Depois adicionar testes de integração dos fluxos críticos.

### 8. Lint/format global não está limpo

**Área:** Qualidade de código  
**Problema:**  
Foi identificado anteriormente que `npm run lint` falhava com muitos problemas de formatação, sobretudo Prettier, e alguns avisos.

**Impacto:**  
Reduz confiança em CI, dificulta revisão e pode esconder problemas reais no meio de ruído.

**Recomendação:**  
Fazer uma tarefa separada apenas de formatação/lint, sem misturar com alterações funcionais.

### 9. Performance futura limitada por leituras completas em `localStorage`

**Área:** Performance, escalabilidade  
**Ficheiros envolvidos:** stores em `src/lib`

**Problema:**  
As stores leem listas inteiras do `localStorage` e filtram em memória.

**Impacto:**  
É aceitável para protótipo/local state, mas pode degradar quando existirem anos de mandato, muitos documentos, dossiês, compromissos e histórico.

**Recomendação:**  
Antes de crescer muito, preparar um padrão de acesso por entidade/ID e índices simples por `assembleiaId`, `pontoId`, `dossieId`, etc. Isto também facilitará a futura base de dados real.

### 10. Entidades de domínio ainda pouco normalizadas

**Área:** Modelo de dados, escalabilidade  
**Problema:**  
A aplicação está a evoluir para um sistema em que tudo se liga a tudo: assembleias, pontos, documentos, pessoas, entidades, dossiês, compromissos, notas e eventos. Hoje, parte dessas ligações ainda vive em stores específicas e não num modelo relacional consistente.

**Impacto:**  
Pode haver duplicação de campos como título do ponto, nome da assembleia ou estado do documento em vez de relações por ID.

**Recomendação:**  
Seguir o `DATA_MODEL.md`: usar IDs para relações, manter entidades normalizadas e evitar copiar dados derivados.

## Problemas de Baixa Prioridade

### 11. Artefacto `.DS_Store` dentro de `src`

**Área:** Higiene do repositório  
**Ficheiro:**
- `src/.DS_Store`

**Problema:**  
Existe um ficheiro de sistema macOS dentro da pasta de código.

**Impacto:**  
Não deve afetar runtime, mas polui o repositório e pode aparecer em diffs desnecessários.

**Recomendação:**  
Remover numa tarefa de limpeza e garantir que `.DS_Store` está ignorado no `.gitignore`.

### 12. Componente vazio

**Área:** Dívida técnica  
**Ficheiro:**
- `src/components/preparacao/AdicionarAcaoDialog.tsx` — 0 linhas

**Problema:**  
Existe um ficheiro de componente vazio.

**Impacto:**  
Pode confundir quem procurar funcionalidades relacionadas com ações pendentes.

**Recomendação:**  
Remover se não for usado, ou implementar quando a funcionalidade voltar a ser necessária.

### 13. `as never` para contornar tipagem de links

**Área:** Type safety  
**Ficheiro:**
- `src/components/preparacao/PreparacaoAreaCard.tsx`

**Problema:**  
O componente usa `to as never` e `params as never` em links.

**Impacto:**  
Contorna a segurança de tipos do TanStack Router.

**Recomendação:**  
Quando houver tempo, tipar melhor o componente ou criar variantes específicas para links conhecidos.

### 14. Estados vazios e cabeçalhos repetidos

**Área:** Reutilização de componentes  
**Problema:**  
Há padrões repetidos em várias rotas:

- cabeçalho com título/subtítulo
- botão voltar
- estado vazio
- cartão de resumo
- linha/list item de documento
- badge de estado

**Impacto:**  
Baixo no curto prazo, mas aumenta trabalho de manutenção visual.

**Recomendação:**  
Criar componentes reutilizáveis apenas quando a repetição estabilizar, sem forçar abstrações prematuras.

## Oportunidades de Componentes Reutilizáveis

Prioridade recomendada:

1. `PageHeader` ou `RouteHeader`
2. `EmptyState`
3. `StatusBadge`
4. `DashboardMetric`
5. `ProgressBar`
6. `DocumentListItem`
7. `RascunhoListItem`
8. `InstitutionalDocumentPreview`
9. `FieldTextarea`
10. `BackLink`

## Problemas de Performance Previsíveis

- Listas grandes em `localStorage` serão filtradas em memória a cada leitura.
- Stores não têm índices por entidade relacionada.
- Rotas maiores tendem a recalcular muitos dados derivados no render.
- Não há paginação, pesquisa local ou virtualização para documentos.
- Subscrições por evento ainda não estão normalizadas entre stores.

Nenhum destes pontos é bloqueador agora, mas devem ser considerados antes de importar muitos documentos ou histórico de mandato.

## Problemas de Escalabilidade

- O domínio está a crescer mais depressa do que a separação por módulos.
- A área Preparação já mistura dados de pontos, documentos, estratégia, notas e rascunhos.
- A futura IA vai precisar de entidades limpas, estáveis e relacionáveis.
- A futura exportação PDF vai exigir uma entidade canónica de documento criado.
- Dossiês, pessoas e entidades vão exigir relações múltiplas sem duplicação.

## Ordem Recomendada de Correção

1. Consolidar o modelo de `Documento Criado`.
2. Extrair componentes da rota de detalhe do ponto.
3. Extrair editor e pré-visualização do rascunho.
4. Centralizar tipos de domínio repetidos.
5. Criar helper comum para `localStorage`.
6. Limpar dependências de `mock-preparacao.ts` nas áreas já operacionais.
7. Corrigir lint/format numa alteração isolada.
8. Adicionar testes às stores críticas.
9. Rever nested routes que dependem de `pathname.includes`.
10. Preparar padrões para dossiês, pesquisa, PDF e IA sem duplicar entidades.

## Critério de Consolidação da Fase 1

A Fase 1 — Preparação pode ser considerada tecnicamente consolidada quando:

- cada ponto abre, edita e persiste dados de preparação;
- documentos associados são guardados por ID;
- rascunhos são criados, editados e listados na central;
- existe uma entidade única para documento criado;
- rotas principais deixam de concentrar lógica excessiva;
- stores têm responsabilidades claras;
- lint/format corre sem ruído relevante;
- existem testes mínimos para stores e fluxos críticos.

