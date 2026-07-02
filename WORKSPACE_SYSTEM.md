# Tribuno 2.0 - Workspace System

Este documento define o sistema de Workspaces do Tribuno. Deve servir como referência para todas as páginas da aplicação.

O Tribuno não deve ser construído como uma coleção de ecrãs isolados. Cada página deve ser um workspace: um espaço de trabalho contextual, composto por blocos reutilizáveis, que ajuda o eleito a compreender, decidir, agir e recuperar memória do mandato.

## 1. Princípio central

Qualquer nova página do Tribuno deve responder a cinco perguntas:

1. Onde estou?
2. O que é este objeto ou contexto?
3. Em que estado está?
4. O que devo fazer a seguir?
5. Que histórico e relações ajudam a decidir?

Se uma página não responde a estas perguntas, não deve ser considerada completa.

## 2. Atomic Workspace

Um Atomic Workspace é a unidade mínima de experiência do Tribuno.

Representa uma página de trabalho centrada num objeto ou contexto do mandato, como:

- assembleia;
- ponto;
- documento;
- dossiê;
- pessoa;
- entidade;
- compromisso;
- nota;
- intervenção;
- evento;
- perfil do mandato.

Um Atomic Workspace não é apenas uma ficha de dados. É um espaço onde o eleito consegue:

- entender contexto;
- ver estado;
- consultar relações;
- escrever ou rever informação;
- tomar decisões;
- executar próximas ações;
- pedir apoio ao Assistente;
- recuperar histórico.

### Regra

Cada entidade importante do domínio deve poder ter um Atomic Workspace próprio.

Exemplos:

- `Workspace de Assembleia`
- `Workspace de Ponto`
- `Workspace de Dossiê`
- `Workspace de Documento`
- `Workspace de Pessoa`
- `Workspace de Compromisso`

## 3. Blocos reutilizáveis

Todas as páginas devem ser compostas a partir dos mesmos blocos conceptuais.

Os blocos principais são:

- Contexto;
- Estado;
- Próximas ações;
- Workspace;
- Assistente;
- Histórico.

Estes blocos podem mudar de densidade, posição e prioridade conforme o tipo de página, mas não devem ser reinventados.

### Regras dos blocos

- Um bloco deve ter uma responsabilidade clara.
- Um bloco deve poder aparecer em vários tipos de página.
- Um bloco deve usar linguagem consistente em toda a aplicação.
- Um bloco deve ligar-se ao objeto atual por ID ou relação explícita.
- Um bloco não deve duplicar informação que pertence a outro bloco.

### Exemplos de blocos reutilizáveis

- `Context Header`
- `Status Summary`
- `Next Actions`
- `Related Objects`
- `Work Area`
- `Assistant Panel`
- `Timeline`
- `Recent Activity`
- `Source Documents`
- `Decision Notes`

## 4. Contexto

Contexto responde à pergunta: `Onde estou e porque isto importa?`

O bloco de Contexto deve situar o eleito dentro do mandato. Deve tornar visível o objeto atual, a sua origem e as relações que dão significado ao que está a ser visto.

### Deve mostrar

- título do objeto;
- tipo de objeto;
- origem;
- localização dentro do mandato;
- relações principais;
- data ou período relevante;
- entidade, pessoa, assembleia ou dossiê associado;
- resumo curto quando necessário.

### Não deve fazer

- substituir a área de trabalho;
- mostrar todos os metadados disponíveis;
- transformar o topo da página num dashboard;
- esconder relações importantes em menus secundários.

### Exemplos

Numa assembleia:

- data;
- órgão;
- estado da preparação;
- número de pontos;
- documentos principais;
- próximos momentos.

Num dossiê:

- tema;
- estado;
- entidades associadas;
- compromissos pendentes;
- últimas ocorrências;
- assembleias relacionadas.

Num documento:

- título;
- origem;
- data;
- ponto ou dossiê associado;
- resumo;
- estado de leitura ou análise.

## 5. Estado

Estado responde à pergunta: `Em que ponto está este assunto?`

O bloco de Estado deve ajudar o eleito a perceber progresso, urgência, bloqueios e nível de preparação.

### Deve mostrar

- estado atual;
- progresso;
- urgência;
- prazo;
- bloqueios;
- responsável, quando aplicável;
- confiança ou completude da informação;
- última atualização relevante.

### Tipos de estado

- Estado de preparação;
- Estado de decisão;
- Estado de compromisso;
- Estado documental;
- Estado de seguimento;
- Estado de risco;
- Estado de arquivo.

### Exemplos de estados

- `Por analisar`
- `Em preparação`
- `Pronto`
- `A acompanhar`
- `A aguardar resposta`
- `Em curso`
- `Concluído`
- `Arquivado`

### Regra

Estado deve ser informativo, não decorativo. Badges, cores e indicadores só devem existir quando ajudam a decidir ou priorizar.

## 6. Próximas ações

Próximas ações respondem à pergunta: `O que devo fazer agora?`

Este bloco transforma informação em movimento. Deve indicar as ações concretas que fazem sentido no contexto atual.

### Deve mostrar

- ação principal;
- ações secundárias;
- ações pendentes;
- ações sugeridas;
- ações concluídas recentemente, quando útil;
- prazo ou consequência da ação.

### Princípios

- Poucas ações de cada vez.
- A ação principal deve ser clara.
- Ações devem estar ligadas ao objeto atual.
- Ações perigosas devem exigir confirmação.
- Ações raras não devem competir com ações frequentes.

### Exemplos

Num ponto:

- `Analisar documentos`
- `Preparar intervenção`
- `Registar pergunta`
- `Associar a dossiê`

Num compromisso:

- `Atualizar estado`
- `Registar resposta`
- `Adicionar nota`
- `Marcar como concluído`

Num documento:

- `Ler resumo`
- `Associar a ponto`
- `Criar nota`
- `Pedir análise ao Assistente`

## 7. Workspace

Workspace é a área principal onde o trabalho acontece.

É o centro da página. Deve permitir pensar, escrever, consultar, organizar e preparar decisão. Não deve ser apenas visualização passiva.

### Pode incluir

- editor;
- notas;
- documentos;
- lista de pontos;
- agenda;
- compromissos;
- relações;
- decisões;
- perguntas em aberto;
- rascunhos;
- anexos;
- blocos de análise.

### Deve variar por objeto

Cada tipo de Atomic Workspace tem uma área principal diferente:

- Assembleia: agenda, pontos, documentos, preparação e alertas.
- Ponto: documentos, notas, posição, intervenção e relações.
- Dossiê: resumo, timeline, compromissos, documentos e pessoas.
- Documento: conteúdo, resumo, entidades mencionadas, notas e ligações.
- Pessoa: perfil, relações, histórico, temas e interações.
- Compromisso: estado, origem, prazo, seguimento e evidências.

### Regra

O Workspace deve ser estruturado o suficiente para orientar o eleito, mas flexível o suficiente para permitir trabalho real.

## 8. Assistente

O Assistente é uma camada contextual de apoio à decisão.

Não é o centro da aplicação e não substitui o eleito. Deve atuar sobre o contexto do Atomic Workspace atual.

### Deve ajudar a

- resumir informação;
- encontrar relações;
- recuperar histórico;
- explicar documentos;
- identificar pendentes;
- sugerir próximos passos;
- preparar intervenções;
- transformar notas em ações;
- comparar decisões anteriores.

### Deve sempre indicar

- que contexto usou;
- que fontes ou objetos consultou;
- o que é facto;
- o que é sugestão;
- que ação o eleito pode confirmar.

### Não deve fazer

- decidir pelo eleito;
- alterar dados sem confirmação;
- criar versões finais sem validação;
- esconder incerteza;
- inventar contexto não existente;
- substituir leitura de documentos críticos.

### Exemplos

- `Resume este ponto e destaca riscos.`
- `Que compromissos estão ligados a este dossiê?`
- `Mostra decisões anteriores sobre este tema.`
- `Ajuda-me a preparar uma intervenção curta.`
- `Que perguntas ainda estão em aberto?`

## 9. Histórico

Histórico responde à pergunta: `O que aconteceu antes e como chegámos aqui?`

O Tribuno deve tratar memória como parte essencial do trabalho político. O Histórico não deve ser um registo escondido; deve estar disponível quando ajuda a compreender continuidade, responsabilidade e decisões anteriores.

### Deve mostrar

- eventos relevantes;
- alterações de estado;
- decisões;
- notas importantes;
- documentos adicionados;
- compromissos criados ou concluídos;
- assembleias relacionadas;
- interações com pessoas e entidades;
- origem de informação.

### Tipos de histórico

- Timeline do objeto;
- Atividade recente;
- Histórico de decisões;
- Histórico documental;
- Histórico de compromissos;
- Histórico de relações;
- Histórico de alterações.

### Exemplos

Num dossiê:

- primeira ocorrência;
- assembleias onde foi debatido;
- documentos recebidos;
- compromissos assumidos;
- respostas obtidas;
- decisões tomadas.

Num compromisso:

- origem;
- alterações de estado;
- notas de seguimento;
- contactos feitos;
- evidências anexadas;
- conclusão ou arquivo.

## 10. Composição de uma página

Qualquer nova página deve ser construída a partir desta sequência lógica:

1. Contexto;
2. Estado;
3. Próximas ações;
4. Workspace;
5. Assistente;
6. Histórico.

Esta sequência não obriga a uma ordem visual rígida. Obriga a uma ordem conceptual.

### Estrutura base

Uma página deve conter:

- cabeçalho contextual;
- resumo de estado;
- ações principais;
- área de trabalho;
- relações e contexto secundário;
- assistente contextual;
- histórico ou atividade.

### Densidade por tipo de página

Páginas operacionais devem dar mais destaque a:

- Estado;
- Próximas ações;
- Workspace.

Páginas de conhecimento devem dar mais destaque a:

- Contexto;
- Relações;
- Histórico;
- Assistente.

Páginas de preparação devem dar mais destaque a:

- Workspace;
- Documentos;
- Próximas ações;
- Assistente.

Páginas de acompanhamento devem dar mais destaque a:

- Estado;
- Histórico;
- Compromissos;
- Próximas ações.

## 11. Como criar uma nova página

Antes de criar uma nova página, responder:

1. Qual é o objeto central?
2. Que contexto precisa de estar visível?
3. Que estado importa acompanhar?
4. Que ações fazem sentido neste momento?
5. Onde acontece o trabalho principal?
6. Que ajuda contextual o Assistente pode dar?
7. Que histórico precisa de estar acessível?
8. Que relações devem aparecer automaticamente?

Se a página não tiver objeto central, deve ser revista. Pode ser um dashboard, uma pesquisa ou uma vista agregada, mas mesmo assim deve ter contexto, estado, ações e histórico.

## 12. Regras de consistência

- Não criar páginas sem contexto claro.
- Não criar dashboards que sejam apenas métricas.
- Não criar fichas de objeto sem próximas ações.
- Não criar áreas de trabalho sem histórico acessível.
- Não criar ações globais quando a ação pertence a um objeto.
- Não duplicar relações entre blocos.
- Não esconder estado crítico em detalhe secundário.
- Não tornar o Assistente o único caminho para encontrar informação.

## 13. Exemplos de Atomic Workspaces

### Workspace de Assembleia

Blocos principais:

- Contexto da assembleia;
- Estado da preparação;
- Próximas ações;
- Agenda e pontos;
- Documentos;
- Assistente de preparação;
- Histórico da sessão.

### Workspace de Ponto

Blocos principais:

- Contexto do ponto;
- Estado de análise;
- Próximas ações;
- Documentos e notas;
- Rascunho de intervenção;
- Relações com dossiês e compromissos;
- Histórico do tema.

### Workspace de Dossiê

Blocos principais:

- Contexto do tema;
- Estado do dossiê;
- Próximas ações;
- Timeline;
- Documentos, pessoas e entidades;
- Compromissos;
- Assistente de memória;
- Histórico de decisões.

### Workspace de Documento

Blocos principais:

- Contexto do documento;
- Estado de leitura ou análise;
- Próximas ações;
- Conteúdo e resumo;
- Notas;
- Entidades mencionadas;
- Ligações a pontos e dossiês;
- Histórico de utilização.

### Workspace de Compromisso

Blocos principais:

- Contexto de origem;
- Estado de seguimento;
- Próximas ações;
- Prazo e responsável;
- Notas de acompanhamento;
- Evidências;
- Relações;
- Histórico de alterações.

## 14. Resultado esperado

O sistema de Workspaces deve fazer com que o Tribuno pareça uma aplicação única, mesmo quando cresce em módulos.

Cada nova página deve reforçar a mesma linguagem:

- contexto antes de detalhe;
- estado antes de ruído;
- próximas ações antes de menus;
- trabalho real antes de decoração;
- assistência contextual antes de automação opaca;
- histórico antes de esquecimento.

O objetivo final é simples: qualquer objeto do mandato deve poder transformar-se num espaço de trabalho claro, acionável e ligado à memória institucional do eleito.
