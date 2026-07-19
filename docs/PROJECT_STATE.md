# Tribuno — Estado Oficial do Projeto

> Este ficheiro é a fonte oficial de verdade sobre o estado do Tribuno.
> Deve ser consultado no início de cada novo chat, missão Codex ou ciclo de desenvolvimento.

Última atualização: 19 de julho de 2026

---

## Objetivo atual

Fechar uma versão Beta funcional, estável e distribuível para eleitos reais.

Nesta fase:

- não aumentar o escopo;
- não criar funcionalidades sem necessidade direta para a Beta;
- resolver apenas um problema de cada vez;
- evitar refatorizações internas que não desbloqueiem o uso real;
- controlar o consumo de créditos Codex;
- preservar todos os fluxos já validados.

---

## Método oficial

Cada problema deve seguir esta sequência:

1. Analisar o problema sem assumir imediatamente uma solução.
2. Definir o resultado necessário para atingir pelo menos 9,0/10.
3. Desenhar a solução.
4. Preparar uma única missão fechada para o Codex.
5. Validar testes, typecheck, lint, build e comportamento real.
6. Atualizar este ficheiro.
7. Fechar o problema.
8. Só depois passar ao problema seguinte.

Um problema não é considerado fechado abaixo de 9,0/10.

---

# Estado dos 14 problemas

## ✅ Problema n.º 1 — Demasiados conceitos para trabalho que deveria parecer simples

Estado: FECHADO
Avaliação: 9,5/10

### Problema original

O Tribuno expunha simultaneamente conceitos como:

- Sessões
- Assembleias
- Assuntos
- Dossiês
- Documentos
- Documentos a criar
- Rascunhos
- Biblioteca
- Caixa de entrada
- Estratégia
- Pontos
- Preparação

O produto obrigava o eleito a compreender a ontologia interna criada ao longo do desenvolvimento.

### Decisão arquitetural

- O Assunto é a unidade central de trabalho.
- A Sessão é um momento institucional onde os assuntos são tratados.
- Os Documentos são ações produzidas a partir de um Assunto.
- A Biblioteca é a memória documental.

### Navegação oficial

- Hoje
- Assuntos
- Sessões
- Biblioteca

### Implementação concluída

- Conceitos antigos removidos da interface.
- Dossiês removidos enquanto conceito visível.
- Assembleia removida enquanto conceito de produto.
- Caixa de Entrada removida da navegação.
- Rotas canónicas consolidadas.
- URLs antigas mantidas através de redirecionamentos.
- Fluxos Beta preservados.
- Testes, typecheck, lint e build aprovados.

### Adiado para depois da Beta

Refatorização interna de nomes técnicos como:

- dossieId
- Dossie
- assembleiaId
- Assembleia

---

## ✅ Problema n.º 2 — A navegação esconde a complexidade, mas não a resolveu

Estado: FECHADO
Avaliação: 9,4/10

### Diagnóstico confirmado

A simplificação da navegação não tinha eliminado a duplicação documental:

- `/documentos/$documentoId` continha o editor dos documentos produzidos;
- `/sessoes/$id/documentos/$docId` continha a página funcional dos documentos carregados ou recebidos;
- a Biblioteca importava a implementação da Sessão e simulava um contexto com o identificador artificial `biblioteca`;
- URLs de Assembleia, Assunto e Dossiê mantinham percursos paralelos ou redirects intermédios;
- links internos normais ainda abriam documentos através da Biblioteca ou da Sessão.

O mesmo conceito visível tinha, portanto, identidade técnica e comportamento de navegação dependentes do ponto de entrada.

### Decisão arquitetural

- Documento é uma entidade autónoma do Tribuno.
- A única rota funcional de detalhe é `/documentos/$documentoId`.
- Biblioteca, Sessão e Assunto são apenas origens de navegação.
- A origem pode alterar breadcrumb e botão Voltar, mas não participa na identidade, carregamento, estado, persistência, relações, ações ou permissões.
- Os dois modelos persistidos atuais são compostos na mesma página canónica sem migração estrutural nesta fase.

### Implementação concluída

- A rota canónica compõe explicitamente documentos produzidos e documentos carregados ou recebidos.
- A implementação funcional foi extraída das rotas para componentes neutros em `src/components/documentos/`.
- Foram introduzidos search params simples para `biblioteca`, `sessao` e `assunto`.
- A origem Sessão ou Assunto só é aceite quando o identificador corresponde a uma relação real do Documento.
- Origens desconhecidas, incompletas, contraditórias ou sem relação real são ignoradas e regressam em segurança à Biblioteca.
- Na ausência de origem válida, o breadcrumb apresenta apenas Documento e o botão Voltar aponta para a Biblioteca.
- Os links internos da Biblioteca, Sessões, Assuntos, preparação e dashboard apontam diretamente para a rota canónica.
- Os caminhos de timeline e helpers documentais também geram URLs canónicos.

### Rota canónica final

`/documentos/$documentoId`

Origens válidas suportadas:

- `?origem=biblioteca`
- `?origem=sessao&sessaoId=$id`
- `?origem=assunto&assuntoId=$id`

### Redirects de compatibilidade

São redirects finos e diretos para a rota canónica:

- `/biblioteca/documentos/$docId`
- `/sessoes/$id/documentos/$docId`
- `/assembleias/$id/documentos/$docId`
- `/assuntos/$dossieId/documentos/$documentoId`
- `/dossies/$dossieId/documentos/$documentoId`
- URLs antigas de rascunhos dentro da preparação de Sessões e Assembleias.

Os redirects preservam IDs, query string e hash, dão prioridade à origem canónica conhecida e não criam ciclos nem redirects intermédios.

Mantêm-se igualmente os redirects gerais já fechados:

- `/dossies` → `/assuntos`
- `/assembleias` → `/sessoes`
- `/caixa-de-entrada` → `/biblioteca`

### Comportamentos preservados

- fluxo Assunto → geração de Documento e abertura automática;
- edição e persistência confirmada de documentos produzidos;
- exportação PDF e DOCX;
- pré-visualização e transferência de documentos carregados;
- estados documentais;
- relações entre documentos;
- relações Documento ↔ Assunto e Documento ↔ Sessão;
- preparação de Sessão;
- permissões, carregamento remoto por ID e isolamento por utilizador.

### Testes e validações executados

- `npm test`: 334 testes aprovados, 0 falhas;
- `npm run typecheck`: aprovado;
- `npm run lint`: aprovado com 0 erros e 19 avisos antigos não relacionados;
- `npm run build`: aprovado.

Foram adicionados contratos específicos para a rota funcional única, redirects finos, origem validada, fallback seguro, independência dos dados face aos search params, preservação de query/hash, ausência de ciclos, links internos canónicos e manutenção de edição, exportação, preview e relações.

### Justificação da avaliação

A avaliação de 9,4/10 é sustentada por uma única identidade URL, uma única página canónica, componentes neutros, redirects diretos, links internos sem dependência de redirects, validação relacional das origens e aprovação integral dos testes e comandos obrigatórios. A solução fecha a duplicação funcional sem alargar o escopo nem arriscar uma migração de dados durante a Beta.

### Riscos residuais

- Documentos produzidos e documentos carregados continuam em modelos persistidos diferentes, compostos pela página canónica.
- Permanecem nomes técnicos legados como `assembleiaId`, `dossieId`, `Assembleia` e `Dossie` no interior da aplicação.
- O lint mantém 19 avisos preexistentes fora do âmbito desta missão, sem erros.

### Trabalho deliberadamente adiado

- migração ou fusão dos modelos persistidos de Documento;
- alterações ao schema Supabase;
- renomeação técnica global de Assembleia/Dossiê;
- refatorização geral de dívida técnica não necessária ao fluxo Beta.

---

## ✅ Problema n.º 3 — A página Hoje está demasiado carregada

Estado: FECHADO
Avaliação: 9,5/10

### Diagnóstico confirmado

O dashboard misturava missão prioritária, progresso conceptual, checklist, tarefas, alertas,
métricas, atividade, documentos recentes, acessos rápidos e onboarding. As mesmas necessidades
eram repetidas em vários blocos e condições meramente existentes eram apresentadas como urgentes.

### Decisão arquitetural

- A página Hoje descreve exclusivamente aquilo que o eleito deve fazer a seguir.
- A decisão é produzida por uma única função pura e testável, `decideToday`.
- O resultado tem quatro estados: `onboarding`, `active`, `critical` e `clear`.
- Só pode existir uma ação principal, até dois alertas reais e até três pendências secundárias.
- Cada necessidade tem uma chave estável e só pode ocupar um dos três níveis da decisão.
- A data atual é fornecida ao motor como entrada, mantendo a lógica determinística.
- Assuntos ativos, documentos, rascunhos, sessões ou atividade não geram urgência apenas por
  existirem.

### Implementação concluída

- O antigo `MissionCard` foi substituído por um cartão simples com título, explicação, contexto
  essencial, ação e destino existente.
- Foram removidos da página o anel e percentagem de progresso, checklist permanente, métricas,
  atividade recente, documentos recentes e acessos rápidos.
- O onboarding passou a ser a própria ação principal e preserva, sem duplicação, o carregamento de
  convocatória e a criação manual de sessão.
- Alertas e pendências só são renderizados quando existem e respeitam os limites definidos.
- O estado tranquilo é exclusivo e apresenta “Não tens nada urgente neste momento” e “O mandato
  está em dia”.
- Os links mantêm as rotas funcionais de preparação e a rota canónica de Documento.
- `TopBar`, comportamento responsivo e integração de ajuda foram preservados.
- `useProductHelpPageState` passou a refletir diretamente a decisão central, sem métricas ou listas
  antigas.

### Regras finais de prioridade

1. Sessão nos três dias seguintes com preparação explicitamente não concluída.
2. Documento da próxima sessão em estado `Por rever` ou `Importante`.
3. Próxima sessão cujo estado de preparação ainda não é `pronta`.
4. Ponto da próxima sessão ainda não preparado.
5. Documento produzido em `rascunho` ou `em revisão`.
6. Recomendação ou requerimento já apresentado e disponível para acompanhamento.
7. Onboarding ainda necessário, quando não existe próxima sessão.
8. Estado tranquilo.

Não foi criado um sinal artificial para assuntos ativos: sem uma condição concreta adicional já
persistida, não entram na decisão.

### Testes e validações executados

- `npm test`: 349 testes aprovados, 0 falhas;
- `npm run typecheck`: aprovado;
- `npm run lint`: aprovado com 0 erros e 19 avisos antigos não relacionados;
- `npm run build`: aprovado.

Foram adicionados testes unitários para onboarding, prioridades, sessão crítica, documento em
curso, estado tranquilo, limites, não duplicação e exclusividade. Os contratos de composição
confirmam a remoção dos blocos antigos, onboarding único, renderização condicionada, destinos
funcionais e rota documental canónica.

### Justificação da avaliação

A avaliação de 9,5/10 resulta da centralização integral da decisão, redução profunda da página,
ausência de urgências baseadas apenas em contagens, exclusividade dos estados, preservação dos
fluxos existentes e aprovação de toda a validação obrigatória sem erros novos.

### Riscos residuais

- A prontidão depende do campo existente `preparacaoEstado`; o cálculo conceptual detalhado do
  progresso continua deliberadamente reservado ao Problema n.º 8.
- O runner de testes emite no sandbox um aviso `EPERM` ao tentar abrir o WebSocket de HMR do Vite,
  mas termina normalmente com os 349 testes aprovados.
- O lint conserva 19 avisos preexistentes fora do âmbito desta missão.

### Ajuste pós-validação com conta limpa

A validação real mostrou que uma conta sem Assuntos, Documentos ou Sessões não deve assumir a
preparação de uma primeira Sessão. A prioridade inicial foi corrigida para começar por um novo
Assunto ou pelo fluxo documental existente de análise. A Sessão só é sugerida quando já existe
trabalho que torne esse passo útil, deixando de ser um primeiro passo obrigatório.

---

## ⏳ Problema n.º 4 — As métricas parecem ornamentais para um eleito

Estado: PENDENTE

### Diagnóstico

Métricas como número de documentos, assuntos ou rascunhos medem atividade dentro do Tribuno, mas não necessariamente qualidade do mandato.

### Métricas potencialmente úteis

- requerimentos sem resposta;
- compromissos ainda não cumpridos;
- assuntos parados há mais de 30 dias;
- prazos institucionais próximos;
- propostas entregues versus aprovadas;
- temas prometidos publicamente ainda sem ação;
- pedidos de cidadãos pendentes.

---

## ✅ Problema n.º 5 — A Agenda não é uma agenda

Estado: FECHADO
Avaliação: 9,4/10

### Diagnóstico confirmado

A área Agenda apresentava essencialmente as próximas Sessões já registadas, duplicando parte da
área canónica de Sessões sem constituir uma agenda do mandato.

### Decisão arquitetural

- Sessões mantém-se como a única área canónica para criar, listar, abrir, editar e preparar
  Sessões, consultar pontos e aceder aos respetivos fluxos.
- Agenda deixa de ser um conceito e um destino da experiência principal durante a Beta.
- `/agenda` existe apenas como URL antiga de compatibilidade e redireciona diretamente para
  `/sessoes`, sem página intermédia nem conteúdo duplicado.
- Uma verdadeira Agenda do mandato fica deliberadamente adiada para depois da Beta, evitando
  novas entidades, modelos de dados e fluxos nesta fase.

### Implementação concluída

- Agenda foi removida da configuração partilhada pela sidebar e navegação móvel.
- Foram removidas as referências exclusivas da TopBar e da ajuda contextual.
- A antiga página funcional foi substituída por um redirect fino através do padrão
  `LegacyRedirect` já adotado no projeto.
- O componente exclusivo e sem utilização `AgendaCard` foi removido.
- Não foram alterados componentes, hooks, stores, permissões ou utilitários usados por Sessões.
- Testes de contrato confirmam a ausência de Agenda na navegação oficial, o redirect para
  Sessões, a preservação da rota canónica e a inexistência de links internos ativos para a URL
  antiga.

### Testes e validações executados

- `npm test`: 359 testes aprovados, 0 falhas;
- `npm run typecheck`: aprovado;
- `npm run lint`: aprovado com 0 erros e 20 avisos antigos não relacionados;
- `npm run build`: aprovado.

### Justificação da avaliação

A avaliação de 9,4/10 resulta da eliminação da duplicação conceptual e funcional, manutenção
direta da compatibilidade com URLs antigas, preservação integral da área canónica de Sessões,
cobertura focada dos contratos de navegação e aprovação de toda a validação obrigatória sem
erros novos.

### Riscos residuais

- A compatibilidade de `/agenda` depende do redirect client-side partilhado com as restantes
  rotas legadas; query string e hash são preservados pelo helper existente.
- O nome técnico da rota antiga permanece apenas para manter URLs já distribuídos.
- O lint conserva 20 avisos preexistentes fora do âmbito desta missão.

### Trabalho deliberadamente adiado para depois da Beta

Uma verdadeira Agenda do mandato poderá vir a contemplar reuniões, prazos, visitas, eventos,
acompanhamentos, compromissos políticos, tarefas datadas, respostas esperadas e lembretes. Esse
trabalho exigirá desenho próprio e não foi antecipado nesta missão.

---

## ✅ Problema n.º 6 — A Biblioteca exige demasiado trabalho manual de classificação

Estado: FECHADO
Avaliação: 9,3/10
Avaliação da Fase 6A: PENDENTE DE NOVO TESTE MANUAL

### Diagnóstico

A Biblioteca organiza documentos por categorias, estado, assunto e sessão, mas corre o risco de se tornar um arquivo que exige manutenção constante.

### Experiência desejada

O eleito deve conseguir carregar um PDF e receber automaticamente:

- identificação do documento;
- relevância;
- alterações importantes;
- ações exigidas;
- assunto associado;
- sessão associada;
- prazo;
- próxima ação.

### Princípio

O utilizador não deve ter de alimentar a Biblioteca. A Biblioteca deve organizar o trabalho do utilizador.

### Fase 6A corrigida — entrada documental única para PDFs

- “Adicionar e analisar PDF” é a ação principal da Biblioteca.
- A adição manual continua disponível como alternativa secundária para casos excecionais.
- O conflito 2026/3066 foi rastreado à resposta estruturada: o schema anterior verificava apenas
  a forma de quatro dígitos, a normalização preservava o valor e o estado React, o título e o
  payload recebiam-no sem qualquer transformação. O resumo textual era um campo independente.
- Uma função pura distingue `preparar_sessao`, `confirmar_dados_sessao`,
  `guardar_biblioteca` e `confirmar_dados_documento`, com limiar de confiança único de 0,75.
- Convocatórias e ordens de trabalhos suficientemente identificadas preservam o fluxo validado
  de revisão, duplicados, criação ou atualização de Sessão, pontos, onboarding e navegação.
- Convocatórias reconhecidas com órgão, data ou hora incertos permanecem na revisão de Sessão;
  a incerteza exige correção humana, mas não altera o destino institucional reconhecido.
- A data de Sessão tem um contrato civil único `YYYY-MM-DD`; a revisão, o título e a RPC usam o
  mesmo valor, sem parsing de locale ou conversões UTC.
- Datas inexistentes ou com ano superior ao ano atual mais 20 são bloqueadas antes da RPC, sem
  impedir datas históricas válidas.
- Quando a data estruturada é inválida ou implausível, uma resolução conservadora procura apenas
  datas explícitas no resumo e na informação relevante já extraídos. Só corrige quando existe uma
  candidata inequívoca e coerente; a ambiguidade mantém o campo por confirmar e bloqueia a RPC.
- A ordem de trabalhos mantém apenas os pontos principais. Subpontos numerados, como `3.1`, e
  itens iniciados por marcador são agregados na descrição do ponto anterior, com o texto integral.
- Incertezas de órgão, data, hora e local são apresentadas junto do respetivo campo e desaparecem
  após uma correção válida; o local completo permanece editável sem truncamento.
- Designações genéricas de órgão continuam assinaladas como “Confirmação necessária”, não entram
  no título automático e bloqueiam a confirmação até serem substituídas por uma designação exata.
- Descrições de pontos com conteúdo permanecem visíveis e editáveis; textareas vazias ficam
  recolhidas sob a ação secundária “Adicionar descrição”, reduzindo a altura do modal.
- Atas, propostas, regulamentos e restantes documentos reconhecidos são confirmados e organizados
  na Biblioteca sem criar Sessão nem chamar a RPC de confirmação de Sessão.
- Documentos desconhecidos, de baixa confiança, com campos essenciais incertos ou sem dados essenciais ficam
  por rever e permitem corrigir apenas título e tipo documental.
- A confirmação documental atualiza o mesmo Documento e o mesmo PDF já carregados, guarda o resumo
  de compreensão quando existe e abre a rota canónica com origem Biblioteca.
- O mapeamento entre tipos institucionais e tipos persistidos é explícito e testado; tipos sem
  granularidade segura usam `Outro`.
- Não foram criadas tabelas, migrações ou alterações ao schema Supabase.
- As regressões encontradas nos testes manuais foram corrigidas e a repetição do teste da
  convocatória real confirmou o comportamento esperado da Fase 6A.
- Validação automatizada desta correção: 388 testes aprovados, typecheck aprovado, lint com
  0 erros e 20 avisos antigos não relacionados, build aprovado e `git diff --check` aprovado.

### Validação manual da Fase 6A

O checkpoint manual real foi concluído com sucesso: a convocatória preservou o ano correto, os
três pontos principais e respetivos subpontos, destacou os campos incertos, manteve o local
completo, apresentou a revisão compacta e criou a Sessão pela RPC apenas depois da correção
humana. A Fase 6A fica oficialmente validada.

### Fase 6B implementada — impacto prático no mandato

- A mesma análise institucional passou a incluir, sem nova chamada de IA, um bloco opcional
  `impactoMandato` dentro do JSON já guardado em `analiseInstitucional`.
- O bloco distingue relevância alta, média, baixa ou indeterminada, justificação, decisões ou
  alterações importantes, ações exigidas, recomendadas ou informativas e uma única próxima ação.
- Cada conclusão conserva referência documental e confiança; prazos são apenas texto explícito do
  documento, sem cálculo, conversão ou inferência de datas.
- O JSON Schema estrito e o schema Zod validam limites, tipos de ação, confiança e campos nullable.
  A versão da análise institucional passou para 2; análises antigas sem o bloco continuam válidas.
- A revisão de documentos gerais e a página canónica do Documento partilham uma apresentação
  compacta com “Porque importa”, “O que mudou ou foi decidido”, “O que exige atenção” e “Próxima
  ação sugerida”. Secções vazias não aparecem.
- Quando não existe base segura, a interface declara que não foi identificado impacto prático
  seguro, sem inventar ações ou prazos.
- Convocatórias e ordens de trabalhos devolvem `impactoMandato` nulo e mantêm o fluxo da Fase 6A,
  sem alterações à revisão, duplicados, Sessões ou pontos.
- A análise não executa ações, não cria Assuntos, não associa automaticamente Sessões e não cria
  tarefas, notificações, lembretes ou Agenda.
- Não foram criadas tabelas, migrações, novas chamadas à OpenAI ou alterações de RLS.
- Validação automatizada da Fase 6B: 396 testes aprovados, typecheck aprovado, lint com 0 erros e
  20 avisos antigos não relacionados, build aprovado e `git diff --check` aprovado.

### Fecho do Problema n.º 6

O checkpoint manual das Fases 6A e 6B foi validado, incluindo documentos gerais reais com impacto
alto, impacto indeterminado, ação explícita e prazo explícito. O problema fica fechado em 9,3/10:
a Biblioteca recebe e organiza PDFs com intervenção humana apenas onde a incerteza o exige, sem
novas chamadas à IA, sem migração e sem executar automaticamente conclusões políticas.

---

## ✅ Problema n.º 7 — Sistema de estados documental confuso

Estado: FECHADO
Avaliação: 9,2/10

### Diagnóstico final

O campo `Documento.estado` misturava tratamento humano, prioridade e retenção. Marcar um
documento como Importante ou Arquivado apagava a informação sobre estar Por rever ou Revisto. Em
paralelo, algumas superfícies chamavam “Analisado” à revisão humana e a confirmação da análise
automática marcava o documento como Revisto sem prova de uma revisão humana.

### Arquitetura implementada

- `EstadoDocumento` representa exclusivamente tratamento humano: `Por rever` ou `Revisto`.
- `Documento.importante` é uma propriedade booleana explícita, independente da relevância
  inferida em `impactoMandato.relevancia`.
- `Documento.archivedAt` é a única dimensão de arquivo e preserva tratamento e importância.
- `estadoAnalise` permanece separado e automático; confirmar uma extração ou análise da IA não
  marca o documento como Revisto.
- Novos documentos começam Por rever, ativos e não importantes.
- `src/lib/documentos-state.ts` centraliza normalização, transições, elegibilidade para Hoje e
  o codec temporário de importância.

### Persistência e compatibilidade

Não foi criada migration nem alterado o schema Supabase. `estado` remoto guarda apenas o
tratamento (`por_tratar` ou `analisado`), `archived_at` guarda o arquivo e a importância usa o
marcador reservado `__tribuno:documento-importante:v1` no array `tags`. Este marcador tem contrato
dedicado, isolado e testado, é retirado das tags de domínio na leitura e está explicitamente marcado
como solução temporária para a Beta.

Dados remotos antigos são normalizados conservadoramente:

- `por_tratar` → Por rever, normal, ativo;
- `em_analise` → Por rever, normal, ativo;
- `analisado` → Revisto, normal, ativo;
- `importante` → Por rever, importante, ativo;
- `arquivado` → Por rever, normal, arquivado.

Valores locais antigos `Importante` e `Arquivado` são igualmente normalizados sem impedir a
abertura do documento. O codec remoto preserva simultaneamente revisão, importância, arquivo e
estado da análise numa ida e volta.

### Interface e comportamentos alterados

- A Biblioteca usa Por rever e Revisto e mostra Importante como sinal independente; Arquivado
  substitui o sinal de tratamento apenas na lista compacta para evitar badges redundantes.
- A página canónica do Documento apresenta tratamento, importância, arquivo e estado da análise,
  com ações reversíveis separadas para rever, importância, arquivar e restaurar.
- Os formulários manuais deixaram de pedir um estado inicial misturado.
- A preparação de Sessão passou a usar a linguagem Por rever/Revisto para a ação humana.
- A página Hoje considera documentos Por rever ou importantes, incluindo Revisto + Importante,
  exclui arquivados e preserva a deduplicação do motor `decideToday`.
- O ciclo de `DocumentoCriado`, a Biblioteca Inteligente, preview/download, relações e isolamento
  por utilizador não foram redesenhados.

### Ficheiros principais

- domínio e codec: `src/lib/types.ts`, `src/lib/documentos-state.ts`;
- persistência local/remota: `src/lib/documentos-repository.ts`, `src/lib/documentos-store.ts`;
- IA e preparação: `src/lib/institutional-document-flow.ts`, `src/lib/session-flow.ts`,
  `src/components/preparacao/PreparationGuidancePanel.tsx`;
- Biblioteca e formulários: `src/routes/_app.biblioteca.tsx`, `src/lib/biblioteca-ux.ts`,
  `src/components/biblioteca/AdicionarBibliotecaWizard.tsx`,
  `src/components/documentos/DocumentoForm.tsx`;
- detalhe e listas: `src/components/documentos/DocumentoRecebidoDetalhe.tsx`,
  `src/components/documentos/DocumentoCard.tsx`, `src/components/documentos/DocumentoEstadoBadge.tsx`;
- Hoje: `src/components/dashboard/DashboardPage.tsx`.

### Testes e validação

Foram adicionados contratos para transições independentes, arquivo/restauro, IA sem revisão
humana implícita, cinco valores remotos antigos, ida e volta local/remota, formulários sem seletor
misturado, badges e ações independentes e integração com Hoje. A suite de regressão preserva
análise de PDFs, convocatória → Sessão, Biblioteca Inteligente, rota canónica, preview/download,
relações e isolamento por utilizador.

- `npm test`: 406 testes aprovados, 0 falhas;
- `npm run typecheck`: aprovado;
- `npm run lint`: aprovado com 0 erros e 20 avisos antigos não relacionados;
- `npm run build`: aprovado;
- `git diff --check`: aprovado.

### Riscos residuais

- A importância remota depende temporariamente de um marcador reservado em `tags` até uma futura
  migration poder criar uma coluna dedicada; o isolamento e os testes evitam exposição ou colisão
  com tags normais.
- O modelo legado de Inbox conserva o seu estado interno para compatibilidade de associações, mas
  deixou de ser autoridade visual sobre o estado canónico do Documento.
- Os 20 avisos de lint preexistentes permanecem fora do âmbito desta missão.

### Justificação da avaliação

A avaliação de 9,2/10 resulta da separação integral das quatro dimensões, compatibilidade
conservadora, ausência de migration durante a Beta, interface coerente, decisão de Hoje corrigida e
validação automatizada integral. Não atinge uma nota superior porque a representação remota da
importância continua temporariamente dependente do codec reservado em `tags`.

---

## ⏳ Problema n.º 8 — O progresso da preparação pode transmitir falsa segurança

Estado: PENDENTE

### Diagnóstico

Uma percentagem pode indicar completude no sistema sem provar que uma sessão está realmente bem preparada.

### Dimensões que devem ser distinguidas

- completude administrativa;
- validação factual;
- validação jurídica;
- preparação política;
- decisão final do eleito.

### Risco

Uma sessão marcada como 85% ou 100% preparada pode continuar mal preparada política, factual ou juridicamente.

---

## ✅ Problema n.º 9 — Vestígios claros de protótipo

Estado: FECHADO
Avaliação: 9,6/10
Commit: `05140c93c3ab0ea3997d062f43694cb6134eccb6`

### Implementação concluída

- O pacote principal foi renomeado para `tribuno`.
- A dependência `@lovable.dev/vite-tanstack-config` foi removida.
- A configuração Vite, TanStack Start e Nitro passou a ser nativa.
- Os utilitários de datas foram centralizados em `civil-date.ts`.
- `mock-data.ts` e `mock-preparacao.ts` foram removidos.
- Os vestígios técnicos de Lovable foram removidos sem impacto funcional.
- Foi adicionado um teste contratual específico.
- As referências históricas e a pasta `.lovable` foram preservadas apenas onde não têm impacto no runtime.

### Testes e validações executados

- `npm test`: 429 testes aprovados, 0 falhas;
- `npm run typecheck`: aprovado;
- `npm run lint`: aprovado;
- `npm run build`: aprovado;
- `git diff --check`: aprovado.

---

## ✅ Problema n.º 10 — Persistência local como fallback silencioso

Estado: FECHADO
Avaliação: 9,5/10

### Diagnóstico confirmado

A resolução do provider convertia a ausência de configuração remota em modo `local`, considerava
esse modo configurado e fazia `usarPersistenciaLocal()` aceitar qualquer estado não remoto. A
aplicação apresentava apenas um aviso e as fronteiras locais continuavam disponíveis para escritas
institucionais, permitindo sucesso aparente apenas no navegador.

### Decisão arquitetural

- A seleção do provider é uma decisão pura, tipada e centralizada.
- Em produção, só uma configuração Supabase completa pode tornar a Beta operacional; a deteção
  automática de Supabase completo foi preservada para compatibilidade com o deploy atual.
- Provider ausente sem Supabase, provider inválido, Supabase incompleto, `local` explícito em
  produção e Firestore não implementado resultam num estado não configurado, sem fallback local.
- Em desenvolvimento e testes, o modo local permanece disponível e isolado por utilizador.
- Caches locais posteriores a confirmação remota continuam permitidas; não são tratadas como fonte
  institucional autónoma.

### Implementação concluída

- `StorageProviderName` passou a incluir `unconfigured`, com estado explícito para configuração,
  permissão local, mensagem institucional e detalhe técnico opcional.
- `usarPersistenciaLocal()` só aceita agora o provider `local` quando este está efetivamente
  permitido e configurado.
- Foi criada uma fronteira de escrita institucional que lança `StorageConfigurationError` antes de
  tocar em `localStorage` quando o armazenamento seguro está indisponível.
- Todas as stores por utilizador, o perfil e o onboarding usam essa fronteira; ficam assim cobertos
  Sessões, Assuntos, Documentos, Biblioteca, preparação, pontos, relações, notas, estratégia,
  histórico e tentativas de criação.
- A autenticação e a hidratação local mantêm o helper genérico, por serem cache de sessão e não uma
  alternativa silenciosa à persistência institucional.
- O layout protegido deixa de apresentar a aplicação como operacional e mostra uma mensagem clara
  quando o armazenamento seguro não está configurado.
- A regra de produção fica documentada como `VITE_TRIBUNO_STORAGE_PROVIDER=supabase`; não existia
  um ficheiro de exemplo de ambiente versionado e nenhum ficheiro real ou segredo foi alterado.
- Foi acrescentada uma compatibilidade mínima de tipos no `vite.config.ts` para a versão instalada
  do Vite 8.1, sem alterar a configuração ou o runtime.

### Testes e validações executados

- `npm test`: 440 testes aprovados, 0 falhas;
- `npm run typecheck`: aprovado;
- `npm run lint`: aprovado com 0 erros e 22 avisos preexistentes não relacionados;
- `npm run build`: aprovado;
- `git diff --check`: aprovado.

Os 11 novos testes contratuais cobrem produção sem provider, Supabase e Firestore incompletos,
Firestore ainda não implementado, provider inválido, `local` explícito em produção, modo local em
desenvolvimento e testes, coerência da mensagem, bloqueio real da escrita e isolamento entre
utilizadores.

### Riscos residuais

- `localStorage` continua a servir caches institucionais depois de confirmação remota e a hidratação
  da autenticação; a segurança depende da fronteira central permanecer obrigatória para novas stores.
- Firestore permanece reconhecido apenas para devolver um erro de configuração claro; não é um
  provider implementado nesta Beta.
- Não foi criada migração ou sincronização automática de dados locais antigos, conforme definido
  fora do escopo.
- Os 22 avisos de lint preexistentes permanecem fora do âmbito desta missão.

### Justificação da avaliação

A avaliação de 9,5/10 resulta da eliminação do fallback implícito em produção, bloqueio central de
escritas institucionais, erro visível, preservação de desenvolvimento, testes, SSR e caches remotas,
e validação integral. Não atinge nota superior por continuarem a existir caches locais e porque uma
nova store terá de usar deliberadamente a fronteira institucional.

---

## ⏳ Problema n.º 11 — Falta um verdadeiro sistema de acompanhamento político

Estado: PENDENTE

### Diagnóstico

O Tribuno está mais forte antes da sessão do que depois da sessão.

### Fluxo de acompanhamento necessário

Após entregar uma iniciativa, acompanhar:

- quando foi entregue;
- a quem;
- prazo de resposta;
- existência de resposta;
- qualidade da resposta;
- necessidade de insistência;
- necessidade de regressar à sessão;
- necessidade de comunicação pública;
- estado de resolução;
- responsável.

### Princípio

Produzir ação não chega. O Tribuno deve ajudar a garantir consequência.

---

## ⏳ Problema n.º 12 — Falta provar que a IA reduz realmente trabalho

Estado: PENDENTE

### Critério de valor

A IA deve produzir documentos que:

- compreendam o órgão;
- respeitem competências;
- usem os factos fornecidos;
- identifiquem lacunas;
- distingam facto de interpretação;
- citem base legal;
- não inventem;
- tenham tom institucional;
- exijam alterações mínimas.

### Risco

O Tribuno pode tornar-se mais lento do que Word mais ChatGPT para utilizadores experientes, caso o processo exija demasiada correção e revisão.

### Necessidade

Validar qualidade documental com testes objetivos antes de concluir que o valor está provado.

---

## ⏳ Problema n.º 13 — O assistente de ajuda pode estar a compensar complexidade

Estado: PENDENTE

### Diagnóstico

O assistente recebe contexto detalhado de cada página:

- estado vazio;
- ação principal;
- situação atual;
- próximo passo;
- alertas;
- factos de resumo.

### Questão central

Se cada página precisa de um assistente para explicar o próximo passo, a própria interface está suficientemente clara?

### Princípio

O assistente deve ser uma vantagem adicional, nunca uma bengala da interface.

---

## ⏳ Problema n.º 14 — Duplicação aumenta o custo de cada correção futura

Estado: PENDENTE

### Diagnóstico

Existem ou existiram estruturas paralelas completas para Sessões e Assembleias:

- preparação;
- pontos;
- estratégia;
- documentos;
- documentos a criar;
- detalhe de rascunho.

### Custos

- mais testes;
- mais regressões;
- mais caminhos para o mesmo comportamento;
- dificuldade em identificar o fluxo canónico;
- maior consumo de créditos Codex;
- risco de corrigir um lado e esquecer o outro.

### Objetivo futuro

Eliminar definitivamente modelos antigos, em vez de apenas os esconder.

---

# Próxima ação

Resolver o Problema n.º 8 — o progresso da preparação pode transmitir falsa segurança — numa missão
futura e fechada.

Não iniciar automaticamente outro problema após o fecho do Problema n.º 10.

---

# Instruções para novos chats

Ao iniciar um novo chat sobre o Tribuno:

1. Carregar o repositório:
   https://github.com/bcpragana-chega/gabinete-digital-do-eleito

2. Ler primeiro:
   docs/PROJECT_STATE.md

3. Respeitar o estado registado neste documento.

4. Não reabrir problemas fechados sem pedido explícito.

5. Continuar a partir do problema indicado na secção Próxima ação.
