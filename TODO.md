# Tribuno 2.0 - TODO

Este ficheiro transforma o `MASTER_ARCHITECTURE.md` numa ordem de trabalho pequena, incremental e executável.

## Revisão contra a arquitetura principal

### Compatibilidade confirmada

- [x] A arquitetura descrita no `MASTER_ARCHITECTURE.md` é compatível com o código atual.
- [x] A área de Preparação já existe como módulo funcional dentro de Assembleias.
- [x] Pontos, documentos associados, rascunhos, editor, pré-visualização e central de Documentos a Criar já existem.
- [x] O código atual já usa IDs para várias relações importantes, como documentos associados a pontos e rascunhos ligados a pontos/assembleias.

### Pontos ainda desalinhados

- [ ] `Documento Criado` ainda não está totalmente consolidado como entidade canónica única.
- [ ] A rota de detalhe do ponto ainda concentra demasiada responsabilidade num só ficheiro.
- [ ] A rota do editor de rascunho ainda mistura edição, pré-visualização, navegação e persistência.
- [ ] As stores repetem lógica de `localStorage`.
- [ ] Tipos de domínio como prioridade, tipo de documento e documento a criar ainda aparecem em vários ficheiros.
- [ ] Alguns componentes antigos da Preparação ainda dependem de `mock-preparacao.ts`.
- [ ] Ainda não existe perfil do eleito/perfil institucional.

## A Fazer - Migração Incremental Recomendada

### 1. Consolidar Documento Criado canónico

- [ ] Definir `DocumentoCriado` como entidade canónica única.
- [ ] Confirmar se `src/lib/documentos-a-criar-store.ts` será a store principal de documentos criados.
- [ ] Alinhar nomes entre `DocumentoACriarRascunho` e `DocumentoCriado`.
- [ ] Garantir que a central de Documentos a Criar lê apenas da store canónica.
- [ ] Garantir que rascunhos criados no detalhe do ponto aparecem na central.
- [ ] Garantir que a edição de rascunhos atualiza a entidade canónica.
- [ ] Evitar novo fluxo paralelo em `preparacao-store.ts`.
- [ ] Marcar componentes antigos baseados em `mock-preparacao.ts` para migração ou remoção futura.

### 2. Extrair componentes da rota do ponto

- [ ] Extrair `PontoDashboard` para componente próprio.
- [ ] Extrair formulário de preparação do ponto para componente próprio.
- [ ] Extrair `DocumentosAssociadosSection` para componente próprio.
- [ ] Extrair `DocumentosACriarSection` para componente próprio.
- [ ] Manter a rota do ponto responsável apenas por parâmetros, carregamento de dados e composição.
- [ ] Confirmar que a extração não altera comportamento nem design.

### 3. Extrair componentes do editor de rascunho

- [ ] Extrair formulário de edição do rascunho.
- [ ] Extrair pré-visualização institucional simples.
- [ ] Manter rota do editor responsável por parâmetros, navegação e composição.
- [ ] Garantir que voltar ao detalhe do ponto continua a funcionar.

### 4. Criar helper comum de `localStorage`

- [ ] Criar helper de leitura segura.
- [ ] Criar helper de escrita.
- [ ] Suportar valor por defeito.
- [ ] Preparar campo de versão de schema.
- [ ] Preparar migrações futuras.
- [ ] Padronizar eventos de atualização entre stores.
- [ ] Migrar uma store pequena primeiro como prova de padrão.
- [ ] Migrar gradualmente as restantes stores, sem alterar comportamento.

### 5. Criar tipos de domínio partilhados

- [ ] Criar ficheiro de tipos de domínio partilhados.
- [ ] Centralizar `ID`.
- [ ] Centralizar `NivelPrioridade`.
- [ ] Centralizar `TipoDocumentoCriado`.
- [ ] Centralizar `EstadoDocumentoCriado`.
- [ ] Centralizar tipos comuns de relações por entidade.
- [ ] Substituir duplicações gradualmente nas stores.
- [ ] Evitar migração massiva numa só alteração.

### 6. Criar Perfil do Eleito / Perfil Institucional

- [ ] Definir campos mínimos obrigatórios.
- [ ] Definir campos opcionais.
- [ ] Criar store do perfil institucional.
- [ ] Criar UI em Definições.
- [ ] Guardar órgão.
- [ ] Guardar cargo.
- [ ] Guardar partido/movimento/grupo.
- [ ] Guardar assinatura.
- [ ] Guardar logótipo ou referência futura a logótipo.
- [ ] Ligar perfil institucional à pré-visualização dos rascunhos.
- [ ] Preparar perfil para futura exportação PDF e IA.

### 7. Limpar dependências de mocks na área operacional

- [ ] Rever componentes que importam `mock-preparacao.ts`.
- [ ] Separar dados mock de tipos reais.
- [ ] Remover dependência de mocks em componentes usados por fluxos operacionais.
- [ ] Manter mocks apenas como dados de demonstração/seed.

### 8. Preparar qualidade antes de novos módulos

- [ ] Corrigir lint/format numa tarefa isolada.
- [ ] Adicionar testes de store para documentos criados.
- [ ] Adicionar testes de store para associação de documentos a pontos.
- [ ] Adicionar testes de store para edição de preparação do ponto.
- [ ] Rever rotas que usam `pathname.includes`.

### 9. Continuar roadmap funcional após consolidação

- [ ] Preparar exportação PDF.
- [ ] Definir biblioteca/estratégia de exportação PDF.
- [ ] Criar modo sessão.
- [ ] Definir fluxo do modo sessão por ponto.
- [ ] Criar pós-assembleia.
- [ ] Definir modelo de resultados por ponto.
- [ ] Criar compromissos e seguimento.
- [ ] Criar dossiês.
- [ ] Definir store de dossiês.
- [ ] Permitir ligar dossiês a documentos, pontos, pessoas, entidades e compromissos.
- [ ] Criar projetos.
- [ ] Criar pessoas e entidades.
- [ ] Criar pesquisa global.
- [ ] Definir índices pesquisáveis iniciais.
- [ ] Preparar IA depois de consolidar entidades, relações e pesquisa.

## Em Progresso

- [ ] Consolidar documentação de arquitetura:
  - `MASTER_ARCHITECTURE.md`
  - `ARCHITECTURE.md`
  - `PRODUCT_ARCHITECTURE.md`
  - `DATA_MODEL.md`
  - `ROADMAP.md`
  - `TECHNICAL_AUDIT.md`

## Feito

- [x] Criar base documental de arquitetura do produto.
- [x] Criar arquitetura principal do produto em `MASTER_ARCHITECTURE.md`.
- [x] Criar auditoria técnica em `TECHNICAL_AUDIT.md`.
- [x] Criar roadmap por fases.
- [x] Criar modelo de dados alvo.
- [x] Implementar detalhe operacional de ponto.
- [x] Associar documentos existentes a pontos.
- [x] Criar rascunhos ligados a pontos.
- [x] Criar editor de rascunhos.
- [x] Criar pré-visualização simples de rascunhos.
- [x] Criar central de Documentos a Criar da assembleia.
- [x] Criar dashboard do ponto.

## Bloqueado

- [ ] Exportação PDF depende de decisão técnica sobre biblioteca/estratégia.
- [ ] IA depende de consolidação dos dados, relações e pesquisa.
- [ ] Pesquisa semântica depende de decisão futura sobre armazenamento/indexação.
- [ ] Perfil institucional precisa de decisão final sobre campos obrigatórios e opcionais.
- [ ] Multiutilizador depende de decisão futura sobre autenticação, workspace e API.

