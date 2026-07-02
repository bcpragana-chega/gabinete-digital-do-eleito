# Tribuno 2.0 - Master Architecture

Este documento é a referência principal da arquitetura de produto e técnica do Tribuno 2.0. Deve orientar decisões futuras, evitar duplicações e manter a evolução do projeto coerente.

O Tribuno 2.0 deixa de ser apenas uma aplicação para preparar assembleias. Passa a ser uma plataforma completa de gestão do mandato de um eleito.

## 1. Visão do Produto

O Tribuno 2.0 é uma plataforma para acompanhar todo o mandato de um eleito local: antes, durante e depois das assembleias, mas também fora delas, nos dossiês permanentes, compromissos assumidos, relações com pessoas e entidades, documentos, projetos, histórico e conhecimento político acumulado.

A assembleia é uma parte importante do sistema, mas não é o sistema inteiro. Uma assembleia é um momento formal dentro de um mandato. O mandato inclui também temas continuados, respostas pendentes, reuniões, entidades, cidadãos, promessas, documentos, intervenções, dossiês e memória institucional.

O Dossiê é a principal unidade de conhecimento do Tribuno. Um Dossiê representa um tema ou problema acompanhado pelo eleito ao longo do mandato, reunindo toda a informação, decisões, documentos, pessoas, entidades, compromissos e histórico relacionados. As Assembleias alimentam os Dossiês; os Dossiês acompanham o mandato. Pesquisa e IA devem usar os Dossiês como principal contexto de conhecimento.

O objetivo do produto é transformar informação dispersa em trabalho acompanhado. Tudo o que acontece no mandato deve poder ser:

- registado;
- ligado a outras entidades;
- pesquisado;
- reutilizado;
- acompanhado ao longo do tempo;
- usado como contexto para IA;
- convertido em ação política, institucional ou administrativa.

O Tribuno deve apoiar o eleito em três níveis:

1. **Operacional:** preparar sessões, consultar documentos, escrever notas e criar documentos.
2. **Estratégico:** acompanhar prioridades políticas, riscos, compromissos e posicionamento.
3. **Histórico:** manter memória pesquisável do mandato, das decisões e das relações institucionais.

## 2. Princípios da Arquitetura

### 2.1 Uma responsabilidade, um local

Cada responsabilidade deve ter um local claro. Uma entidade, store, rota ou componente não deve competir com outro pelo mesmo papel.

Exemplos:

- documentos recebidos pertencem ao domínio `Documentos`;
- documentos produzidos pelo eleito pertencem ao domínio `Documentos Criados`;
- pontos da ordem de trabalhos pertencem ao domínio `Assembleias/Preparação`;
- compromissos pertencem ao domínio `Compromissos`;
- dossiês agregam relações, não duplicam dados.
- dossiês são a principal unidade de conhecimento do mandato.

### 2.2 Não duplicar entidades

O mesmo conceito não deve existir com modelos concorrentes. Se existir um `Documento Criado`, todos os módulos devem apontar para essa entidade por ID em vez de criarem versões próprias.

Duplicações a evitar:

- vários tipos diferentes para o mesmo documento;
- campos copiados de uma entidade para outra quando bastaria guardar o ID;
- stores paralelas com o mesmo domínio;
- mocks usados como fonte real de dados em funcionalidades operacionais.

### 2.3 Tudo é uma entidade do domínio

O produto deve ser pensado como uma rede de entidades:

- Mandato
- Assembleia
- Ponto
- Documento
- Documento Criado
- Ata
- Pessoa
- Entidade
- Projeto
- Dossiê
- Compromisso
- Evento
- Nota
- Intervenção
- Perfil do Eleito

Cada entidade deve ter identidade própria, campos mínimos claros e relações por IDs.

### 2.4 Tudo pode relacionar-se através de IDs

As relações entre objetos devem ser feitas por IDs. Isto mantém o modelo preparado para base de dados, sincronização cloud, pesquisa, IA e múltiplos utilizadores.

Exemplos:

- um ponto guarda `documentoIds`, não cópias dos documentos;
- um dossiê guarda `pontoIds`, `documentoIds`, `pessoaIds`, `entidadeIds` e `compromissoIds`;
- uma nota pode ter uma lista genérica de links para entidades;
- um compromisso deve saber qual foi a sua origem.

### 2.5 Componentes pequenos

Componentes devem ter uma responsabilidade principal. Rotas e ecrãs podem compor componentes, mas não devem concentrar toda a lógica visual e de domínio.

Sempre que um ficheiro crescer por acumulação de responsabilidades, extrair componentes pequenos e nomeados pelo domínio.

### 2.6 Rotas simples

Rotas devem ser responsáveis por:

- ler parâmetros;
- carregar dados necessários;
- tratar navegação;
- compor componentes de ecrã.

Rotas não devem tornar-se o local principal de regras de domínio, cálculos complexos, formulários extensos e listas operacionais ao mesmo tempo.

### 2.7 Stores separadas por domínio

Cada store deve representar um domínio claro:

- assembleias;
- pontos;
- documentos;
- documentos criados;
- estratégia;
- perfil institucional;
- dossiês;
- pessoas;
- entidades;
- compromissos;
- eventos;
- notas.

Stores não devem duplicar entidades de outras stores. Quando precisarem de relação, devem guardar IDs.

### 2.8 Preparado para futura base de dados

Mesmo usando `localStorage` agora, o modelo deve comportar-se como se fosse migrar para uma base de dados real.

Regras:

- entidades com `id`;
- relações por IDs;
- timestamps quando relevante;
- estados explícitos;
- evitar dados derivados persistidos sem necessidade;
- preparar migrações de schema;
- separar dados permanentes de estado temporário de UI.

### 2.9 Preparado para IA

A IA deve usar contexto estruturado, não texto solto duplicado. Antes de implementar IA, é necessário consolidar:

- entidades canónicas;
- relações entre objetos;
- documentos criados;
- dossiês;
- pesquisa;
- histórico.

A IA deve sugerir, resumir e cruzar informação, mas não deve alterar dados automaticamente sem ação explícita do utilizador.

### 2.10 Preparado para múltiplos utilizadores

A arquitetura deve permitir evolução para equipas, gabinetes e múltiplos utilizadores.

Isto implica:

- entidades com dono/contexto;
- futuro `userId` ou `workspaceId`;
- permissões por módulo;
- histórico de alterações;
- sincronização cloud;
- separação entre dados pessoais, institucionais e partilhados.

### 2.11 Não reescrever o que já funciona

A evolução deve ser incremental. Corrigir dívida técnica não significa reconstruir a aplicação. Cada fase deve preservar o comportamento existente, reduzir duplicações e abrir espaço para o próximo módulo.

## 3. Módulos do Sistema

### 3.1 Mandato

**Objetivo:**  
Representar o ciclo político completo do eleito.

**Responsabilidades:**

- definir o mandato ativo;
- guardar período, órgão, território e prioridades;
- agregar assembleias, dossiês, documentos, pessoas, entidades, compromissos e histórico;
- servir de contexto para pesquisa e IA.

**Relações:**

- tem muitas assembleias;
- tem muitos dossiês;
- tem muitos documentos;
- tem muitos compromissos;
- liga-se ao perfil do eleito;
- liga-se a pessoas e entidades relevantes.

### 3.2 Perfil do Eleito

**Objetivo:**  
Guardar a identidade política, institucional e comunicacional do eleito.

**Responsabilidades:**

- dados do eleito;
- cargo;
- órgão;
- partido, movimento ou grupo;
- assinatura;
- logótipo;
- contactos;
- tom institucional;
- preferências de templates.

**Relações:**

- pertence a um mandato ou workspace;
- é usado por documentos criados;
- é usado por pré-visualização e exportação PDF;
- serve de contexto para IA.

### 3.3 Assembleias

**Objetivo:**  
Gerir sessões formais de órgãos autárquicos ou institucionais.

**Responsabilidades:**

- criar e organizar assembleias;
- guardar data, hora, local e estado;
- gerir pontos da ordem de trabalhos;
- ligar documentos, atas, compromissos, notas e eventos.

**Relações:**

- pertence a um mandato;
- pertence a um órgão;
- tem muitos pontos;
- tem muitos documentos;
- pode ter uma ata;
- pode gerar compromissos;
- pode ligar-se a dossiês, pessoas e entidades.

### 3.4 Preparação

**Objetivo:**  
Apoiar o trabalho antes da assembleia.

**Responsabilidades:**

- preparar pontos da ordem de trabalhos;
- associar documentos a pontos;
- definir resumo, objetivo político, riscos, linha de intervenção e notas;
- criar rascunhos de documentos;
- consolidar estratégia da sessão;
- apresentar dashboard de preparação.

**Relações:**

- usa assembleias;
- usa pontos;
- usa documentos;
- gera documentos criados;
- pode gerar intervenções e compromissos futuros;
- alimenta sessão, pós-assembleia, pesquisa e IA.

### 3.5 Sessão

**Objetivo:**  
Acompanhar a assembleia em tempo real.

**Responsabilidades:**

- consultar pontos em ordem;
- consultar documentos associados;
- registar notas rápidas;
- registar intervenções;
- registar votações;
- registar decisões;
- marcar compromissos assumidos.

**Relações:**

- usa preparação como contexto;
- atualiza pontos;
- cria eventos, notas, intervenções e compromissos;
- alimenta pós-assembleia e histórico.

### 3.6 Pós-Assembleia

**Objetivo:**  
Consolidar o que aconteceu depois da sessão.

**Responsabilidades:**

- registar resultados por ponto;
- associar ou rever ata;
- confirmar deliberações;
- transformar decisões em compromissos;
- acompanhar pendentes;
- comparar preparação com resultado real.

**Relações:**

- usa assembleias, pontos e atas;
- cria ou atualiza compromissos;
- liga documentos finais;
- alimenta dossiês, histórico, pesquisa e IA.

### 3.7 Documentos

**Objetivo:**  
Ser o repositório documental do mandato.

**Responsabilidades:**

- guardar documentos recebidos;
- guardar metadados;
- associar documentos a assembleias, pontos, dossiês, pessoas, entidades e compromissos;
- distinguir documentos recebidos de documentos criados;
- preparar classificação, pesquisa e análise futura.

**Relações:**

- pode pertencer a assembleias;
- pode estar associado a pontos;
- pode ligar-se a dossiês;
- pode referir pessoas e entidades;
- pode originar documentos criados ou compromissos.

### 3.8 Dossiês

**Objetivo:**  
Criar a principal unidade de conhecimento do mandato, reunindo memória temática e acompanhamento transversal.

**Responsabilidades:**

- representar um tema ou problema acompanhado ao longo do mandato;
- agrupar informação por tema;
- ligar documentos, pontos, pessoas, entidades, compromissos e eventos;
- acompanhar evolução de Dossiês ao longo do mandato;
- receber informação alimentada por assembleias, pontos, documentos, atas e compromissos;
- preparar o principal contexto para pesquisa, futuras intervenções e IA.

**Relações:**

- pertence a um mandato;
- liga-se a muitas assembleias;
- agrega documentos, pontos, pessoas, entidades, compromissos, eventos e notas;
- pode originar documentos criados.

**Exemplos:**

- Habitação;
- Centro de Saúde;
- Iluminação Pública;
- Orçamento 2027.

### 3.9 Pessoas

**Objetivo:**  
Registar atores individuais relevantes.

**Responsabilidades:**

- guardar nome, cargo, contactos e notas;
- ligar pessoas a entidades;
- registar participação em eventos, assembleias, compromissos e dossiês.

**Relações:**

- pode pertencer a entidades;
- pode estar ligada a assembleias;
- pode estar ligada a documentos;
- pode estar ligada a dossiês;
- pode ser responsável por compromissos.

### 3.10 Entidades

**Objetivo:**  
Registar organizações relevantes para o mandato.

**Responsabilidades:**

- guardar nome, tipo, território, contactos e notas;
- ligar pessoas associadas;
- acompanhar interações institucionais.

**Relações:**

- tem pessoas;
- pode estar ligada a assembleias, documentos, dossiês, compromissos e eventos;
- pode ser destinatária de requerimentos, recomendações ou pedidos.

### 3.11 Projetos

**Objetivo:**  
Acompanhar iniciativas, obras, políticas públicas ou processos com evolução própria.

**Responsabilidades:**

- organizar informação por projeto concreto;
- acompanhar estado, prazos, entidades responsáveis e documentos;
- ligar projeto a assembleias, pontos, dossiês e compromissos.

**Relações:**

- pertence a um mandato;
- pode fazer parte de um dossiê;
- pode ligar-se a documentos, eventos, pessoas, entidades e compromissos;
- pode ser discutido em vários pontos de assembleias diferentes.

### 3.12 Compromissos

**Objetivo:**  
Gerir promessas, pedidos, respostas esperadas, tarefas e seguimento.

**Responsabilidades:**

- registar origem do compromisso;
- definir estado, prazo e responsável;
- acompanhar pendentes;
- gerar histórico de seguimento.

**Relações:**

- pode nascer de moção, recomendação, requerimento, intervenção, ata, evento ou ponto;
- pode ligar-se a assembleia, dossiê, pessoa, entidade e projeto;
- pode gerar eventos e notas de acompanhamento.

### 3.13 Pesquisa

**Objetivo:**  
Permitir encontrar e relacionar conhecimento de todo o mandato.

**Responsabilidades:**

- pesquisa global;
- filtros por entidade, data, tipo, estado e relação;
- resultados contextualizados;
- base para pesquisa semântica futura.

**Relações:**

- indexa todas as entidades principais;
- usa relações por ID;
- usa Dossiês como principal contexto de conhecimento;
- alimenta IA e histórico.

### 3.14 IA

**Objetivo:**  
Apoiar o eleito com análise e sugestões contextualizadas.

**Responsabilidades:**

- resumir documentos;
- identificar riscos, prazos, valores e contradições;
- sugerir perguntas, intervenções e compromissos;
- apoiar criação de documentos;
- recuperar histórico relevante;
- explicar fontes usadas.

**Relações:**

- lê contexto estruturado de Dossiês, assembleias, pontos, documentos, pessoas, entidades e compromissos;
- usa Dossiês como principal contexto de conhecimento para resumir, relacionar e explicar informação do mandato;
- sugere alterações, mas não altera dados sem confirmação;
- depende de pesquisa e modelo de dados consolidado.

### 3.15 Administração

**Objetivo:**  
Gerir configurações, dados institucionais e futura operação multiutilizador.

**Responsabilidades:**

- perfil institucional;
- preferências;
- gestão futura de utilizadores;
- permissões;
- importação/exportação de dados;
- manutenção de templates.

**Relações:**

- afeta documentos criados;
- configura IA;
- define contexto de mandato, órgão e workspace.

## 4. Modelo do Domínio

### 4.1 Mandato

Representa o período completo de exercício político.

**Relações possíveis:**

- tem assembleias;
- tem dossiês;
- tem projetos;
- tem documentos;
- tem pessoas e entidades relacionadas;
- tem compromissos;
- tem eventos e notas;
- usa perfil do eleito.

### 4.2 Perfil do Eleito

Representa a identidade institucional do eleito.

**Relações possíveis:**

- pertence a mandato, utilizador ou workspace;
- liga-se ao órgão;
- é usado em documentos criados;
- define cabeçalhos, assinaturas e templates;
- fornece contexto para IA.

### 4.3 Assembleia

Representa uma sessão formal.

**Relações possíveis:**

- pertence a um mandato;
- pertence a um órgão;
- tem pontos;
- tem documentos;
- tem ata;
- tem notas;
- tem intervenções;
- tem eventos;
- pode gerar compromissos;
- pode ligar-se a dossiês, projetos, pessoas e entidades.

### 4.4 Ponto

Representa um ponto da ordem de trabalhos.

**Relações possíveis:**

- pertence a uma assembleia;
- tem documentos associados;
- pode gerar documentos criados;
- pode ter notas;
- pode ter intervenções;
- pode gerar compromissos;
- pode ligar-se a dossiês;
- pode ligar-se a projetos;
- pode ligar-se a pessoas e entidades;
- pode estar refletido na ata.

### 4.5 Documento

Representa documento recebido, carregado ou referenciado.

**Relações possíveis:**

- pode pertencer a uma ou várias assembleias;
- pode estar associado a pontos;
- pode ligar-se a dossiês;
- pode ligar-se a projetos;
- pode referir pessoas e entidades;
- pode originar compromissos;
- pode servir de fonte para documentos criados e IA.

### 4.6 Documento Criado

Representa documento produzido pelo eleito ou equipa.

Inclui moções, recomendações, requerimentos, declarações de voto e intervenções quando forem tratadas como documento formal.

**Relações possíveis:**

- pode ligar-se a assembleia;
- pode ligar-se a ponto;
- pode ligar-se a dossiê;
- pode ligar-se a projeto;
- pode ligar-se a pessoa ou entidade;
- pode originar compromisso;
- pode usar perfil institucional;
- pode ter versões futuras.

### 4.7 Ata

Representa documento oficial pós-sessão.

**Relações possíveis:**

- pertence a uma assembleia;
- pode estar ligada a documento recebido;
- confirma deliberações;
- confirma intervenções e declarações de voto;
- pode originar compromissos;
- pode ligar-se a pontos.

### 4.8 Pessoa

Representa ator individual relevante.

**Relações possíveis:**

- pode pertencer a uma ou várias entidades;
- pode participar em eventos;
- pode estar ligada a assembleias;
- pode estar ligada a documentos;
- pode estar ligada a dossiês e projetos;
- pode ser responsável por compromissos;
- pode ser destinatária ou origem de notas.

### 4.9 Entidade

Representa organização relevante.

**Relações possíveis:**

- pode ter pessoas;
- pode estar ligada a assembleias;
- pode estar ligada a documentos;
- pode estar ligada a dossiês e projetos;
- pode ser responsável por compromissos;
- pode ser destinatária de requerimentos ou recomendações;
- pode participar em eventos.

### 4.10 Projeto

Representa iniciativa, obra, política pública ou processo acompanhado.

**Relações possíveis:**

- pertence a mandato;
- pode ligar-se a dossiê;
- pode ligar-se a assembleias e pontos;
- pode ligar-se a documentos;
- pode ligar-se a pessoas e entidades;
- pode ter compromissos;
- pode ter eventos e notas.

### 4.11 Dossiê

Representa um tema ou problema acompanhado pelo eleito ao longo do mandato. É a principal unidade de conhecimento do Tribuno.

**Relações possíveis:**

- pertence a mandato;
- pode agrupar documentos;
- pode agrupar pontos;
- pode agrupar pessoas e entidades;
- pode agrupar compromissos;
- pode agrupar eventos;
- pode conter notas;
- pode conter projetos;
- pode gerar documentos criados.

Exemplos:

- Habitação;
- Centro de Saúde;
- Iluminação Pública;
- Orçamento 2027.

### 4.12 Compromisso

Representa promessa, pedido, tarefa, resposta esperada ou seguimento.

**Relações possíveis:**

- pode nascer de recomendação, requerimento, moção, intervenção, ata, evento ou ponto;
- pode ligar-se a assembleia;
- pode ligar-se a ponto;
- pode ligar-se a documento criado;
- pode ligar-se a dossiê ou projeto;
- pode ter pessoa ou entidade responsável;
- pode gerar eventos e notas de seguimento.

### 4.13 Evento

Representa ocorrência relevante do mandato.

**Relações possíveis:**

- pode ligar-se a assembleia;
- pode ligar-se a ponto;
- pode ligar-se a dossiê ou projeto;
- pode ligar-se a documentos;
- pode envolver pessoas e entidades;
- pode gerar compromissos;
- pode ter notas.

### 4.14 Nota

Representa apontamento livre ou estruturado.

**Relações possíveis:**

- pode ligar-se a qualquer entidade principal;
- pode ser interna, de sessão, de seguimento ou livre;
- pode contextualizar documentos, pontos, dossiês, compromissos e eventos.

### 4.15 Intervenção

Representa texto, guião ou registo de fala.

**Relações possíveis:**

- pode ligar-se a assembleia;
- pode ligar-se a ponto;
- pode ligar-se a documentos de suporte;
- pode ligar-se a dossiês, projetos, pessoas e entidades;
- pode originar evento, compromisso ou documento criado.

## 5. Fluxos do Produto

O fluxo completo do produto deve seguir esta lógica:

```text
Mandato
  ↓
Assembleias
  ↓
Preparação
  ↓
Sessão
  ↓
Pós-Assembleia
  ↓
Acompanhamento
  ↓
Histórico
  ↓
Pesquisa
  ↓
IA
```

### 5.1 Mandato

O utilizador define ou seleciona o mandato ativo. Esse mandato dá contexto às assembleias, documentos, dossiês, compromissos, pessoas e entidades.

### 5.2 Assembleias

O utilizador cria ou consulta assembleias. Cada assembleia organiza pontos, documentos, preparação, sessão e pós-assembleia.

### 5.3 Preparação

Antes da sessão, o utilizador:

- revê documentos;
- prepara pontos;
- associa documentos a pontos;
- define estratégia;
- cria rascunhos;
- escreve notas internas;
- identifica riscos e objetivos políticos.

### 5.4 Sessão

Durante a sessão, o utilizador:

- acompanha a ordem de trabalhos;
- consulta documentos e notas;
- regista intervenções;
- regista votações;
- regista decisões;
- cria compromissos em tempo real.

### 5.5 Pós-Assembleia

Depois da sessão, o utilizador:

- revê resultados;
- associa ata;
- confirma deliberações;
- atualiza estados dos pontos;
- finaliza documentos;
- cria compromissos de seguimento.

### 5.6 Acompanhamento

Ao longo do mandato, o utilizador acompanha:

- compromissos pendentes;
- respostas esperadas;
- projetos em curso;
- dossiês temáticos;
- entidades responsáveis;
- eventos relevantes.

### 5.7 Histórico

Tudo o que foi preparado, discutido, decidido e acompanhado passa a fazer parte da memória do mandato.

### 5.8 Pesquisa

A pesquisa permite recuperar informação por texto, data, tipo, estado ou relação entre entidades.

### 5.9 IA

A IA usa a memória estruturada do mandato para resumir, cruzar, sugerir e preparar trabalho novo com base em fontes identificáveis.

## 6. Escalabilidade

### 6.1 Milhares de documentos

Para suportar milhares de documentos:

- documentos devem ser entidades próprias;
- relações devem ser por IDs;
- listas devem evoluir para paginação, filtros e índices;
- conteúdo pesado deve ficar separado de metadados;
- pesquisa deve usar índice próprio;
- IA deve consumir excertos/contexto, não listas inteiras.

### 6.2 Vários mandatos

O `mandatoId` deve tornar-se contexto estrutural. Assembleias, dossiês, projetos, compromissos e documentos devem poder ser filtrados por mandato.

Também deve ser possível consultar histórico entre mandatos sem misturar dados ativos com arquivo.

### 6.3 Vários órgãos

O sistema deve suportar diferentes órgãos:

- Assembleia Municipal;
- Assembleia de Freguesia;
- Câmara Municipal;
- outros órgãos ou estruturas institucionais.

Cada assembleia e mandato deve poder ligar-se a um `orgaoId`.

### 6.4 Vários utilizadores

A arquitetura deve prever:

- utilizadores;
- workspaces;
- permissões;
- autoria;
- histórico de alterações;
- partilha por equipa ou gabinete.

Mesmo antes de implementar autenticação, os dados devem evitar pressupor que só existirá um utilizador para sempre.

### 6.5 Futura API

As stores locais devem evoluir naturalmente para uma camada de repositório/API.

Regras para facilitar a migração:

- não acoplar UI diretamente a detalhes de persistência;
- manter funções de leitura/escrita por domínio;
- usar entidades serializáveis;
- evitar dependência de dados derivados;
- usar IDs estáveis.

### 6.6 Futura base de dados

O modelo deve ser compatível com tabelas ou coleções por entidade:

- `mandatos`;
- `assembleias`;
- `pontos`;
- `documentos`;
- `documentosCriados`;
- `dossies`;
- `pessoas`;
- `entidades`;
- `projetos`;
- `compromissos`;
- `eventos`;
- `notas`;
- `atas`.

Relações muitos-para-muitos podem começar como arrays de IDs e evoluir para tabelas de ligação.

### 6.7 Sincronização cloud

Para sincronização futura:

- entidades precisam de `createdAt` e `updatedAt`;
- alterações devem ser explícitas;
- conflitos devem poder ser resolvidos por entidade;
- documentos pesados devem poder ter armazenamento separado;
- dados locais devem poder migrar para conta/cloud sem perda.

## 7. Próximas Fases

### Fase 0 - Consolidar arquitetura antes de crescer

**Objetivo:**  
Reduzir dívida técnica antes de adicionar módulos estruturais.

**Prioridades:**

1. Definir `MASTER_ARCHITECTURE.md` como referência principal.
2. Consolidar uma entidade canónica de `Documento Criado`.
3. Reduzir dependências de `mock-preparacao.ts` nas áreas operacionais.
4. Centralizar tipos repetidos.
5. Criar helper comum para persistência local.
6. Extrair componentes grandes das rotas de ponto e rascunho.
7. Corrigir lint/format numa tarefa isolada.

### Fase 1 - Consolidar Preparação

**Objetivo:**  
Garantir que a preparação de assembleias está robusta, coerente e sem duplicações.

**Inclui:**

- pontos operacionais;
- documentos associados;
- documentos criados;
- editor;
- pré-visualização;
- central de documentos da assembleia;
- stores com responsabilidades claras.

### Fase 2 - Perfil Institucional

**Objetivo:**  
Criar a base institucional usada em documentos, pré-visualização, PDF e IA.

**Inclui:**

- órgão;
- cargo;
- partido/movimento;
- assinatura;
- logótipo;
- contactos;
- tom institucional;
- templates base.

### Fase 3 - Modelo Canónico de Documentos e Exportação

**Objetivo:**  
Transformar rascunhos em documentos finais exportáveis.

**Inclui:**

- layout institucional;
- exportação PDF;
- versões;
- estado final;
- modelo reutilizável por tipo de documento.

### Fase 4 - Sessão

**Objetivo:**  
Criar modo de acompanhamento em tempo real.

**Inclui:**

- notas rápidas;
- intervenções;
- votações;
- decisões;
- compromissos assumidos.

### Fase 5 - Pós-Assembleia e Compromissos

**Objetivo:**  
Consolidar resultados e seguimento.

**Inclui:**

- resultados por ponto;
- atas;
- compromissos;
- respostas pendentes;
- comparação entre preparação e resultado.

### Fase 6 - Dossiês, Pessoas, Entidades e Projetos

**Objetivo:**  
Criar memória temática e institucional do mandato.

**Inclui:**

- dossiês;
- pessoas;
- entidades;
- projetos;
- relações transversais;
- histórico por tema.

### Fase 7 - Pesquisa

**Objetivo:**  
Criar uma camada de conhecimento pesquisável.

**Inclui:**

- pesquisa global;
- filtros;
- resultados por relação;
- índice local inicial;
- preparação para pesquisa semântica.

### Fase 8 - IA

**Objetivo:**  
Adicionar assistência inteligente sobre dados estruturados e pesquisáveis.

**Inclui:**

- resumos;
- sugestões;
- cruzamento de documentos;
- recuperação de histórico;
- geração assistida de documentos;
- fontes e contexto visíveis.

### Fase 9 - API, Base de Dados e Multiutilizador

**Objetivo:**  
Evoluir de aplicação local para plataforma sincronizada.

**Inclui:**

- autenticação;
- workspaces;
- API;
- base de dados;
- permissões;
- sincronização cloud;
- auditoria de alterações.

## 8. Diagrama

```text
                              ┌──────────────────────────┐
                              │        Tribuno 2.0        │
                              │ Plataforma de Mandato     │
                              └─────────────┬────────────┘
                                            │
                     ┌──────────────────────┼──────────────────────┐
                     │                      │                      │
              ┌──────▼──────┐       ┌──────▼──────┐       ┌──────▼──────┐
              │   Mandato   │       │ Perfil do   │       │Administração│
              │             │       │   Eleito    │       │             │
              └──────┬──────┘       └──────┬──────┘       └──────┬──────┘
                     │                     │                     │
     ┌───────────────┼───────────────┐     │                     │
     │               │               │     │                     │
┌────▼─────┐   ┌─────▼────┐   ┌──────▼─────▼──────┐      ┌──────▼──────┐
│Assembleias│   │ Dossiês │   │     Documentos     │      │ Utilizadores│
└────┬─────┘   └─────┬────┘   │ e Docs. Criados    │      │ Permissões  │
     │               │        └─────────┬──────────┘      └─────────────┘
     │               │                  │
┌────▼──────┐  ┌─────▼─────┐     ┌──────▼──────┐
│Preparação │  │ Projetos  │     │  Templates  │
└────┬──────┘  └─────┬─────┘     │ Exportação  │
     │               │           └──────┬──────┘
┌────▼──────┐        │                  │
│  Sessão   │        │                  │
└────┬──────┘        │                  │
     │               │                  │
┌────▼────────┐      │                  │
│Pós-Assembleia│     │                  │
└────┬────────┘      │                  │
     │               │                  │
     └───────┬───────┴──────────┬───────┘
             │                  │
      ┌──────▼──────┐    ┌──────▼──────┐
      │Compromissos │    │Pessoas e    │
      │Seguimento   │    │Entidades    │
      └──────┬──────┘    └──────┬──────┘
             │                  │
             └────────┬─────────┘
                      │
              ┌───────▼───────┐
              │Eventos e Notas│
              └───────┬───────┘
                      │
              ┌───────▼───────┐
              │   Histórico   │
              └───────┬───────┘
                      │
              ┌───────▼───────┐
              │   Pesquisa    │
              └───────┬───────┘
                      │
              ┌───────▼───────┐
              │      IA       │
              │ contexto +    │
              │ sugestões     │
              └───────────────┘
```

## Regra Final

Qualquer nova funcionalidade deve responder a três perguntas antes de ser implementada:

1. Que entidade do domínio estou a criar, alterar ou relacionar?
2. Qual é a store ou módulo responsável por essa entidade?
3. Esta alteração reduz ou aumenta duplicação?

Se a resposta não for clara, a arquitetura deve ser ajustada antes de escrever código funcional.
