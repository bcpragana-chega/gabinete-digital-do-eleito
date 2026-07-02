# Tribuno 2.0 - Feature Principles

Este documento define critérios para aceitar, rejeitar ou redesenhar funcionalidades no Tribuno 2.0.

## 1. Regra Principal

Cada funcionalidade deve tornar o produto mais simples, não mais complexo.

Uma funcionalidade só deve entrar se ajudar o eleito a organizar, relacionar, apoiar uma decisão ou preservar memória do mandato.

## 2. Critérios para Aceitar Funcionalidades

Uma funcionalidade deve ser aceite quando:

- reduz tempo até contexto;
- ajuda a tomar uma decisão;
- liga entidades relevantes;
- preserva histórico útil;
- reduz trabalho repetitivo;
- melhora confiança na informação;
- respeita o controlo do eleito;
- encaixa no modelo de domínio;
- não duplica uma funcionalidade existente;
- pode ser explicada de forma simples.

## 3. Critérios para Rejeitar Funcionalidades

Uma funcionalidade deve ser rejeitada quando:

- existe só para produzir mais documentos;
- aumenta campos sem aumentar clareza;
- duplica entidades ou fluxos;
- exige demasiados passos para uma tarefa simples;
- transforma IA em decisor;
- cria navegação excessiva;
- não tem relação clara com mandato, decisão, contexto ou histórico;
- torna o produto mais difícil de explicar.

## 4. Perguntas Obrigatórias Antes de Implementar

Antes de implementar, responder:

1. Que decisão esta funcionalidade ajuda a tomar?
2. Que tempo poupa ao eleito?
3. Que entidade do domínio cria, altera ou relaciona?
4. Esta funcionalidade reduz ou aumenta duplicação?
5. Onde aparece o contexto relevante?
6. Qual é o próximo passo que o utilizador deve conseguir dar?
7. A IA, se existir, sugere ou decide?
8. Isto precisa mesmo de uma nova rota, ou cabe num contexto existente?
9. Como será pesquisável no futuro?
10. Como será preservado no histórico do mandato?

## 5. Funcionalidades Que Entram

Exemplos de funcionalidades alinhadas:

- associar documentos a pontos;
- criar rascunho ligado a ponto;
- transformar deliberação em compromisso;
- ligar pessoa ou entidade a dossiê;
- pesquisar histórico por tema;
- mostrar documentos relevantes automaticamente;
- sugerir perguntas com base em documentos associados;
- mostrar compromissos pendentes de uma entidade;
- criar perfil institucional para documentos;
- exportar documento final validado pelo eleito.

## 6. Funcionalidades a Recusar ou Redesenhar

Exemplos a recusar ou redesenhar:

- gerador automático de moções sem contexto nem revisão;
- feed de notícias genérico sem ligação ao mandato;
- chat de IA que não mostra fontes;
- painel com métricas decorativas;
- upload de documentos sem classificação ou relação;
- múltiplas formas de criar o mesmo tipo de documento;
- menu global com todas as ações possíveis;
- campos obrigatórios que não ajudam decisão;
- templates visuais que ignoram perfil institucional;
- notificações excessivas sem prioridade.

## 7. Regras para IA

A IA deve cumprir estes critérios:

- usar contexto estruturado;
- indicar fontes ou objetos usados;
- separar sugestão de decisão;
- permitir revisão humana;
- não gravar alterações sem confirmação;
- não inventar relações sem as marcar como inferência.

## 8. Regras para Complexidade

Se uma funcionalidade exige muita explicação, provavelmente precisa de ser simplificada.

Se uma funcionalidade cria uma nova entidade, deve explicar:

- nome da entidade;
- relações;
- store ou módulo responsável;
- lugar na navegação;
- valor para decisão.

## 9. Decisão Final

Uma funcionalidade entra quando reforça pelo menos um dos quatro pilares:

1. Organizar
2. Relacionar
3. Apoiar
4. Preservar

Se não reforça nenhum, não pertence ao Tribuno.

