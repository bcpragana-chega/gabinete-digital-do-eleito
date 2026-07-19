# Tribuno 2.0 - Architecture

Este documento descreve a arquitetura atual do projeto e as regras a seguir nas próximas iterações.

## 1. Stack usada

- React 19
- TypeScript
- TanStack Router com file-based routes
- TanStack Start
- TanStack Query
- Vite
- Tailwind CSS
- Radix UI / shadcn-style components
- Lucide React para ícones
- Local storage como persistência local atual
- ESLint e Prettier
- Configuração Vite/TanStack nativa

## 2. Estrutura atual de pastas

```text
src/
  components/
    assembleias/     Formulários e diálogos de assembleias.
    cards/           Cartões genéricos de resumo.
    documentos/      Componentes de documentos existentes.
    estrategia/      Campos reutilizáveis para estratégia/briefing.
    layout/          Sidebar e top bar.
    preparacao/      Componentes da área de preparação.
    ui/              Primitivas de UI reutilizáveis.
  hooks/             Hooks locais, incluindo autosave.
  lib/               Stores locais, tipos, mocks e utilitários.
  routes/            Rotas file-based do TanStack Router.
  routeTree.gen.ts   Árvore gerada pelo TanStack Router.
  router.tsx         Configuração do router.
  server.ts          Entrada server.
  start.ts           Entrada TanStack Start.
  styles.css         Estilos globais.
```

## 3. Rotas principais

- `/` - dashboard inicial.
- `/assembleias` - listagem de assembleias.
- `/assembleias/$id` - detalhe de uma assembleia.
- `/assembleias/$id/documentos/$docId` - detalhe de documento.
- `/assembleias/$id/preparacao` - entrada da área de preparação.
- `/assembleias/$id/preparacao/documentos` - gestão dos documentos da preparação.
- `/assembleias/$id/preparacao/estrategia` - briefing político da sessão.
- `/assembleias/$id/preparacao/pontos` - lista de pontos da ordem de trabalhos.
- `/assembleias/$id/preparacao/pontos/$pontoId` - detalhe operacional de um ponto.
- `/assembleias/$id/preparacao/pontos/$pontoId/rascunhos/$rascunhoId` - editor de rascunho de documento a criar.
- `/historico` - histórico.
- `/definicoes` - definições.

## 4. Stores existentes

- `src/lib/assembleias-store.ts`
  - Persistência local de assembleias.
  - Criação, edição e consulta de assembleias.

- `src/lib/documentos-store.ts`
  - Persistência local de documentos carregados.
  - Combina documentos mock com documentos locais.
  - Expõe hooks para listar documentos por assembleia e consultar documento por ID.

- `src/lib/estrategia-store.ts`
  - Estratégia geral da sessão por assembleia.
  - Guarda objetivo político, mensagem principal, riscos/notas e outros campos de briefing.

- `src/lib/pontos-store.ts`
  - Pontos da ordem de trabalhos.
  - Guarda título, resumo, estado, prioridade, sentido de voto, notas, estratégia, documentos associados, ações e rascunhos referenciáveis.

- `src/lib/preparacao-store.ts`
  - Store genérica da preparação.
  - Guarda prioridades, perguntas sugeridas, ações pendentes e documentos a criar de uma assembleia.

- `src/lib/documentos-a-criar-store.ts`
  - Rascunhos locais de documentos a criar.
  - Guarda tipo, título, conteúdo, ponto associado, assembleia associada e estado.

## 5. Fluxo atual da área Preparação

1. O utilizador abre uma assembleia.
2. Entra em `Preparação`.
3. A página de preparação apresenta áreas principais:
   - Documentos
   - Estratégia da Sessão
   - Pontos da Ordem de Trabalhos
   - Documentos a Criar
4. Em `Documentos`, o utilizador consulta e adiciona documentos da assembleia.
5. Em `Estratégia`, o utilizador escreve o briefing político geral da sessão com autosave.
6. Em `Pontos da Ordem de Trabalhos`, o utilizador cria pontos.
7. Ao abrir um ponto, o detalhe apresenta:
   - Dashboard executivo do ponto.
   - Resumo do ponto.
   - Objetivo político.
   - Riscos.
   - Linha de intervenção.
   - Notas internas.
   - Documentos associados.
   - Documentos a Criar.
   - Resumo operacional.
8. Em `Documentos associados`, o utilizador associa ou remove documentos existentes da assembleia ao ponto.
9. Em `Documentos a Criar`, o utilizador cria rascunhos ligados ao ponto.
10. Ao abrir um rascunho, o utilizador edita título, conteúdo e estado, e pode pré-visualizar o documento em formato institucional simples.

## 6. Funcionalidades já implementadas

- Gestão local de assembleias.
- Listagem e detalhe de assembleias.
- Gestão local de documentos de assembleia.
- Detalhe e pré-visualização simples de documentos.
- Área de preparação por assembleia.
- Briefing político da sessão com autosave.
- Criação/listagem de pontos da ordem de trabalhos.
- Detalhe operacional de ponto da ordem de trabalhos.
- Dashboard do ponto com estado, métricas, tarefas e progresso.
- Edição persistente de resumo, objetivo político, riscos, linha de intervenção e notas internas do ponto.
- Associação e desassociação de documentos existentes a um ponto.
- Criação de rascunhos de documentos ligados a um ponto.
- Editor de rascunhos com título, conteúdo e estado.
- Pré-visualização institucional simples do rascunho.
- Histórico e definições em estado inicial.

## 7. Próximos módulos previstos

### IA

- Análise assistida de documentos.
- Sugestão de perguntas, riscos, mensagens políticas e linhas de intervenção.
- Geração assistida de rascunhos a partir do ponto, estratégia e documentos associados.

### Histórico

- Consolidação de assembleias passadas.
- Consulta de decisões, documentos finais e posições assumidas.
- Relação entre pontos recorrentes ao longo do tempo.

### Pesquisa

- Pesquisa global por assembleias, documentos, pontos, notas e rascunhos.
- Filtros por data, estado, tipo de documento e assembleia.

### Exportação PDF

- Exportação de rascunhos e documentos finais.
- Exportação de briefing de ponto ou preparação da sessão.
- Layout institucional consistente.

### Perfil institucional

- Dados do eleito/grupo/órgão autárquico.
- Assinatura institucional.
- Preferências de estilo e linguagem.

### Templates de documentos

- Modelos para moções, recomendações, requerimentos e declarações de voto.
- Estrutura reutilizável para cabeçalhos, fundamentos, propostas e deliberações.

## 8. Regras de arquitetura

- Manter rotas simples e orientadas a uma responsabilidade principal.
- Preferir componentes pequenos, locais e fáceis de ler.
- Separar stores por domínio funcional.
- Evitar ficheiros gigantes; extrair componentes quando a rota crescer demasiado.
- Não reescrever o que já funciona.
- Não alterar o design global sem necessidade.
- Não misturar IA, exportação, pesquisa ou histórico em alterações pequenas de UI.
- Usar dados e stores existentes antes de criar novas abstrações.
- Persistir dados locais de forma explícita e previsível.
- Manter os fluxos incrementais: primeiro estruturar dados, depois UI, depois automações.
- Evitar refactors oportunistas fora do pedido atual.
- Preservar compatibilidade com Lovable e evitar reescrever histórico Git publicado.
