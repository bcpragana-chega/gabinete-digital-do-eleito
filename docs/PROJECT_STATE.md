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
- Agenda

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

## ⏳ Problema n.º 3 — A página Hoje está demasiado carregada

Estado: PENDENTE

### Diagnóstico

O dashboard tenta apresentar simultaneamente:

- missão prioritária;
- passos da preparação;
- tarefas;
- alertas;
- métricas;
- atividade;
- documentos recentes;
- acessos rápidos;
- onboarding;
- carregamento de convocatória;
- criação manual de sessão.

### Risco

A missão prioritária perde autoridade por estar rodeada de demasiada informação.

### Objetivo futuro

Transformar a página Hoje num mecanismo de decisão:

- uma ação principal inequívoca;
- dois alertas reais;
- uma lista curta de pendências;
- restante informação escondida até ser necessária.

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

## ⏳ Problema n.º 5 — A Agenda não é uma agenda

Estado: PENDENTE

### Diagnóstico

A página Agenda apresenta essencialmente próximas sessões registadas.

### Elementos em falta para uma verdadeira agenda

- prazos;
- reuniões;
- visitas;
- eventos;
- datas prometidas;
- acompanhamentos;
- compromissos políticos;
- tarefas com data;
- respostas esperadas;
- lembretes.

### Decisão futura necessária

Ou passa a chamar-se Calendário de Sessões, ou torna-se numa verdadeira agenda do mandato.

---

## ⏳ Problema n.º 6 — A Biblioteca exige demasiado trabalho manual de classificação

Estado: PENDENTE

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

Atacar exclusivamente:

## Problema n.º 3 — A página Hoje está demasiado carregada

Não iniciar trabalho nos problemas n.º 4 a 14 antes de o problema n.º 3 ser validado e fechado com pelo menos 9,0/10.

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
