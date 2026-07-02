# Tribuno 2.0 - Roadmap

Este roadmap define uma ordem de desenvolvimento incremental para o Tribuno 2.0, sem reescrever o que já funciona. Cada fase deve consolidar a anterior antes de introduzir novos módulos estruturais.

## Fase 1 - Consolidar Preparação

### Objetivo

Tornar a área de Preparação robusta, coerente e operacional para uso antes da assembleia.

### Funcionalidades

- Pontos da ordem de trabalhos operacionais.
- Detalhe de ponto com dashboard executivo.
- Campos editáveis de preparação do ponto:
  - resumo
  - objetivo político
  - riscos
  - linha de intervenção
  - notas internas
- Documentos associados a cada ponto.
- Documentos criados/rascunhos ligados a ponto.
- Editor de rascunhos.
- Pré-visualização institucional simples.
- Central de documentos a criar da assembleia.
- Ligação entre preparação, pontos, documentos e rascunhos.

### Ficheiros/módulos prováveis

- `src/routes/_app.assembleias.$id.preparacao.tsx`
- `src/routes/_app.assembleias.$id.preparacao.documentos.tsx`
- `src/routes/_app.assembleias.$id.preparacao.estrategia.tsx`
- `src/routes/_app.assembleias.$id.preparacao.pontos.tsx`
- `src/routes/_app.assembleias.$id.preparacao.pontos.$pontoId.tsx`
- `src/routes/_app.assembleias.$id.preparacao.pontos.$pontoId.rascunhos.$rascunhoId.tsx`
- `src/routes/_app.assembleias.$id.preparacao.documentos-a-criar.tsx`
- `src/lib/pontos-store.ts`
- `src/lib/documentos-store.ts`
- `src/lib/documentos-a-criar-store.ts`
- `src/lib/estrategia-store.ts`
- `src/components/preparacao/`
- `src/components/documentos/`
- `src/components/estrategia/`

### Critérios de conclusão

- É possível criar pontos, abrir detalhe e guardar preparação.
- É possível associar/desassociar documentos existentes a um ponto.
- É possível criar rascunhos a partir do ponto.
- É possível editar e pré-visualizar rascunhos.
- A central de documentos mostra todos os rascunhos da assembleia.
- Não há duplicação de fluxos de criação.
- Build passa.

## Fase 2 - Perfil Institucional

### Objetivo

Criar a base institucional usada em documentos, pré-visualizações e futura exportação.

### Funcionalidades

- Configuração do órgão.
- Cargo do eleito.
- Partido, movimento ou grupo.
- Assinatura institucional.
- Logótipo.
- Dados de contacto e território.
- Modelo institucional dos documentos.
- Preferências de estilo:
  - formalidade
  - cabeçalho
  - rodapé
  - identificação do eleito/grupo

### Ficheiros/módulos prováveis

- `src/routes/_app.definicoes.tsx`
- `src/lib/perfil-institucional-store.ts`
- `src/components/perfil/`
- `src/components/documentos/`
- `src/routes/_app.assembleias.$id.preparacao.pontos.$pontoId.rascunhos.$rascunhoId.tsx`

### Critérios de conclusão

- Existe um perfil institucional persistente.
- A pré-visualização de rascunhos usa dados do perfil.
- O utilizador consegue editar órgão, cargo, partido/movimento, assinatura e logótipo.
- O modelo institucional é reutilizável por todos os tipos de documento criado.
- Nenhum documento existente perde conteúdo.

## Fase 3 - Exportação

### Objetivo

Permitir transformar documentos criados em versões finais exportáveis, com layout institucional consistente.

### Funcionalidades

- Exportar documentos para PDF.
- Layout institucional com cabeçalho, rodapé e assinatura.
- Modo versão final/impressão.
- Definir estado `final`.
- Preparar metadados de versão.
- Manter pré-visualização consistente com exportação.

### Ficheiros/módulos prováveis

- `src/lib/documentos-a-criar-store.ts`
- `src/lib/perfil-institucional-store.ts`
- `src/components/documentos/`
- `src/components/exportacao/`
- `src/routes/_app.assembleias.$id.preparacao.pontos.$pontoId.rascunhos.$rascunhoId.tsx`

### Critérios de conclusão

- Um rascunho final pode ser exportado para PDF.
- O PDF respeita o perfil institucional.
- A versão impressa é legível e consistente.
- A exportação não altera indevidamente o conteúdo guardado.
- O utilizador distingue rascunho, em revisão e final.

## Fase 4 - Sessão

### Objetivo

Criar um modo de acompanhamento durante a assembleia, focado em consulta rápida e registo em tempo real.

### Funcionalidades

- Modo sessão.
- Lista de pontos em ordem.
- Consulta rápida de documentos associados.
- Notas rápidas por ponto.
- Registo de intervenções feitas.
- Registo de votações.
- Registo de decisões/deliberações.
- Marcação de compromissos assumidos.

### Ficheiros/módulos prováveis

- `src/routes/_app.assembleias.$id.sessao.tsx`
- `src/routes/_app.assembleias.$id.sessao.pontos.$pontoId.tsx`
- `src/lib/sessao-store.ts`
- `src/lib/pontos-store.ts`
- `src/lib/compromissos-store.ts`
- `src/components/sessao/`
- `src/components/preparacao/`

### Critérios de conclusão

- O utilizador consegue acompanhar a sessão ponto a ponto.
- É possível registar notas rápidas sem sair do contexto.
- É possível marcar intervenções, votações e decisões.
- Dados registados em sessão ficam disponíveis no pós-assembleia.
- A área de Preparação continua intacta.

## Fase 5 - Pós-Assembleia

### Objetivo

Consolidar resultados, compromissos e seguimento após a sessão.

### Funcionalidades

- Registo de resultados por ponto.
- Estados pós-assembleia.
- Compromissos assumidos.
- Seguimento de tarefas e respostas.
- Recomendações pendentes.
- Ligação a ata.
- Comparação entre preparação e resultado real.

### Ficheiros/módulos prováveis

- `src/routes/_app.assembleias.$id.pos-assembleia.tsx`
- `src/lib/compromissos-store.ts`
- `src/lib/atas-store.ts`
- `src/lib/pontos-store.ts`
- `src/lib/documentos-a-criar-store.ts`
- `src/components/pos-assembleia/`
- `src/components/compromissos/`

### Critérios de conclusão

- Cada ponto pode ter resultado registado.
- Compromissos ficam ligados à origem correta.
- Recomendações/requerimentos pendentes aparecem em seguimento.
- Ata pode ser associada à assembleia.
- Existe visão clara do que ficou concluído e pendente.

## Fase 6 - Dossiês

### Objetivo

Criar a principal unidade de conhecimento do Tribuno. Dossiês representam temas ou problemas acompanhados pelo eleito ao longo do mandato, agregando informação que atravessa várias assembleias.

### Funcionalidades

- Criar dossiês por tema.
- Exemplos iniciais: Habitação, Centro de Saúde, Iluminação Pública e Orçamento 2027.
- Ligar documentos.
- Ligar pontos.
- Ligar pessoas.
- Ligar entidades.
- Ligar compromissos.
- Ligar eventos e notas.
- Ver histórico de cada Dossiê.
- Alimentar Dossiês a partir de assembleias, pontos, documentos, atas, decisões, intervenções e compromissos.
- Preparar Dossiês como contexto principal para Pesquisa e IA.

### Ficheiros/módulos prováveis

- `src/routes/_app.dossies.tsx`
- `src/routes/_app.dossies.$dossieId.tsx`
- `src/lib/dossies-store.ts`
- `src/lib/pessoas-store.ts`
- `src/lib/entidades-store.ts`
- `src/lib/compromissos-store.ts`
- `src/components/dossies/`
- `src/components/pessoas/`
- `src/components/entidades/`

### Critérios de conclusão

- É possível criar e editar dossiês.
- Um dossiê pode agregar documentos, pontos, pessoas, entidades e compromissos.
- O utilizador consegue ver histórico de um Dossiê.
- Assembleias alimentam Dossiês com pontos, documentos, decisões, atas e compromissos.
- Dossiês não duplicam dados; apenas relacionam objetos existentes.
- Dossiês ficam preparados como principal contexto de conhecimento para Pesquisa e IA.

## Fase 7 - Pesquisa e IA

### Objetivo

Transformar o histórico do mandato em conhecimento pesquisável e assistido por IA, usando Dossiês como principal contexto de conhecimento.

### Funcionalidades

- Pesquisa global.
- Pesquisa por assembleia, ponto, documento, dossiê, pessoa e entidade.
- Resultados agrupados ou contextualizados por Dossiê quando existir relação relevante.
- Análise semântica.
- Sugestões de intervenção.
- Cruzamento de documentos.
- Recuperação de histórico do mandato.
- Resumos automáticos.
- Sugestões de perguntas, riscos e compromissos.

### Ficheiros/módulos prováveis

- `src/routes/_app.pesquisa.tsx`
- `src/lib/search-store.ts`
- `src/lib/knowledge-index.ts`
- `src/lib/ai/`
- `src/components/pesquisa/`
- `src/components/ia/`
- Stores existentes:
  - `assembleias-store`
  - `documentos-store`
  - `pontos-store`
  - `documentos-a-criar-store`
  - `dossies-store`
  - `compromissos-store`

### Critérios de conclusão

- O utilizador consegue pesquisar informação de todo o mandato.
- Resultados mostram relações entre objetos.
- Pesquisa destaca Dossiês como unidade principal de conhecimento.
- IA usa contexto estruturado, não texto solto duplicado.
- IA usa Dossiês como contexto principal para resumir, relacionar e explicar informação do mandato.
- Sugestões de IA identificam fontes/contexto usado.
- A IA não altera dados automaticamente sem ação explícita do utilizador.

## Regras transversais do roadmap

- Não reescrever o que já funciona.
- Cada fase deve preservar as funcionalidades anteriores.
- Evitar duplicação de stores e fluxos.
- Preferir relações por IDs.
- Manter componentes pequenos.
- Extrair componentes quando uma rota crescer demasiado.
- Só introduzir IA depois de consolidar dados, relações e fluxos principais.
- Só introduzir PDF depois de estabilizar perfil institucional e templates.
- Cada fase deve terminar com build funcional.
