# Problema n.º 14 — Inventário técnico de Sessões/Assembleias

Data da auditoria: 20 de julho de 2026  
Âmbito: código, testes, rotas, tipos, persistência local e schema Supabase existentes no repositório.  
Natureza da missão: inventário apenas; nenhum código, teste, rota, store, contrato ou schema foi alterado.

## 1. Resumo executivo

O Tribuno tem **um único fluxo funcional de produto** para Sessões. As páginas que criam, listam,
abrem e preparam uma Sessão estão sob `/sessoes`; as onze rotas sob `/assembleias` são apenas
redirects finos para esse fluxo e não contêm páginas funcionais paralelas. Também existem três
URLs antigas dentro do próprio namespace `/sessoes` para detalhes de documentos/rascunhos, todas
convertidas diretamente na rota canónica `/documentos/$documentoId`.

A duplicação que permanece é sobretudo **técnica e persistente**, não funcional:

- o domínio frontend ainda chama `Assembleia` à entidade visível como Sessão;
- o store e o repository ativos continuam a chamar-se `assembleias-*`;
- a tabela principal continua a ser `public.assembleias`;
- pontos, documentos carregados e documentos produzidos usam `assembleiaId`, `assembleia_id` ou
  `assembleia_origem_id` como chave da Sessão;
- a estratégia é local-only e usa `assembleiaId` e a chave `tribuno:estrategia`;
- a relação Assunto–Sessão tem contrato remoto canónico (`assunto_sessoes.sessao_id`), mas o
  adaptador e o contrato frontend ainda se chamam `dossie-assembleias` e
  `DossieAssembleiaRelacionada`;
- o store local antigo `tribuno:preparacao` ainda é lido por duas páginas/componentes ativos,
  embora quase toda a sua UI de escrita esteja morta.

Há um núcleo removível de baixo risco: um cartão antigo de Assembleia e nove ficheiros da antiga
UI genérica de preparação sem qualquer entrada de produção. O resto exige, no mínimo, alteração
coordenada de imports e contratos; a renomeação da persistência exige migração de dados e deve ser
separada da limpeza de código morto.

Conclusão: **a limpeza total não deve ser feita numa única missão**. Recomenda-se uma primeira
missão pequena de código morto, uma segunda de nomenclatura frontend com adaptadores de
compatibilidade e uma terceira, isolada, para schema/persistência depois de validar dados reais.

### Contagem das estruturas inventariadas

| Classificação | Quantidade |
| --- | ---: |
| CANÓNICA | 6 |
| COMPATIBILIDADE | 3 |
| LEGADO AINDA REFERENCIADO | 8 |
| CÓDIGO MORTO | 3 |
| INCERTO | 2 |
| **Total** | **22** |

As contagens referem-se às estruturas funcionais/técnicas agrupadas nas secções seguintes, não ao
número de ocorrências textuais. Referências institucionais legítimas como “Assembleia Municipal”
ou “Assembleia de Freguesia” não foram contadas como legado de produto.

## 2. Mapa do fluxo canónico atual

```text
Hoje / Pesquisa / Biblioteca / Assunto
                  │
                  ├── criar Sessão manualmente
                  │   NovaSessaoWizard
                  │        │
                  │        └── adicionarAssembleia()
                  │             ├── localStorage: tribuno:assembleias
                  │             └── Supabase: public.assembleias
                  │
                  └── analisar convocatória
                      InstitutionalDocumentIntake
                           └── institutional-document-flow
                                └── RPC institucional cria/atualiza
                                    assembleias + pontos + documento

/sessoes
  └── /sessoes/$id
       ├── dados/estado da Sessão
       ├── documentos carregados → public.documentos
       ├── pontos → public.pontos
       ├── Assuntos associados → public.assunto_sessoes
       ├── documentos políticos → public.documentos_criados
       └── preparação
            ├── /preparacao
            ├── /preparacao/documentos
            ├── /preparacao/pontos
            │    └── /$pontoId
            ├── /preparacao/estrategia
            └── /preparacao/documentos-a-criar

Qualquer detalhe de documento/rascunho
  └── /documentos/$documentoId
       ├── DocumentoRecebidoDetalhe (public.documentos)
       └── DocumentoCriadoDetalhe (public.documentos_criados)
```

### Entradas canónicas

- `src/routes/_app.sessoes.index.tsx`: lista e ponto de entrada de criação.
- `src/routes/_app.sessoes.$id.tsx`: workspace funcional da Sessão e pai das sub-rotas.
- `src/components/assembleias/NovaSessaoWizard.tsx`: criação manual; apesar da pasta antiga, a
  linguagem e a navegação são de Sessão.
- `src/components/documentos/InstitutionalDocumentIntake.tsx` e
  `src/lib/institutional-document-flow.ts`: criação/preparação a partir de documento institucional.
- `src/components/dashboard/DashboardPage.tsx`, `src/lib/universal-search.ts` e
  `src/components/search/UniversalSearch.tsx`: entradas ativas para Sessões.

### Saídas e dependências canónicas

- `src/lib/session-flow.ts`: decide passos e prontidão.
- `src/lib/session-preparation-signature.ts`: deteta alterações materiais que reabrem preparação.
- `src/components/preparacao/PreparationGuidancePanel.tsx`: orientação transversal.
- `src/lib/document-routes.ts` e
  `src/components/documentos/DocumentoContextoNavegacao.ts`: detalhe documental canónico com
  `origem=sessao&sessaoId=...` apenas como contexto de regresso.
- Supabase: `assembleias`, `pontos`, `documentos`, `documentos_criados`, `assunto_sessoes`,
  `assunto_pontos` e `ponto_documentos`.

## 3. Inventário completo e classificação

### 3.1 CANÓNICA (6)

#### CAN-01 — Rotas e workspace de Sessão

- **Ficheiros/símbolos:** `src/routes/_app.sessoes.index.tsx` (`AssembleiasPage`,
  `AssembleiaWorkspaceCard`), `src/routes/_app.sessoes.$id.tsx` (`AssembleiaDetailPage`),
  `src/routes/_app.sessoes.$id.preparacao.tsx` e respetivas sub-rotas funcionais.
- **Entradas:** sidebar `/sessoes`; dashboard; pesquisa universal; links de Assuntos, Biblioteca e
  Documentos; redirects de `/agenda` e `/assembleias`.
- **Saídas:** stores de Sessão, pontos, documentos, estratégia, documentos produzidos e relações;
  rota canónica de Documento.
- **Testes:** `src/routes/-canonical-concepts.test.ts`,
  `src/routes/-session-creation-composition.test.ts`,
  `src/components/dashboard/DashboardPage.test.ts`, `src/lib/session-flow.test.ts`,
  `src/lib/session-preparation-signature.test.ts` e `src/lib/session-readiness-persistence.test.ts`.
- **Risco de remoção:** alto; é o fluxo de produto atual.
- **Substituto:** não aplicável.

#### CAN-02 — Pontos da ordem de trabalhos

- **Ficheiros/símbolos:** `src/routes/_app.sessoes.$id.preparacao.pontos.tsx`,
  `src/routes/_app.sessoes.$id.preparacao.pontos.$pontoId.tsx`, componentes ativos em
  `src/components/preparacao/`, `src/lib/pontos-store.ts`, `src/lib/pontos-repository.ts`,
  `src/lib/assunto-pontos-store.ts`, `src/lib/ponto-documentos-repository.ts`.
- **Entradas:** workspace, preparação, wizard institucional e dashboard.
- **Saídas:** `public.pontos`, `public.assunto_pontos`, `public.ponto_documentos` e relações locais
  `tribuno:relacoes`.
- **Testes:** `src/lib/pontos-reorder.test.ts`, `src/lib/session-relations.test.ts`,
  `src/lib/beta-p0-stability-integration.test.ts`, `src/lib/session-flow.test.ts`.
- **Risco de remoção:** alto.
- **Nota:** o comportamento é canónico, mas a FK `assembleia_id` é legado técnico inventariado em
  LEG-04.

#### CAN-03 — Estratégia da Sessão

- **Ficheiros/símbolos:** `src/routes/_app.sessoes.$id.preparacao.estrategia.tsx`,
  `src/components/estrategia/StrategyField.tsx`, `src/lib/estrategia-store.ts`.
- **Entradas:** preparação, `PreparationGuidancePanel`, workspace e
  `SessaoPreparacaoWizard`.
- **Saídas:** localStorage `tribuno:estrategia`; assinatura material da preparação.
- **Testes:** cobertura indireta em `src/lib/session-preparation-signature.test.ts` e contratos de
  rotas canónicas.
- **Risco de remoção:** alto; perderia dados locais e uma área funcional.
- **Nota:** funcionalmente canónica; nomes das funções e `assembleiaId` são LEG-05.

#### CAN-04 — Documentos carregados/recebidos associados à Sessão

- **Ficheiros/símbolos:** `src/routes/_app.sessoes.$id.preparacao.documentos.tsx`,
  `src/lib/documentos-store.ts`, `src/lib/documentos-repository.ts`,
  `src/components/documentos/AdicionarDocumentoSheet.tsx`, `DocumentoCard` e
  `DocumentoRecebidoDetalhe`.
- **Entradas:** Sessão, preparação, Biblioteca, intake institucional e pesquisa.
- **Saídas:** `public.documentos`, bucket `documentos`, `/documentos/$documentoId`.
- **Testes:** `src/lib/documentos-repository.test.ts`, `documentos-storage.test.ts`,
  `documentos-lifecycle.test.ts`, `src/routes/-documento-canonical.test.ts` e
  `src/routes/-biblioteca-document-intake.test.ts`.
- **Risco de remoção:** alto.
- **Nota:** o modelo é canónico para documentos recebidos, mas a relação de Sessão conserva
  `assembleiaId`/`assembleia_origem_id` (LEG-06).

#### CAN-05 — Documentos produzidos e detalhe de rascunho

- **Ficheiros/símbolos:** `src/routes/_app.sessoes.$id.preparacao.documentos-a-criar.tsx`,
  `src/components/preparacao/DocumentosACriarSection.tsx`,
  `src/lib/documentos-a-criar-store.ts`, `src/lib/documentos-criados-repository.ts`,
  `src/lib/documentos-criados-service.ts`, `src/components/documentos/DocumentoCriadoDetalhe.tsx`
  e `src/routes/_app.documentos.$documentoId.tsx`.
- **Entradas:** Sessão, Ponto, Assunto, dashboard e geração por IA.
- **Saídas:** `public.documentos_criados`; rota única `/documentos/$documentoId`; exportação PDF e
  DOCX.
- **Testes:** `src/lib/documentos-criados-service.test.ts`,
  `src/lib/documentos-criados-export.test.ts`, `src/lib/institutional-document-flow.test.ts`,
  `src/routes/-documento-canonical.test.ts`.
- **Risco de remoção:** alto.
- **Nota:** “rascunho” é um estado/entrada histórica, não uma segunda página funcional; os dois
  URLs antigos de rascunho são redirects (COMP-02).

#### CAN-06 — Relações Sessão–Assunto e Sessão–Documento/Ponto

- **Ficheiros/símbolos:** `src/lib/dossie-assembleias-store.ts`, `src/lib/relacoes-store.ts`,
  `src/lib/assunto-pontos-store.ts`, `src/lib/ponto-documentos-repository.ts`,
  `supabase/assunto_sessoes.sql` e migrations de relações.
- **Entradas:** workspace de Sessão, detalhe do Assunto, preparação de Ponto, documentos e timeline.
- **Saídas:** `public.assunto_sessoes`, `public.assunto_pontos`, `public.ponto_documentos` e cache
  local `tribuno:relacoes`.
- **Testes:** `src/lib/session-relations.test.ts`, `src/routes/-assunto-route-composition.test.ts`,
  `src/lib/beta-p0-stability-integration.test.ts`.
- **Risco de remoção:** alto.
- **Nota:** o contrato remoto já usa `sessao_id`; os nomes frontend antigos estão em LEG-07.

### 3.2 COMPATIBILIDADE (3)

#### COMP-01 — Família de onze aliases `/assembleias`

- **Ficheiros/rotas:** todos os onze ficheiros `src/routes/_app.assembleias*`:
  coleção, detalhe, preparação, pontos, detalhe de ponto, estratégia, documentos, documentos a
  criar e os detalhes históricos de documento/rascunho.
- **Entrada:** bookmarks, links externos ou histórico de navegação com URL antiga; registo gerado
  em `src/routeTree.gen.ts`.
- **Saída:** `/sessoes...` ou diretamente `/documentos/$documentoId` através de
  `LegacyRedirect`.
- **Dependências:** `src/routes/-legacy-redirect.tsx` e
  `src/routes/-legacy-redirect-path.ts` preservam IDs codificados, query e hash; parâmetros
  canónicos de destino têm precedência.
- **Testes:** `src/routes/-canonical-concepts.test.ts` e
  `src/routes/-documento-canonical.test.ts`.
- **Risco de remoção:** médio/alto sem telemetria ou janela de descontinuação; quebraria URLs
  antigas, embora não remova comportamento funcional.
- **Substituto:** família `/sessoes` e `/documentos/$documentoId`.

#### COMP-02 — Três aliases históricos dentro de `/sessoes`

- **Ficheiros/rotas:** `src/routes/_app.sessoes.$id.documentos.$docId.tsx`,
  `src/routes/_app.sessoes.$id.preparacao.documentos-a-criar.$rascunhoId.tsx` e
  `src/routes/_app.sessoes.$id.preparacao.pontos.$pontoId.rascunhos.$rascunhoId.tsx`.
- **Entrada:** URLs anteriores à consolidação do detalhe documental.
- **Saída:** `/documentos/$documentoId?origem=sessao&sessaoId=$id`.
- **Testes:** `src/routes/-documento-canonical.test.ts` e
  `src/routes/-assunto-route-composition.test.ts`.
- **Risco de remoção:** médio; links internos atuais já evitam estes caminhos, mas não há prova no
  repositório de que nenhum URL externo continua em uso.
- **Substituto:** `/documentos/$documentoId`.

#### COMP-03 — Pontes de dados locais e fallbacks históricos

- **Ficheiros/símbolos:** `lerRelacoesLegadas`/`migrarRelacoesLegadas` em
  `src/lib/dossie-assembleias-store.ts`; fallback de `Documento` entre `assembleiaOrigemId`,
  `assembleiaId`, `origem_tipo/origem_ref` e o sentinel `biblioteca` em
  `src/lib/documentos-repository.ts`; leitura por utilizador das chaves antigas.
- **Entrada:** localStorage existente (`tribuno:dossie-assembleias`, `tribuno:relacoes`,
  `tribuno:documentos`) e linhas remotas anteriores.
- **Saída:** relações canónicas `sessao`/`assunto`, `assunto_sessoes.sessao_id` e contexto
  documental de Sessão/Biblioteca.
- **Testes:** `src/lib/session-relations.test.ts`, `src/lib/documentos-repository.test.ts`,
  `src/lib/documentos-state.test.ts`, `src/lib/beta-p0-stability-integration.test.ts`.
- **Risco de remoção:** alto sem inventário de dados reais; pode ocultar relações ou documentos.
- **Substituto:** contrato remoto com `sessao_id` e relações `TipoObjetoTribuno = "sessao"`.

### 3.3 LEGADO AINDA REFERENCIADO (8)

#### LEG-01 — Tipos centrais `Assembleia` e `EstadoAssembleia`

- **Ficheiro/símbolos:** `src/lib/types.ts`: `Assembleia`, `EstadoAssembleia`, campos
  `Documento.assembleiaId`, `Documento.assembleiaOrigemId`,
  `DocumentoCriado.assembleiaId`, `DossieAssembleiaRelacionada` e timeline tipo `assembleia`.
- **Entradas:** quase todas as rotas e serviços de Sessão, documentos, dashboard, pesquisa, IA e
  preparação.
- **Saídas:** props, stores, repositories, payloads e serialização.
- **Testes:** ampla cobertura indireta; em particular os testes `session-*`, `documentos-*`,
  `institutional-*` e dashboard.
- **Risco de remoção/renomeação:** alto se feito de uma vez; é o contrato TypeScript transversal.
- **Substituto proposto:** `Sessao`, `EstadoSessao`, `sessaoId` e `sessaoOrigemId`, inicialmente com
  aliases temporários.

#### LEG-02 — Store/repository e tabela principal com nome Assembleia

- **Ficheiros/símbolos:** `src/lib/assembleias-store.ts`,
  `src/lib/assembleias-repository.ts`, `supabase/assembleias.sql`,
  `supabase/migrations/20260713_session_preparation_p0.sql` e
  `supabase/migrations/20260713_institutional_document_wow_p0.sql`.
- **Entradas:** criação manual/institucional, todas as páginas de Sessão, Biblioteca, dashboard,
  pesquisa e relações.
- **Saídas:** localStorage/evento `tribuno:assembleias`; CRUD em `public.assembleias`; FKs de
  pontos e documentos.
- **Testes:** `session-readiness-persistence.test.ts`, `session-flow.test.ts`, testes de estabilidade
  P0 e criação institucional.
- **Risco:** alto; renomear tabela sem view/compatibilidade quebra FKs, RPCs, policies, indexes,
  código server e dados existentes.
- **Substituto proposto:** `sessoes-store.ts`, `sessoes-repository.ts` e, numa missão de dados
  separada, `public.sessoes` ou uma view/adapter estável.

#### LEG-03 — Nomes de componentes e símbolos ativos

- **Ficheiros/símbolos:** pasta `src/components/assembleias/`; `NovaAssembleiaDialog`,
  `AssembleiaForm`, `EditarAssembleiaDialog`; `AssembleiasPage`, `AssembleiaWorkspaceCard` e
  `AssembleiaDetailPage` nas rotas canónicas; variáveis `assembleia`/`assembleias`.
- **Entradas:** `/sessoes`, `/sessoes/$id`, dashboard e criação manual.
- **Saídas:** APIs antigas de `assembleias-store`, mas URLs e texto visível canónicos.
- **Testes:** `src/routes/-session-creation-composition.test.ts`,
  `src/routes/-canonical-concepts.test.ts`, `src/components/layout/navigation-layout.test.ts` e
  testes P0.
- **Risco:** médio; refatorização mecânica, mas espalhada e sensível a contratos de composição que
  leem fonte como texto.
- **Substituto proposto:** pasta `sessoes/` e símbolos `Sessao*`.

#### LEG-04 — Identificador de Sessão nos Pontos

- **Ficheiros/símbolos:** `PontoOrdemTrabalhos.assembleiaId`, funções
  `obterPontosDaAssembleia`/`reordenarPontosConfirmado` em `src/lib/pontos-store.ts`, mapeamento
  `assembleia_id` e RPC `p_assembleia_id` em `src/lib/pontos-repository.ts`.
- **Persistência:** `public.pontos.assembleia_id`, unique/indexes por Assembleia e FK para
  `public.assembleias`; função `reordenar_pontos_sessao`.
- **Entradas/saídas:** todas as páginas de pontos, intake institucional, geração de documento e
  assinatura de preparação.
- **Testes:** `pontos-reorder.test.ts`, `session-flow.test.ts`,
  `beta-p0-stability-integration.test.ts`.
- **Risco:** alto para schema; médio se primeiro se criar um adapter frontend `sessaoId`.
- **Substituto proposto:** `sessaoId`/`sessao_id` e `p_sessao_id`.

#### LEG-05 — Estratégia com identidade e persistência antigas

- **Ficheiro/símbolos:** `src/lib/estrategia-store.ts`: `EstrategiaSessao.assembleiaId`,
  `obterEstrategiaDaAssembleia`, `guardarEstrategiaDaAssembleia`; chave/evento
  `tribuno:estrategia`.
- **Entradas:** rota canónica de estratégia, wizard, guidance e assinatura material.
- **Saídas:** apenas localStorage; não foi encontrada tabela Supabase de estratégia.
- **Testes:** cobertura indireta em `session-preparation-signature.test.ts`.
- **Risco:** médio/alto: renomear a propriedade sem migração local faz desaparecer estratégias
  existentes; a ausência de persistência remota aumenta a incerteza.
- **Substituto proposto:** `sessaoId` e leitura dual/migração versionada da chave local.

#### LEG-06 — Identidade de Sessão nos dois modelos documentais

- **Ficheiros/símbolos:** `Documento.assembleiaId`/`assembleiaOrigemId`,
  `DocumentoCriado.assembleiaId`; stores, repositories, `document-routes`, editor, intake,
  dashboard e serviços de IA.
- **Persistência:** `public.documentos.assembleia_origem_id` e
  `public.documentos_criados.assembleia_id`, ambas FKs de `public.assembleias`.
- **Contratos adicionais:** `src/lib/ai/context-builder.server.ts` seleciona os nomes SQL antigos;
  `src/lib/ai/document-generator.server.ts` mapeia `assembleia_id`; o frontend usa
  `sessaoId` apenas no search param canónico de navegação.
- **Testes:** `documentos-repository.test.ts`, `document-routes.test.ts`,
  `documentos-criados-service.test.ts`, `institutional-document-flow.test.ts`,
  `src/routes/-documento-canonical.test.ts`.
- **Risco:** alto. Os dois modelos documentais são deliberadamente distintos e não devem ser
  fundidos nesta limpeza.
- **Substituto proposto:** adapters `sessaoId`/`sessaoOrigemId`; migração SQL posterior e separada.

#### LEG-07 — Adaptador Assunto–Sessão e timeline com nomes Dossiê/Assembleia

- **Ficheiros/símbolos:** `src/lib/dossie-assembleias-store.ts`,
  `DossieAssembleiaRelacionada`, `listarAssembleiasDoDossie`,
  `associarAssembleiaAoDossie`, `useDossiesAssociadosAAssembleia`; evento timeline com
  `tipo/origemTipo: "assembleia"`.
- **Entradas:** páginas canónicas de Sessão e Assunto, documentos, preparação e wizard de Assunto.
- **Saídas:** contrato remoto já canónico `assunto_sessoes(assunto_id, sessao_id)` e relações
  locais `origemTipo: "sessao"`.
- **Testes:** `session-relations.test.ts` e `-assunto-route-composition.test.ts`.
- **Risco:** médio/alto; há três representações coexistentes: cache histórica, relação genérica e
  tabela remota.
- **Substituto proposto:** `assunto-sessoes-store.ts`, `AssuntoSessaoRelacionada` e timeline
  `sessao`, mantendo leitura dos valores antigos até migração.

#### LEG-08 — Store antigo de preparação ainda lido por código ativo

- **Ficheiro/símbolos:** `src/lib/preparacao-store.ts`; chave `tribuno:preparacao`; tipos
  `PrioridadeAssembleia`, `PerguntaSugerida`, `AcaoPendente`,
  `DocumentoPlaneadoPreparacao`; `obterPreparacaoDaAssembleia`.
- **Entradas reais:**
  `src/routes/_app.sessoes.$id.preparacao.pontos.$pontoId.tsx` usa `preparacao.acoes` no resumo de
  tarefas; `src/components/preparacao/PreparationGuidancePanel.tsx` lê perguntas/prioridades no
  fallback usado quando a entidade de Sessão não está carregada.
- **Saídas:** métricas de tarefas do Ponto e estado de guidance fallback. Os writers antigos não têm
  entrada ativa, mas dados previamente gravados continuam a ser consumidos.
- **Testes:** `PreparationGuidancePanel.test.ts` cobre o estado derivado, mas não foi encontrado um
  teste de migração/eliminação de `tribuno:preparacao`.
- **Risco:** médio/alto. O ficheiro não é código morto; apagar a chave/store altera métricas e pode
  perder dados locais históricos.
- **Substituto proposto:** tarefas/perguntas canónicas do próprio Ponto ou uma migração explícita
  para entidades persistidas; requer decisão de produto.

### 3.4 CÓDIGO MORTO (3)

#### MORTO-01 — Cartão antigo `AssembleiaCard`

- **Ficheiro:** `src/components/cards/AssembleiaCard.tsx`.
- **Símbolo:** `AssembleiaCard`.
- **Referências de entrada:** nenhuma fora do próprio ficheiro.
- **Referências de saída:** `Assembleia`, `StatusBadge`, `listarDocumentosLocais`, rota canónica de
  Sessão.
- **Testes:** nenhum teste associado.
- **Risco de remoção:** baixo; a lista ativa implementa `AssembleiaWorkspaceCard` localmente em
  `src/routes/_app.sessoes.index.tsx`.
- **Substituto:** `AssembleiaWorkspaceCard` da página canónica.

#### MORTO-02 — Antiga UI genérica de prioridades/perguntas/ações/documentos planeados

- **Ficheiros:**
  `src/components/preparacao/AcaoCard.tsx`,
  `AdicionarAcaoDialog.tsx` (vazio), `AdicionarPrioridadeDialog.tsx`,
  `AdicionarPerguntaDialog.tsx`, `DocumentoACriarCard.tsx`, `PerguntaCard.tsx`,
  `PrioridadeCard.tsx`, `SecaoPreparacao.tsx` e `badges.tsx`.
- **Referências de entrada:** nenhuma a partir de rotas ou componentes ativos. As referências entre
  estes ficheiros formam apenas uma ilha interna; `AdicionarItemPreparacao` não pertence à ilha,
  porque continua a ser usado por `AdicionarPontoDialog`.
- **Referências de saída:** tipos/writers de `preparacao-store`, UI base e ícones.
- **Testes:** nenhum teste importa estes componentes.
- **Risco de remoção:** baixo como conjunto. Não remover `src/lib/preparacao-store.ts` na mesma
  ação.
- **Substituto:** preparação atual baseada em `PontoOrdemTrabalhos`,
  `DocumentosACriarSection`, `PontoPreparacaoForm` e workspace de Sessão.

#### MORTO-03 — Exports sem consumidores em stores ativos

- **Símbolos confirmados sem chamadores de produção:**
  `editarAssembleia`, `apagarAssembleia`, `confirmarRevisaoFinalAssembleia`,
  `adicionarDocumento` (versão não confirmada), `atualizarPonto`, `removerPonto`, e os writers/
  removers antigos de `preparacao-store` fora da ilha MORTO-02.
- **Ficheiros:** `src/lib/assembleias-store.ts`, `documentos-store.ts`, `pontos-store.ts` e
  `preparacao-store.ts`.
- **Referências de entrada:** só as próprias declarações; no caso de adicionar prioridade/pergunta,
  apenas componentes já classificados como mortos.
- **Referências de saída:** repositories e persistência local/remota.
- **Testes:** alguns helpers confirmados têm versões com dependências testadas; estes exports
  específicos não têm chamadores ativos.
- **Risco de remoção:** baixo/médio por símbolo, mas **nenhum destes ficheiros pode ser removido**;
  a alteração deve ser validada por typecheck/testes e por procura de consumidores externos não
  representados no repositório.

### 3.5 INCERTO (2)

#### INCERTO-01 — Valor e destino dos dados `tribuno:preparacao`

O repositório prova que a chave é lida, mas não permite saber quantos utilizadores têm prioridades,
perguntas, ações ou documentos planeados gravados, nem se esses dados devem ser migrados ou
descartados. Antes de remover LEG-08 é necessário inspecionar dados reais ou criar uma migração
local não destrutiva e confirmar a equivalência semântica com campos do Ponto.

#### INCERTO-02 — Utilização real dos aliases e estado efetivo do schema implantado

O repositório prova que os aliases existem e que as migrations esperam `public.assembleias`, mas
não contém telemetria de URLs, inventário de bookmarks, dump de produção nem histórico de
migrations aplicadas por ambiente. Não é seguro remover redirects nem renomear tabelas/FKs apenas
com base no grafo local.

## 4. Existem dois fluxos completos?

**Não.** A inspeção das rotas mostra:

- as onze rotas `/assembleias...` só importam `createFileRoute` e `LegacyRedirect`;
- não importam stores, formulários, documentos, pontos ou componentes de preparação;
- os caminhos canónicos `/sessoes...` contêm toda a implementação funcional;
- os detalhes antigos de rascunho e documento redirecionam diretamente para
  `/documentos/$documentoId`;
- os links internos normais apontam para `/sessoes` e `/documentos`, conforme os contratos de
  `-canonical-concepts.test.ts` e `-documento-canonical.test.ts`.

Portanto, os pares “preparação/pontos/estratégia/documentos/documentos a criar/detalhe de
rascunho” não são hoje duas implementações. São uma implementação canónica de Sessão, uma família
de aliases de URL e muitos nomes técnicos antigos dentro da implementação canónica.

## 5. Incompatibilidades e contratos de dados/persistência

| Camada | Nome atual | Significado de produto | Incompatibilidade/risco |
| --- | --- | --- | --- |
| Rota | `/sessoes/$id` | Sessão | Canónico. |
| Rota | `/assembleias/$id` | Sessão | Alias; remover quebra URLs antigas. |
| Search param | `sessaoId` | origem visual do Documento | Já canónico; não altera identidade/carregamento. |
| Tipo TS | `Assembleia` | Sessão | Nome antigo transversal. |
| Tipo TS | `assembleiaId` | ID de Sessão | Presente em Ponto, DocumentoCriado, Documento e estratégia. |
| Tipo TS | `assembleiaOrigemId` | Sessão de origem do Documento | Coexiste com `assembleiaId` e `origemTipo/origemRef`. |
| Supabase | `assembleias` | Sessões | Tabela pai de várias FKs e RPCs. |
| Supabase | `pontos.assembleia_id` | `sessao_id` | FK, unique, indexes e RPC dependem do nome. |
| Supabase | `documentos.assembleia_origem_id` | `sessao_origem_id` | FK opcional; repository aceita fallbacks históricos. |
| Supabase | `documentos_criados.assembleia_id` | `sessao_id` | FK opcional usada por editor, IA e preparação. |
| Supabase | `assunto_sessoes.sessao_id` | Sessão | Nome já canónico, mas referencia `assembleias(id)`. |
| RPC | `p_assembleia_id` | ID de Sessão | Contrato de `reordenar_pontos_sessao`. |
| localStorage | `tribuno:assembleias` | Sessões | Alterar chave sem leitura dual perde cache local. |
| localStorage | `tribuno:estrategia` + `assembleiaId` | Estratégia de Sessão | Única persistência encontrada; risco elevado de perda. |
| localStorage | `tribuno:preparacao` + `assembleiaId` | dados antigos de preparação | Ainda lidos; writers sem entrada ativa. |
| localStorage | `tribuno:dossie-assembleias` | relações Assunto–Sessão antigas | Migrado em runtime para `tribuno:relacoes` e Supabase. |
| Sentinel | `Documento.assembleiaId = "biblioteca"` | sem Sessão | Contrato histórico; repository converte-o em FK nula. |
| Timeline | `tipo/origemTipo = "assembleia"` | Sessão | Diverge de `TipoObjetoTribuno = "sessao"`. |

### Observações adicionais

1. `supabase/assembleias.sql` é um baseline que não contém as quatro colunas de prontidão; elas são
   adicionadas por `20260713_session_preparation_p0.sql`. Uma limpeza futura deve tratar o estado
   resultante das migrations, não apenas o baseline.
2. `public.documentos` e `public.documentos_criados` são dois modelos intencionais e ativos. A
   consolidação de nomes de Sessão não autoriza a fusão desses modelos.
3. `public.assunto_sessoes` já usa nomenclatura canónica no lado da relação; é um bom ponto de
   fronteira para adapters frontend.
4. O texto “Assembleia Municipal/de Freguesia” em perfil, contexto institucional, prompts e
   documentos é identidade legal do órgão. Não deve ser renomeado para “Sessão”.

## 6. Riscos de remoção

### Baixo

- remover apenas os dez ficheiros listados como seguros na secção 9;
- remover exports comprovadamente sem chamadores, mantendo os ficheiros/stores;
- renomear símbolos internos puramente locais depois de atualizar testes de composição.

### Médio

- reorganizar a pasta `components/assembleias` e renomear componentes ativos;
- introduzir `Sessao`/`sessaoId` no frontend mantendo aliases e mapeamentos externos;
- retirar aliases de URL depois de telemetria/janela de descontinuação;
- eliminar o adapter local `tribuno:dossie-assembleias` depois de confirmar migração.

### Alto

- apagar `assembleias-store`/repository ou `public.assembleias`;
- renomear FKs/colunas/RPCs sem migração transacional e compatibilidade;
- apagar `tribuno:estrategia` ou `tribuno:preparacao` sem migração de localStorage;
- alterar simultaneamente tipos frontend, schema, IA server-side e redirects;
- assumir que “Assembleia” institucional é legado de produto.

## 7. Sequência recomendada para eliminar o legado

1. **Remover apenas código morto de UI.** Apagar os dez ficheiros seguros, ajustar nada além de
   eventuais barrels se forem encontrados, e validar a suite completa.
2. **Reduzir APIs mortas nos stores.** Remover exports sem consumidores um a um, com `rg`,
   typecheck e testes. Não tocar ainda em chaves ou dados.
3. **Criar nomenclatura canónica no frontend.** Introduzir `Sessao`, `EstadoSessao`,
   `sessaoId`, `sessoes-store` e `sessoes-repository`, mantendo aliases temporários nos limites.
4. **Migrar componentes e imports.** Mover/renomear `components/assembleias` e símbolos das rotas
   canónicas. Atualizar testes que inspecionam fonte.
5. **Resolver o store antigo de preparação.** Definir destino para ações/perguntas/prioridades,
   criar leitura dual/migração local e só depois remover `tribuno:preparacao`.
6. **Normalizar relações e timeline.** Trocar Dossiê/Assembleia por Assunto/Sessão no adapter e
   migrar valores locais `assembleia` para `sessao` sem perder histórico.
7. **Preparar migração de dados remota.** Inventariar schema implantado, volumes, FKs, policies,
   indexes, RPCs e código server-side. Escolher rename, novas colunas com backfill ou views.
8. **Executar migração Supabase separada.** Aplicar compatibilidade, backfill e verificações de
   integridade antes de remover nomes antigos.
9. **Descontinuar aliases de URL por último.** Só após dados de utilização ou uma decisão explícita
   de quebra de compatibilidade.

## 8. Divisão proposta em missões futuras

### Missão A — Código morto (custo baixo, risco baixo)

Remover MORTO-01 e MORTO-02; avaliar MORTO-03 por símbolo. Sem mudanças de dados, rotas ou nomes
ativos.

### Missão B — Vocabulário frontend (custo médio, risco médio)

Introduzir e adotar `Sessao`/`sessaoId`, renomear componentes e módulos, mantendo adapters para
payloads SQL e localStorage. Não alterar schema.

### Missão C — Preparação e relações históricas (custo médio/alto, risco médio/alto)

Migrar `tribuno:preparacao`, `tribuno:dossie-assembleias` e valores de timeline. Esta missão exige
decisão sobre preservação de ações/perguntas antigas e testes de migração.

### Missão D — Persistência Supabase (custo alto, risco alto)

Renomear/compatibilizar `assembleias`, FKs e RPCs; atualizar repositories e código IA server-side;
validar RLS, indexes, rollback e dados reais. Não deve ser combinada com mudanças visuais.

### Missão E — Retirada de URLs antigas (custo baixo/médio, risco dependente de uso)

Remover aliases `/assembleias` e detalhes históricos apenas depois de validar utilização externa.

## 9. Ficheiros que podem ser removidos com segurança

Com base nas referências existentes **dentro deste repositório**, os seguintes ficheiros não têm
entrada de produção nem testes associados e podem ser removidos numa missão posterior de baixo
risco:

1. `src/components/cards/AssembleiaCard.tsx`
2. `src/components/preparacao/AcaoCard.tsx`
3. `src/components/preparacao/AdicionarAcaoDialog.tsx`
4. `src/components/preparacao/AdicionarPrioridadeDialog.tsx`
5. `src/components/preparacao/AdicionarPerguntaDialog.tsx`
6. `src/components/preparacao/DocumentoACriarCard.tsx`
7. `src/components/preparacao/PerguntaCard.tsx`
8. `src/components/preparacao/PrioridadeCard.tsx`
9. `src/components/preparacao/SecaoPreparacao.tsx`
10. `src/components/preparacao/badges.tsx`

Condição: remover MORTO-02 como conjunto e voltar a executar procura de imports, testes,
typecheck, lint e build. `AdicionarItemPreparacao.tsx` **não** está nesta lista porque é usado pelo
diálogo canónico de adicionar Ponto.

## 10. Ficheiros que não devem ainda ser removidos

### Rotas de compatibilidade

- todos os onze `src/routes/_app.assembleias*`;
- `src/routes/_app.sessoes.$id.documentos.$docId.tsx`;
- os dois ficheiros de detalhe histórico `$rascunhoId` sob `/sessoes`;
- `src/routes/-legacy-redirect.tsx` e `src/routes/-legacy-redirect-path.ts`;
- `src/routeTree.gen.ts` (gerado e ainda regista as rotas).

### Núcleo funcional/persistente com nomes antigos

- `src/lib/types.ts`;
- `src/lib/assembleias-store.ts` e `src/lib/assembleias-repository.ts`;
- `src/lib/pontos-store.ts` e `src/lib/pontos-repository.ts`;
- `src/lib/estrategia-store.ts`;
- `src/lib/preparacao-store.ts`;
- `src/lib/documentos-store.ts` e `src/lib/documentos-repository.ts`;
- `src/lib/documentos-a-criar-store.ts` e `src/lib/documentos-criados-repository.ts`;
- `src/lib/dossie-assembleias-store.ts` e `src/lib/relacoes-store.ts`;
- `src/lib/session-flow.ts` e `src/lib/session-preparation-signature.ts`;
- `src/lib/ai/context-builder.server.ts`, `src/lib/ai/document-generator.server.ts` e
  `src/lib/institutional-document-flow.ts`;
- componentes ativos em `src/components/assembleias/`, incluindo `AssembleiaForm`,
  `NovaAssembleiaDialog`, `NovaSessaoWizard`, `EditarAssembleiaDialog` e
  `SessaoPreparacaoWizard`;
- componentes ativos de preparação (`AdicionarPontoDialog`, `EditarPontoDialog`,
  `PreparationGuidancePanel`, `DocumentosACriarSection`, `PontoDashboard`,
  `PontoPreparacaoForm`, `LigadoAoPontoSection`, `TimelineHistorico` e
  `PreparacaoAreaCard`).

### SQL/migrations

- `supabase/assembleias.sql`, `pontos.sql`, `documentos.sql`, `documentos_criados.sql` e
  `assunto_sessoes.sql`;
- migrations de preparação, documentos por ponto e intake institucional.

Estes ficheiros contêm comportamento ou contratos ativos. Alguns podem ser renomeados ou
substituídos no futuro, mas não apagados diretamente.

## 11. Critérios de aceitação para a futura limpeza

1. Existe uma única família funcional de rotas de Sessão e uma única rota funcional de Documento.
2. Nenhum link interno normal depende de redirects de compatibilidade.
3. `Sessao`, `EstadoSessao`, `sessaoId` e `sessaoOrigemId` são os nomes internos canónicos.
4. Nomes institucionais legais “Assembleia Municipal/de Freguesia” são preservados.
5. Dados existentes nas chaves `tribuno:assembleias`, `tribuno:estrategia`,
   `tribuno:preparacao`, `tribuno:dossie-assembleias`, `tribuno:documentos` e
   `tribuno:documentos-a-criar` são migrados ou lidos em compatibilidade, sem perda silenciosa.
6. Relações Assunto–Sessão, Ponto–Documento e Documento–Sessão mantêm IDs e integridade.
7. Uma migração remota valida contagens antes/depois, FKs, unique constraints, indexes, RLS,
   triggers, RPCs e rollback.
8. O código server-side/IA deixa de consultar colunas antigas apenas depois de a compatibilidade
   remota estar implantada.
9. Os dois modelos `documentos` e `documentos_criados` continuam funcionais e não são fundidos por
   acidente.
10. Estratégia, prontidão, reabertura após alteração material, criação institucional, edição,
    upload, exportação e relações preservam o comportamento atual.
11. Aliases são mantidos até existir decisão explícita/telemetria para os retirar; quando retirados,
    os testes e `routeTree.gen.ts` são atualizados.
12. Não restam imports ou símbolos `Assembleia` de produto, exceto adapters de compatibilidade
    documentados e referências institucionais legítimas.
13. `rg` não encontra imports dos ficheiros mortos removidos.
14. `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` e `git diff --check` passam.
15. O `git status` contém apenas as alterações autorizadas para a missão de limpeza.

## 12. Estimativa qualitativa de custo e risco

| Trabalho | Custo | Risco | Justificação |
| --- | --- | --- | --- |
| Remover os dez ficheiros mortos | Baixo | Baixo | Sem entradas de produção/testes. |
| Remover exports mortos dos stores | Baixo | Baixo/médio | Ficheiros continuam ativos; validar consumidores externos. |
| Renomear componentes/pasta frontend | Médio | Médio | Muitos imports e testes de composição textual. |
| Introduzir tipos/adapters `Sessao` | Médio | Médio | Contrato transversal, mas pode ser incremental. |
| Migrar `tribuno:preparacao` e estratégia | Médio/alto | Médio/alto | Dados local-only e destino semântico por decidir. |
| Normalizar relações/timeline | Médio/alto | Médio/alto | Três representações e migração runtime existente. |
| Renomear schema/FKs/RPCs Supabase | Alto | Alto | Dados, RLS, indexes, código server-side e rollback. |
| Remover aliases de URL | Baixo | Médio/alto | Implementação simples; impacto externo desconhecido. |

**Estimativa global:** custo alto e risco alto se tratado como uma única alteração; custo e risco
controláveis se dividido nas cinco missões propostas.

## Evidência de procura sistemática

A auditoria pesquisou, com correspondência textual e por grafo de imports, pelo menos:
`assembleia`, `assembleias`, `Assembleia`, `AssembleiaId`, `assembleiaId`, `assembleia_id`,
`assembleia_origem_id`, `/assembleias`, `tribuno:assembleias`, `tribuno:preparacao`,
`tribuno:estrategia`, `rascunhoId`, rotas de preparação, pontos, estratégia, documentos e
documentos a criar. Foram também lidos os repositories, stores, componentes, rotas, tipos, testes,
SQL base e migrations relevantes.

`AssembleiaId` com A maiúsculo não existe como tipo ou campo declarado; as ocorrências encontradas
fazem parte de nomes de variáveis locais como `antesAssembleiaId`. A forma contratual real é
`assembleiaId` no TypeScript e `assembleia_id`/`assembleia_origem_id` no SQL.
