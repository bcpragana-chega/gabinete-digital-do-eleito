# Tribuno — Estado Oficial do Projeto

> Este ficheiro é a fonte oficial de verdade sobre o estado do Tribuno.
> Deve ser consultado no início de cada novo chat, missão Codex ou ciclo de desenvolvimento.

Última atualização: 20 de julho de 2026

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

## ✅ Problema n.º 8 — O progresso da preparação pode transmitir falsa segurança

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

## ✅ Problema n.º 11 — Acompanhamento político contínuo

Estado: FECHADO (9,5/10)

### Problema resolvido

O fluxo político do Tribuno deixou de terminar com a apresentação de um documento.

Cada Assunto pode agora preservar uma cronologia contínua de acontecimentos políticos, incluindo:

- entrega;
- resposta recebida;
- insistência;
- regresso à sessão;
- comunicação pública;
- resolução;
- encerramento sem resolução;
- notas.

### Continuidade do acompanhamento

O acompanhamento não fica bloqueado após resolução ou encerramento.

É sempre possível registar um novo acontecimento, preservando integralmente o histórico anterior e recalculando o estado atual.

Uma nota isolada não reabre um acompanhamento terminal.

### Edição limitada

É possível corrigir apenas:

- descrição;
- destinatário;
- prazo;
- próxima ação;
- documento associado.

Permanecem imutáveis:

- tipo;
- data;
- estado estrutural;
- Assunto;
- utilizador;
- created_at.

### Integração com Hoje

A página Hoje reage ao estado atual do acompanhamento.

Acompanhamentos resolvidos ou encerrados deixam de aparecer enquanto o estado terminal for o mais recente.

Quando um novo acontecimento reabre o ciclo político, os sinais relevantes voltam a surgir em Hoje.

### Segurança e persistência

- persistência real no Supabase;
- confirmação da linha atualizada antes de alterar a cache;
- RLS e isolamento por utilizador;
- nenhuma alteração destrutiva à migration aplicada;
- cronologia anterior preservada.

### Validação

- migration aplicada no Supabase;
- reabertura após resolução validada manualmente;
- edição limitada validada manualmente;
- persistência após atualização da página validada;
- integração com Hoje validada;
- 469 testes aprovados;
- typecheck aprovado;
- lint sem erros novos;
- build aprovado;
- git diff --check aprovado.

### Commit principal

`6726bdb` — `feat: implementar acompanhamento político contínuo`

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

## ✅ Problema n.º 13 — O assistente de ajuda pode estar a compensar complexidade

Estado: FECHADO
Avaliação: 9,5/10

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

### Implementação concluída

- As páginas principais são compreensíveis sem abrir a Ajuda e mantêm visíveis as respetivas ações,
  estados e orientações estruturais.
- No detalhe do Assunto, o bloco determinístico passou de “Assistente” para “Estado e próxima ação”,
  com “Situação atual” e uma descrição direta do resumo apresentado.
- Na preparação de Sessão, “Assistente de preparação” passou a “Preparação da sessão”, deixando
  claro que o painel pertence à interface central de preparação.
- A Ajuda global mantém o título “Assistente Tribuno”, mas a descrição, mensagem inicial e três
  sugestões posicionam-na como apoio opcional para esclarecer dúvidas e encontrar funcionalidades.
- Nenhuma lógica funcional foi alterada: estado e recomendações do Assunto, cálculo do fluxo de
  Sessão, prontidão, checklist, ações, persistência, autenticação, contexto da página, retry e limite
  de mensagens foram preservados.

### Testes e validação

Foram adicionados contratos de interface para a nova nomenclatura do detalhe do Assunto e da
preparação de Sessão, para o posicionamento opcional da Ajuda e para a existência de exatamente três
sugestões iniciais. Os contratos existentes continuam a cobrir envio, autenticação, retry, contexto
seguro da página e histórico limitado às oito mensagens mais recentes.

- `npm test`: 510 testes aprovados, 0 falhas; o sandbox emitiu um aviso não bloqueante ao impedir a
  abertura da porta WebSocket 24678 do Vite;
- `npm run typecheck`: aprovado;
- `npm run lint`: aprovado com 0 erros e 22 avisos preexistentes fora do âmbito;
- `npm run build`: aprovado;
- `git diff --check`: aprovado.

### Commit principal

Não criado nesta missão, por falta de autorização explícita para fazer commit.

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

### Missão 14.A concluída — remoção exclusiva de código morto de UI

O inventário de `docs/PROBLEMA_14_INVENTARIO.md` confirmou uma ilha de componentes sem imports de
produção, testes ativos, barrels consumidos, rotas, lazy imports, imports dinâmicos ou referências
por nome em testes de composição. Foram removidos exclusivamente:

- `src/components/cards/AssembleiaCard.tsx`;
- `src/components/preparacao/AcaoCard.tsx`;
- `src/components/preparacao/AdicionarAcaoDialog.tsx`;
- `src/components/preparacao/AdicionarPrioridadeDialog.tsx`;
- `src/components/preparacao/AdicionarPerguntaDialog.tsx`;
- `src/components/preparacao/DocumentoACriarCard.tsx`;
- `src/components/preparacao/PerguntaCard.tsx`;
- `src/components/preparacao/PrioridadeCard.tsx`;
- `src/components/preparacao/SecaoPreparacao.tsx`;
- `src/components/preparacao/badges.tsx`.

Não foi necessário ajustar barrels. `AdicionarItemPreparacao.tsx` permanece ativo e preservado.
Não foram alterados comportamento, nomenclatura ativa, rotas, compatibilidade, stores, tipos,
localStorage, repositories ou Supabase.

### Validações da Missão 14.A

- pesquisa global antes e depois da remoção: sem consumidores executáveis; permanecem apenas
  referências históricas em `TECHNICAL_AUDIT.md`;
- `npm test`: 510 testes aprovados, 0 falhas; o sandbox emitiu o aviso não bloqueante já conhecido
  ao impedir a abertura da porta WebSocket 24678 do Vite;
- `npm run typecheck`: aprovado;
- `npm run lint`: aprovado com 0 erros e 22 avisos preexistentes fora do âmbito;
- `npm run build`: aprovado;
- `git diff --check`: aprovado.

O Problema n.º 14 continua **PENDENTE**. A Missão 14.A removeu apenas código morto de UI; não
resolveu ainda as APIs mortas, nomes técnicos antigos nem contratos de persistência inventariados.

---

## ✅ Missão transversal — Fundação da experiência mobile

Estado: CONCLUÍDA

### Decisão de produto

- Desktop continua orientado a criar, editar, preparar e produzir em profundidade.
- Mobile passa a funcionar como assistente de bolso para consultar, acompanhar, decidir e executar
  pequenas ações.
- Hoje, Assuntos, Sessões e Biblioteca são os quatro destinos permanentes e canónicos no mobile.
- Pesquisa, criação, definições e perfil, ajuda e logout são funções secundárias e não repetem a
  navegação principal.
- O breakpoint comum do shell é 768 px: abaixo deste valor usa-se o shell mobile; a partir dele
  preservam-se sidebar e TopBar desktop.

### Diagnóstico anterior

A aplicação já tinha componentes responsivos, Sheet, pesquisa global, criação rápida e uma sidebar
desktop funcional. No entanto, o mobile dependia de um Sheet que reproduzia a sidebar, não tinha
navegação persistente própria, empilhava ações abaixo da TopBar e não reservava espaço no shell para
uma barra inferior. As páginas principais usavam ainda um offset sticky de 96 px, necessário apenas
por causa desse cabeçalho móvel de duas linhas.

### Implementação realizada

- Criada uma barra inferior fixa, exclusiva de mobile, com exatamente os quatro destinos oficiais,
  ícone, label, `aria-current`, foco visível, alvo tátil mínimo e safe-area do iOS.
- Centralizado o breakpoint mobile e o cálculo da área ativa. Detalhes de Assunto e Sessão mantêm a
  respetiva área; Documento usa Biblioteca por defeito e aceita a origem canónica coerente de
  Assunto ou Sessão.
- O shell autenticado reserva 64 px mais a safe-area inferior em mobile e mantém integralmente as
  margens, moldura e sidebar desktop a partir de 768 px.
- A TopBar mobile passou a uma única linha de 56 px: voltar quando existe pai útil, menu quando não
  existe, título curto truncado e, quando aplicável, um único acesso a ações contextuais num Sheet
  “Mais ações”. Breadcrumbs, descrições longas, pesquisa e avatar ficam no comportamento desktop.
- Criado um menu secundário lateral com 88% da largura, Pesquisa, Criar novo, Definições e perfil,
  Ajuda e Terminar sessão. O menu fecha antes de pesquisa, criação ou navegação e não repete
  Hoje, Assuntos, Sessões ou Biblioteca.
- Reutilizados `GlobalSearchProvider`, `GlobalSearchTrigger`, `QuickCreateMenu`,
  `NovoAssuntoWizard`, `HelpAssistantPanel`, `LogoutConfirmDialog` e os componentes Sheet atuais.
- Ajustados para 56 px os offsets sticky mobile das listas de Assuntos, Sessões e Biblioteca.
- Não foram alteradas rotas, Supabase, modelos de dados, autenticação ou lógica dos fluxos Beta.

### Validações executadas

- `npm test`: 529 testes aprovados, 0 falhas; mantém-se o aviso não bloqueante conhecido do sandbox
  ao impedir a abertura da porta WebSocket 24678 do Vite;
- `npm run typecheck`: aprovado;
- `npm run lint`: aprovado com 0 erros e 22 avisos preexistentes fora do âmbito;
- `npm run build`: aprovado;
- `git diff --check`: aprovado.

Os contratos cobrem o breakpoint, os quatro destinos exatos, visibilidade exclusiva mobile, estado
ativo em índices e detalhes, origem documental, regresso contextual, preservação da sidebar e dos
utilitários desktop, funções do menu secundário, ausência de destinos duplicados, safe-area, áreas
táteis e reserva de espaço no shell. A estrutura foi verificada para 320, 375, 390, 430, 768, 1024
px e desktop habitual através dos mesmos contratos CSS responsivos; não foi produzido screenshot
de browser nesta execução.

### Riscos residuais

- A origem visual de um Documento na barra inferior é inferida dos search params canónicos; a
  validação relacional completa continua, corretamente, no detalhe do Documento.
- O conteúdo interno das quatro áreas conserva o desenho atual e poderá ainda precisar de uma
  missão móvel própria, sobretudo em tabelas densas, editores e fluxos longos.
- A validação visual em dispositivos físicos, incluindo teclado virtual e diferentes safe-areas de
  iPhone, continua recomendada antes de distribuição alargada da Beta.

### Próxima missão recomendada

Validar e adaptar apenas a página Hoje como experiência móvel de consulta e decisão, usando esta
fundação, sem redesenhar ainda Assuntos, Sessões ou Biblioteca e sem iniciar trabalho adicional do
Problema n.º 14.

---

## ✅ Missão mobile — Adaptar exclusivamente a página Hoje

Estado: CONCLUÍDA

### Decisão mobile

No mobile, Hoje responde diretamente a “O que tenho de fazer agora?” através de uma sequência única:

1. uma frase curta de contexto atual;
2. uma única ação principal;
3. até dois alertas reais, apenas quando existem;
4. até três pendências secundárias, apenas quando existem;
5. estado tranquilo exclusivo quando não existe trabalho relevante.

O motor `decideToday` continua a ser a única fonte de decisão. Não foram introduzidas regras de
urgência, prioridades, métricas ou dados derivados adicionais.

### Diagnóstico anterior

A página já tinha uma ação principal correta e limites determinísticos para alertas e pendências,
mas a mesma composição era apresentada em todas as larguras. No mobile, Próxima sessão, Assuntos
pendentes e Documentos recentes competiam com a resposta principal e prolongavam a página com
módulos úteis no desktop, mas secundários num assistente de bolso.

### Implementação realizada

- Inserida uma única frase curta de contexto antes da ação, exclusiva de mobile e baseada apenas no
  contexto ou estado já devolvido pela decisão.
- A ação principal passou a usar toda a largura disponível no mobile, com título, explicação,
  contexto essencial e controlos com pelo menos 44 px de altura.
- O estado crítico é identificado pelo texto “Ação prioritária”, estrutura e marcador lateral, sem
  depender apenas da cor nem recorrer a vermelho excessivo.
- O contexto da ação permanece dentro do cartão no desktop e aparece antes do cartão no mobile,
  evitando repetição.
- Alertas e pendências mantêm os dados e destinos existentes, mas usam linhas compactas, divisores
  subtis, foco visível, headings associados e alvos táteis adequados.
- O onboarding permanece dentro da única ação principal. Novo Assunto, análise documental,
  carregamento de convocatória e criação manual de Sessão continuam a reutilizar exatamente os
  fluxos existentes; os botões empilham sem scroll lateral no mobile.
- O estado `clear` apresenta exclusivamente “Não tens nada urgente neste momento”, “O mandato está
  em dia” e a consulta discreta de Assuntos já existente.
- Próxima sessão, Assuntos pendentes e Documentos recentes ficam ocultos abaixo de 768 px e mantêm a
  composição anterior a partir do breakpoint desktop.
- O contentor da página bloqueia overflow horizontal e continua protegido pelo espaço inferior e
  safe-area definidos no shell mobile.
- Não foram alterados `decideToday`, rotas, contratos de dados, Supabase, autenticação, Ajuda,
  pesquisa, navegação, preparação de Sessão ou fluxos documentais.

### Comportamento dos quatro estados

- `onboarding`: o onboarding é a ação principal e apresenta apenas as escolhas funcionais atuais.
- `active`: mostra contexto curto, ação recomendada e apenas alertas ou pendências realmente
  devolvidos pelo motor.
- `critical`: mantém a mesma prioridade do motor e acrescenta identificação textual e visual calma.
- `clear`: não mostra ação, alertas, pendências ou trabalho artificial; apresenta apenas o estado em
  dia e a consulta discreta de Assuntos.

### Testes e validações

- `npm test`: 536 testes aprovados, 0 falhas; o sandbox mantém o aviso não bloqueante conhecido ao
  impedir a abertura da porta WebSocket 24678 do Vite;
- `npm run typecheck`: aprovado;
- `npm run lint`: aprovado com 0 erros e 22 avisos preexistentes fora do âmbito;
- `npm run build`: aprovado;
- `git diff --check`: aprovado.

Os novos contratos provam a existência de uma única ação principal, renderização condicional e
limites de alertas e pendências, exclusividade de `clear`, ausência de duplicação no onboarding,
destinos existentes, preservação do motor, módulos desktop, ausência de conteúdo concorrente e de
scroll horizontal no mobile e reserva inferior da navegação.

A composição foi validada estruturalmente para 320, 375, 390 e 430 px, para a transição em 768 px,
e para 1024 px e desktop habitual. Foram cobertos títulos longos, criticidade, os dois onboardings,
estado tranquilo, dois alertas e três pendências. Não foi produzido screenshot de browser nesta
execução.

### Riscos residuais

- Continua recomendada uma passagem em dispositivos físicos para confirmar altura inicial da ação
  em ecrãs pequenos, teclado virtual e diferentes safe-areas.
- O desktop mantém os módulos informativos anteriores; futuras alterações móveis não devem remover
  essa composição sem uma decisão de produto própria.
- Assuntos, Sessões e Biblioteca continuam com o conteúdo mobile atual e não foram redesenhados.

### Próxima missão recomendada

Adaptar exclusivamente a lista de Assuntos à consulta mobile, tornando estado, próximo passo e
destino rapidamente percorríveis, sem alterar o detalhe, o motor de próxima ação, os dados ou o
desktop.

---

## ✅ Missão mobile — Adaptar exclusivamente a lista de Assuntos

Estado: CONCLUÍDA

### Decisão mobile

No mobile, cada Assunto passa a ser uma linha compacta de duas alturas de informação:

1. título e prioridade discreta;
2. estado, última atualização e próxima ação, quando existe.

A linha completa continua a abrir diretamente o mesmo detalhe canónico. A lista não introduz
ações, menus, gestos, regras ou destinos alternativos.

### Diagnóstico anterior

A rota já concentrava corretamente filtros, ordenação, contagens, cálculo da próxima ação e
navegação. A lista mobile reutilizava, porém, uma grelha próxima da tabela desktop: não apresentava
prioridade nem atualização e concedia demasiado espaço vertical à próxima ação. Os filtros eram
botões numa faixa horizontal, o que tornava a consulta menos previsível nos ecrãs mais estreitos.
A pesquisa já existia no shell mobile através do menu secundário e não precisava de implementação
paralela na página.

### Implementação realizada

- Cada Assunto usa no mobile um bloco de duas linhas, com título truncado e badge pequena de
  prioridade na primeira, seguido de estado, data abreviada e próxima ação truncada na segunda.
- A próxima ação deixa de ocupar espaço quando o resultado existente é “Sem ação definida”.
- Mantidos integralmente os mesmos cálculos de estado, prioridade, atualização e próxima ação.
- Os cinco filtros e as quatro ordenações existentes passam a dois seletores compactos abaixo de
  768 px, preservando valores, contagens e handlers.
- A pesquisa global continua acessível no menu secundário mobile, sem duplicação local.
- O contentor da lista usa divisores subtis, bloqueia overflow horizontal e mantém truncation em
  títulos e metadata longa.
- A partir de 768 px permanecem os botões de filtro e a mesma tabela, com as colunas Assunto,
  Estado, Prioridade, Próxima ação e Atualizado nos breakpoints anteriores.
- O `Link` canónico para `/assuntos/$dossieId`, o detalhe do Assunto, as rotas, os stores, Supabase,
  pesquisa, filtros, ordenação e regras de negócio não foram alterados.

### Composição final

- Mobile, linha 1: título e prioridade.
- Mobile, linha 2: estado, atualização curta e próxima ação disponível.
- Desktop: tabela e controlos anteriores, sem mudança de conteúdo ou interação.
- Estados vazios e criação de Assunto permanecem inalterados.

### Testes e validações

- `npm test`: 543 testes aprovados, 0 falhas; o sandbox mantém o aviso não bloqueante conhecido ao
  impedir a abertura da porta WebSocket 24678 do Vite;
- `npm run typecheck`: aprovado;
- `npm run lint`: aprovado com 0 erros e 22 avisos preexistentes fora do âmbito;
- `npm run build`: aprovado;
- `git diff --check`: aprovado.

Os 7 novos contratos provam a abertura do mesmo detalhe, preservação dos cinco filtros e quatro
ordenações, acesso à pesquisa global, composição mobile em duas linhas, apresentação de estado,
prioridade e atualização pelas regras existentes, filtros compactos sem faixa horizontal e
preservação da tabela e controlos desktop a partir de 768 px.

A responsividade foi validada estruturalmente para 320, 375, 390 e 430 px, para a transição em 768
px e para desktop. Os limites de largura, `min-width: 0`, truncation e bloqueio de overflow cobrem
títulos, estados e próximas ações longas. Não foi produzido screenshot de browser nesta execução.

### Riscos residuais

- Continua recomendada uma passagem em dispositivos físicos para confirmar densidade, legibilidade
  e comportamento dos seletores com fontes ampliadas.
- A próxima ação e títulos extensos são deliberadamente truncados na lista; o conteúdo integral
  continua disponível no detalhe, como previsto.
- O detalhe do Assunto mantém a experiência atual e deve ser tratado apenas numa missão própria.

### Próxima missão recomendada

Adaptar exclusivamente a lista de Sessões à consulta mobile, preservando o detalhe, preparação,
regras, ordenação, filtros, dados e experiência desktop.

---

## ✅ Correção P0 — Terminação determinística da hidratação de autenticação

Estado: CONCLUÍDA

### Causa confirmada

O `useAuth` instalava o `onAuthStateChange` ao mesmo tempo que iniciava a primeira hidratação. Todos
os eventos usavam um coordenador com `pendente` e um ciclo `do/while`: um evento recebido durante
cada passagem voltava a marcar trabalho pendente, permitindo uma sequência sem condição terminal.
Embora as escritas internas já evitassem emitir `tribuno:auth`, eventos Supabase redundantes podiam
manter o coordenador ativo e impedir a rota protegida de sair de “A preparar o Tribuno...”.

### Mecanismo adotado

- A hidratação inicial passou a single-flight e todas as chamadas concorrentes partilham a mesma
  promessa.
- Eventos externos durante o arranque são reduzidos a uma única releitura posterior; eventos
  recebidos durante essa releitura não criam outra passagem.
- O listener Supabase só é instalado após a hidratação inicial e eventual releitura terem terminado.
- `INITIAL_SESSION`, `TOKEN_REFRESHED`, logins e logouts repetidos e `USER_UPDATED` idênticos são
  ignorados; login, logout, troca de conta e atualização real do utilizador continuam ativos.
- `initialized` e `onboardingResolved` começam falsos apenas na criação do hook e deixam de ser
  repostos a falso por atualizações posteriores.
- Sucesso, erro ou timeout continuam a terminar no `finally` com ambos os estados resolvidos.
- `tribuno:auth` e `storage` permanecem ativos desde o arranque, preservando login, logout, perfil,
  onboarding, sincronização entre abas e o botão “Tentar novamente”, sem listeners adicionais.
- Não foram alterados login Google, modelo de perfil, onboarding, Supabase, rotas ou shell mobile.

### Testes e validações

- `npm test`: 553 testes aprovados, 0 falhas; mantém-se o aviso não bloqueante do sandbox relativo à
  porta WebSocket 24678 do Vite;
- `npm run typecheck`: aprovado;
- `npm run lint`: aprovado com 0 erros e 22 avisos preexistentes fora do âmbito;
- `npm run build`: aprovado;
- `git diff --check`: aprovado.

Os contratos cobrem single-flight, limite de uma releitura perante 50 eventos concorrentes,
coalescência após o arranque, eventos Supabase redundantes, login, logout, troca de conta, gravação
de perfil, conclusão de onboarding, timeouts, falhas de perfil e onboarding, estados finais,
estabilidade do failsafe e retry sem duplicação de listeners.

### Riscos residuais

- A correção foi validada por contratos determinísticos e build; continua recomendada uma passagem
  no ambiente Supabase real com restauro de sessão, login e logout em duas abas.
- Eventos Supabase desconhecidos são ignorados por defeito. Os eventos relevantes atuais continuam
  explicitamente tratados e as mutações da aplicação emitem `tribuno:auth`.

---

## ✅ Missão mobile — Adaptar exclusivamente a lista de Sessões

Estado: CONCLUÍDA

### Diagnóstico anterior

A rota canónica já preservava corretamente a ordem recebida de `listarAssembleias` (data e hora
descendentes), os quatro filtros de estado, a criação, o estado vazio e a abertura integral da linha
para `/sessoes/$id`. No mobile, porém, a data aparecia sob o título, órgão/local e pontos ficavam
ocultos, a preparação não era identificada e os filtros dependiam de uma faixa com scroll
horizontal. A composição dava a mesma relevância visual a Sessões futuras e passadas.

### Composição mobile final

- Linha 1: data civil curta em pt-PT, com Hoje/Amanhã e hora quando existe, seguida do estado
  existente em badge discreta.
- Linha 2: título truncado e órgão ou território já disponível, sem duplicação.
- Linha 3: estado de preparação quando explicitamente persistido, número de pontos quando existe e
  a ação já existente Preparar/Editar.
- Sessões sem data apresentam “Sem data”; títulos e metadata extensos usam `min-width: 0` e
  truncation, e a página bloqueia overflow horizontal.
- Sessões não passadas recebem apenas uma ênfase visual muito ligeira; a ordem e a classificação
  temporal não foram alteradas.
- O filtro mobile passou a seletor compacto com as mesmas quatro opções e contagens. A pesquisa
  continua no menu secundário global, sem duplicação local.

### Preservação explícita

- Mantiveram-se rota, parâmetros, `Link` de linha inteira, queries, stores, Supabase, estados,
  contagens, filtros, ordenação, cálculo de pontos/documentos, regra Preparar/Editar, criação e
  estado vazio.
- `preparacaoEstado` continua a ser a única origem de “Preparada”/“Em preparação”; não foi criado
  qualquer cálculo de prontidão.
- A partir de 768 px permanecem os botões de filtro, a grelha, as cinco colunas, a densidade, o
  conteúdo e as ações desktop anteriores.
- Não foram alterados detalhe, preparação, pontos, documentos, convocatória, criação/edição,
  autenticação ou navegação inferior.

### Testes e validações

Foram adicionados contratos funcionais para a formatação civil Hoje/Amanhã/data curta, hora
opcional, ausência/invalidade de data e distinção entre data passada e não passada. Os contratos
estruturais cobrem destino canónico, estados, preparação, filtros, ordenação do store, ações,
estado vazio, três linhas compactas, prioridade apenas visual, ausência de scroll horizontal,
títulos extensos, pesquisa global e preservação desktop no breakpoint de 768 px.

A composição foi validada estruturalmente para 320, 375, 390 e 430 px, para a transição em 768 px
e para desktop. `npm test` aprovou 566 testes sem falhas, mantendo apenas o aviso não bloqueante do
sandbox relativo à porta WebSocket 24678 do Vite; `npm run typecheck` foi aprovado; `npm run lint`
foi aprovado com 0 erros e 22 avisos preexistentes fora do âmbito; `npm run build` foi aprovado; e
`git diff --check` foi aprovado. Não foi produzido screenshot de browser nesta execução.

### Riscos residuais

- Continua recomendada uma passagem num dispositivo físico para confirmar densidade com fontes
  ampliadas e safe-areas reais.
- “Sem data” é tolerado na composição mobile, embora a criação normal continue a exigir o contrato
  civil existente.
- A tabela desktop conserva deliberadamente a formatação longa anterior, inclusive para dados
  históricos incompletos.

### Próxima missão recomendada

Adaptar exclusivamente a lista da Biblioteca à consulta mobile, mantendo detalhe, análise,
relações, pesquisa, dados e desktop fora dessa futura alteração.

---

## ✅ Missão mobile — Adaptar exclusivamente a lista da Biblioteca

Estado: CONCLUÍDA

### Diagnóstico anterior

A rota canónica `/biblioteca` já concentrava corretamente a pesquisa local, os sete filtros, a
deduplicação, os estados, as associações a Assunto e Sessão e a ordenação determinística: documentos
por rever primeiro e, dentro de cada grupo, data descendente, título e ID. Cada linha abria o
Documento canónico e conservava a ação opcional de análise de PDF. No mobile, contudo, os filtros
dependiam de uma faixa horizontal e a composição escondia associação e data, enquanto categoria e
tipo competiam entre si numa linha secundária.

### Composição mobile final

- Linha 1: título truncado e tipo documental existente numa badge discreta e imediatamente legível.
- Linha 2: Assunto e/ou Sessão apenas quando existe uma relação já resolvida pela aplicação.
- Linha 3: data civil curta (Hoje, Ontem, `24 jul.` ou Sem data), estado existente e ação
  Abrir/Rever já determinada pela lista.
- A linha integral continua a abrir `/documentos/$documentoId` com origem Biblioteca. A ação
  opcional Analisar documento continua acessível nos PDFs elegíveis sem alterar o respetivo fluxo.
- Títulos e metadata extensos usam `min-width: 0`, truncation e limites de largura; a página bloqueia
  overflow horizontal.
- Os sete filtros passaram a um seletor compacto abaixo de 768 px. A pesquisa local, incluindo
  limpeza, contagem e campos pesquisados, permanece exatamente igual.

### Preservação explícita

- Mantiveram-se `useDocumentos`, `useAssembleias`, `useDossies`, inbox, relações, deduplicação,
  categorias, estados, pesquisa, filtros, contagens, ordenação, ações e estados vazios.
- A data mobile continua a apresentar `documento.data`, a mesma origem usada pela tabela e pela
  ordenação; não foi introduzida uma nova regra baseada em criação ou atualização.
- A partir de 768 px permanecem a faixa original de filtros, a tabela com cinco colunas, grelha,
  densidade, categoria/tipo, associações, data e ações anteriores.
- Não foram alterados detalhe documental, editor, análise ou geração por IA, exportação, upload,
  Supabase, queries, stores, pesquisa global, shell, autenticação ou as restantes áreas mobile.

### Testes e validações

Foram adicionados contratos funcionais para Hoje, Ontem, data curta, ausência/invalidade de data e
timestamp civil. Os contratos estruturais cobrem rota e origem canónicas, sete filtros, pesquisa,
ordenação completa, tipos existentes, relações condicionais, estados, ações, quatro estados vazios,
composição compacta, títulos extensos, ausência de scroll horizontal e preservação desktop no
breakpoint de 768 px.

A composição foi validada estruturalmente para 320, 375, 390 e 430 px, para a transição em 768 px e
para desktop. `npm test` aprovou 578 testes sem falhas, mantendo apenas o aviso não bloqueante do
sandbox relativo à porta WebSocket 24678 do Vite; `npm run typecheck` foi aprovado; `npm run lint`
foi aprovado com 0 erros e 22 avisos preexistentes fora do âmbito; `npm run build` foi aprovado; e
`git diff --check` foi aprovado. Não foi produzido screenshot de browser nesta execução.

### Riscos residuais

- Continua recomendada uma passagem em dispositivos físicos para confirmar a densidade quando a
  ação opcional Analisar documento está presente e quando são usadas fontes ampliadas.
- Documentos com Assunto e Sessão apresentam ambas as relações truncadas numa única linha; os nomes
  completos continuam disponíveis no detalhe.
- A data mostrada conserva deliberadamente o contrato documental anterior, mesmo quando difere de
  `createdAt` ou `updatedAt`.

### Próxima missão recomendada

Auditar e adaptar exclusivamente o detalhe de Assunto à experiência mobile, numa missão própria,
sem misturar o detalhe documental ou a preparação de Sessão.

---

## ✅ Missão mobile — Adaptar exclusivamente o detalhe de Assunto

Estado: CONCLUÍDA

### Diagnóstico anterior

A rota canónica `/assuntos/$dossieId` já reutilizava corretamente `useDossie`, o motor de estado UX,
as notas, a cronologia, os documentos criados e recebidos, as relações com Sessões e todas as ações
de edição, arquivo e acompanhamento. No mobile, porém, a ordem física orientada ao desktop colocava
a próxima ação depois de vários painéis e relegava estado e prioridade para o fim. Os cartões eram
altos, documentos e Sessões associados exigiam entrar primeiro nos painéis de gestão e o breadcrumb
duplicava o regresso canónico já fornecido pelo shell mobile.

### Composição mobile final

- Cabeçalho compacto: título em até duas linhas, estado e prioridade existentes e ações secundárias
  compactas; as etiquetas permanecem disponíveis no desktop e deixam de competir pela primeira
  dobra no mobile.
- A próxima ação calculada pelo motor existente surge imediatamente depois do cabeçalho, seguida de
  contexto, objetivo e notas, documentos, relações e só depois informação secundária.
- Documentos criados têm linhas compactas integralmente clicáveis para a rota canónica, com tipo,
  estado e associação existente a Sessão ou ponto. As ações PDF e Word permanecem disponíveis.
- Documentos recebidos e Sessões relacionados têm resumos compactos e clicáveis construídos apenas
  com as relações já carregadas; os painéis e diálogos de gestão existentes continuam intactos.
- O conteúdo usa largura total, separadores leves, `min-width: 0`, truncation e bloqueio de overflow
  horizontal. O regresso mobile continua a ser fornecido pelo TopBar canónico.

### Preservação explícita

- Mantiveram-se rota, `useDossie`, queries, stores, Supabase, motor `calcularEstadoUxAssunto`, estados,
  prioridades, validações, edição, arquivo, notas, relações, geração, exportação e estados vazios.
- Não foi criada uma relação Assunto–ponto: o contexto de ponto continua a aparecer somente onde já
  existia no metadata dos documentos criados.
- A reorganização é exclusivamente visual abaixo de 768 px. A partir desse breakpoint permanecem a
  ordem física, cartões, densidade, conteúdos e ações anteriores; a grelha recupera as duas colunas
  no breakpoint desktop original.
- Não foram alterados detalhe documental, editor, IA, Biblioteca, Hoje, listas, preparação de Sessão,
  autenticação, pesquisa global, shell mobile ou backend.

### Testes e validações

Foram adicionados contratos para abertura canónica do Assunto e dos documentos, carregamento pelos
hooks existentes, hierarquia mobile, motor de próxima ação, estados, prioridade, edição, arquivo,
validações, notas, documentos, Sessões, referências a pontos, estados vazios, regresso canónico,
títulos extensos, ausência de scroll horizontal e preservação desktop.

A composição foi validada estruturalmente para 320, 375, 390 e 430 px, para a transição em 768 px e
para desktop. `npm test` aprovou 588 testes sem falhas, mantendo apenas o aviso não bloqueante do
sandbox relativo à porta WebSocket 24678 do Vite; `npm run typecheck` foi aprovado; `npm run lint`
foi aprovado com 0 erros e 22 avisos preexistentes fora do âmbito; `npm run build` foi aprovado; e
`git diff --check` foi aprovado. Não foi produzido screenshot de browser nesta execução.

### Riscos residuais

- Continua recomendada uma passagem em dispositivos físicos com fontes ampliadas e safe-areas reais.
- O formulário de geração documental conserva deliberadamente a sua extensão quando é aberto.
- A gestão completa de relações continua nos diálogos existentes; os novos resumos mobile servem
  apenas para consulta e abertura rápida.
- Não existe no contrato atual um carregamento direto de pontos por Assunto; não foi acrescentada uma
  query ou store fora do âmbito para o simular.

### Próxima missão recomendada

Auditar e adaptar exclusivamente o detalhe de Sessão à experiência mobile, mantendo preparação,
pontos, documentos, regras, dados e desktop fora dessa futura alteração.

---

# Próxima ação

Executar uma missão fechada para auditar e adaptar exclusivamente o detalhe de Sessão à experiência
mobile, sem alterar preparação, pontos, documentos, regras, dados, restante navegação ou desktop.

Não iniciar automaticamente outro problema após o fecho do Problema n.º 13.

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
