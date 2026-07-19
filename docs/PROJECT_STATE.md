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

## ⏳ Problema n.º 6 — A Biblioteca exige demasiado trabalho manual de classificação

Estado: EM CURSO — Fase 6A concluída; Fase 6B pendente
Avaliação da Fase 6A: 9,3/10

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

### Fase 6A concluída — entrada documental única para PDFs

- “Adicionar e analisar PDF” é a ação principal da Biblioteca.
- A adição manual continua disponível como alternativa secundária para casos excecionais.
- Uma função pura decide entre `preparar_sessao`, `guardar_biblioteca` e
  `necessita_confirmacao`, com limiar de confiança único de 0,75.
- Convocatórias e ordens de trabalhos suficientemente identificadas preservam o fluxo validado
  de revisão, duplicados, criação ou atualização de Sessão, pontos, onboarding e navegação.
- Atas, propostas, regulamentos e restantes documentos reconhecidos são confirmados e organizados
  na Biblioteca sem criar Sessão nem chamar a RPC de confirmação de Sessão.
- Documentos desconhecidos, de baixa confiança, com campos essenciais incertos ou sem dados essenciais ficam
  por rever e permitem corrigir apenas título e tipo documental.
- A confirmação documental atualiza o mesmo Documento e o mesmo PDF já carregados, guarda o resumo
  de compreensão quando existe e abre a rota canónica com origem Biblioteca.
- O mapeamento entre tipos institucionais e tipos persistidos é explícito e testado; tipos sem
  granularidade segura usam `Outro`.
- Não foram criadas tabelas, migrações ou alterações ao schema Supabase.
- Validação: 367 testes aprovados, typecheck aprovado, lint com 0 erros e 20 avisos antigos não
  relacionados, build aprovado e `git diff --check` aprovado.

### Justificação da avaliação da Fase 6A

A avaliação de 9,3/10 resulta da entrada recomendada única, decisão determinística centralizada,
persistência confirmada sobre o Documento existente, revisão adaptada ao destino, preservação do
fluxo de convocatória e aprovação integral da validação obrigatória. O Problema n.º 6 não fica
fechado porque a visão avançada de organização e acompanhamento pertence à Fase 6B.

### Fase 6B pendente

Continuam deliberadamente adiados a relevância política avançada, alterações importantes, ações,
prazos, criação ou associação automática de Assuntos, notificações e acompanhamento político.

---

## ⏳ Problema n.º 7 — Sistema de estados documental confuso

Estado: PENDENTE

### Estados atualmente sobrepostos

- Por analisar
- Por rever
- Importante
- Revisto
- Tratado
- Arquivado

### Problemas

- Importante é prioridade, não estado.
- Revisto e Tratado podem ser ambíguos.
- Por analisar e Por rever parecem equivalentes.
- Diferentes áreas podem interpretar o mesmo documento de forma diferente.

### Objetivo futuro

Criar uma máquina de estados canónica, pequena e inequívoca.

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

## ⏳ Problema n.º 9 — Vestígios claros de protótipo

Estado: PENDENTE

### Vestígios identificados

- package.json com nome genérico tanstack_start_ts;
- dependência @lovable.dev/vite-tanstack-config;
- componentes centrais a importar formatarData de mock-data;
- nomenclatura interna de protótipo.

### Risco

Um produto institucional que trabalha com legislação, documentos políticos e dados sensíveis não deve parecer internamente um protótipo prolongado.

---

## ⏳ Problema n.º 10 — Persistência local como fallback silencioso

Estado: PENDENTE

### Diagnóstico

Sem configuração remota, o Tribuno pode guardar dados no localStorage do navegador.

### Riscos

- dados presos a um navegador;
- perda ao limpar dados;
- ausência noutros computadores;
- risco em equipamentos partilhados;
- inexistência de histórico remoto;
- confiança reduzida em backups;
- potencial exposição local.

### Objetivo futuro

Em produção, operações institucionais sérias não devem continuar normalmente sem persistência remota.

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

Selecionar explicitamente o próximo problema Beta numa missão futura.

Não iniciar automaticamente outro problema após o fecho do Problema n.º 5.

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
