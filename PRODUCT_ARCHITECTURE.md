# Tribuno 2.0 - Product Architecture

## 1. Visão geral do produto

Tribuno 2.0 é uma plataforma completa de mandato para eleitos locais. O produto deve apoiar o trabalho político, institucional e operacional ao longo de todo o mandato: antes, durante e depois das assembleias, mas também fora delas, nos dossiês permanentes, compromissos assumidos, relações com pessoas e entidades, gestão documental, histórico político e apoio por IA.

O objetivo é transformar informação dispersa em trabalho acompanhado: documentos, pontos da ordem de trabalhos, intervenções, moções, recomendações, requerimentos, declarações de voto, atas, compromissos, entidades e pessoas devem estar ligados entre si.

A principal unidade de conhecimento do Tribuno é o Dossiê. Um Dossiê representa um tema ou problema acompanhado pelo eleito ao longo do mandato, reunindo toda a informação, decisões, documentos, pessoas, entidades, compromissos e histórico relacionados. As Assembleias alimentam os Dossiês; os Dossiês acompanham o mandato; Pesquisa e IA usam os Dossiês como principal contexto de conhecimento.

A aplicação deve evoluir de forma incremental, sem reescrever o que já funciona. Cada novo módulo deve encaixar nos objetos existentes e reforçar a ideia central: tudo o que acontece no mandato deve poder ser contextualizado, pesquisado, reutilizado e acompanhado.

## 2. Módulos principais

### Mandato

Módulo agregador de todo o período político/institucional. Define o contexto global: eleito, órgão, período temporal, partido/grupo, território, prioridades políticas e entidades relevantes.

Responsabilidades:
- Definir o mandato ativo.
- Agregar assembleias, dossiês, compromissos, documentos e histórico.
- Servir de contexto para pesquisa, IA e perfil institucional.

### Assembleias

Gestão das sessões formais: assembleias municipais, assembleias de freguesia, reuniões de câmara ou outros órgãos.

Responsabilidades:
- Criar e organizar assembleias.
- Guardar data, hora, local, estado e contexto.
- Ligar assembleias a documentos, pontos da ordem de trabalhos, atas, compromissos e dossiês.
- Alimentar Dossiês com pontos, documentos, decisões, intervenções, atas e compromissos.

### Preparação

Área de trabalho antes da sessão. É onde o eleito prepara estratégia, documentos, pontos, perguntas, riscos, intervenções e documentos a criar.

Responsabilidades:
- Organizar documentos recebidos.
- Preparar briefing político da sessão.
- Criar e preparar pontos da ordem de trabalhos.
- Associar documentos a pontos.
- Criar rascunhos de moções, recomendações, requerimentos e declarações de voto.
- Definir prioridades, riscos, notas internas e linha de intervenção.

### Sessão

Modo de acompanhamento durante a assembleia.

Responsabilidades previstas:
- Ver agenda da sessão.
- Consultar rapidamente documentos e notas por ponto.
- Registar intervenções feitas.
- Registar respostas do executivo ou de outras entidades.
- Criar notas de sessão.
- Marcar compromissos assumidos em tempo real.
- Atualizar sentido de voto e estado dos pontos.

### Pós-Assembleia

Área para consolidar o que aconteceu após a sessão.

Responsabilidades previstas:
- Rever atas.
- Registar deliberações.
- Confirmar compromissos assumidos.
- Atualizar histórico dos pontos.
- Finalizar documentos criados.
- Ligar resultados a dossiês e entidades.

### Dossiês

Dossiês são a principal unidade de conhecimento do Tribuno. Representam temas ou problemas acompanhados ao longo do mandato, independentes de uma assembleia específica, mas alimentados por várias assembleias, documentos, decisões, pessoas, entidades, projetos e compromissos.

Exemplos:
- Habitação.
- Centro de Saúde.
- Iluminação Pública.
- Orçamento 2027.
- Mobilidade.
- Obras públicas.

Responsabilidades previstas:
- Agregar documentos, eventos, notas, pessoas, entidades, assembleias e compromissos.
- Manter histórico temático.
- Ajudar a preparar futuras intervenções com memória política acumulada.
- Servir de contexto principal para Pesquisa e IA.

### Pessoas e Entidades

Registo de atores relevantes para o mandato.

Pessoas:
- Eleitos.
- Técnicos.
- Presidentes de junta.
- Membros do executivo.
- Cidadãos ou representantes.
- Contactos institucionais.

Entidades:
- Câmaras.
- Juntas.
- Associações.
- Empresas municipais.
- Escolas.
- IPSS.
- Serviços públicos.

Responsabilidades previstas:
- Ligar pessoas e entidades a documentos, dossiês, compromissos e eventos.
- Registar histórico de interações.
- Ajudar a contextualizar documentos e decisões.

### Documentos

Repositório documental do mandato.

Responsabilidades:
- Guardar documentos recebidos.
- Associar documentos a assembleias, pontos, dossiês, entidades, pessoas e compromissos.
- Permitir análise, classificação, pesquisa e extração de informação.
- Manter relação entre documentos originais e documentos criados pelo eleito.

### Compromissos e Seguimento

Gestão de promessas, tarefas, pedidos, respostas e ações de acompanhamento.

Responsabilidades previstas:
- Criar compromissos a partir de assembleias, pontos, intervenções, atas ou reuniões.
- Definir estado, prazo, responsável e ligação a dossiê.
- Acompanhar pendentes e concluídos.
- Gerar alertas e histórico de seguimento.

### Pesquisa / Conhecimento

Camada transversal para encontrar e reutilizar conhecimento do mandato.

Responsabilidades previstas:
- Pesquisa global por texto, data, tipo, assembleia, ponto, entidade, pessoa e dossiê.
- Navegação por relações entre objetos.
- Histórico temático e institucional.
- Resultados organizados em torno de Dossiês quando existir relação relevante.
- Base para respostas assistidas por IA.

### IA

Camada assistiva e contextual, não substitutiva.

Responsabilidades previstas:
- Resumir documentos.
- Identificar riscos, contradições, prazos e valores.
- Sugerir perguntas e linhas de intervenção.
- Gerar primeiros rascunhos de documentos.
- Comparar documentos e atas.
- Recuperar histórico relevante.
- Ajudar a preparar dossiês e compromissos.
- Usar Dossiês como principal contexto de conhecimento para resumir, relacionar e explicar informação.

### Perfil Institucional

Configuração da identidade política e institucional do eleito.

Responsabilidades previstas:
- Dados do eleito, partido/grupo, órgão e território.
- Tom e estilo de comunicação.
- Assinaturas e cabeçalhos institucionais.
- Templates preferenciais.
- Regras de linguagem e posicionamento.

## 3. Objetos principais do sistema

### Mandato

Representa o período completo de exercício político.

Campos previstos:
- id
- título
- período
- eleito
- órgão
- território
- prioridades
- estado

### Assembleia

Sessão formal do órgão.

Campos atuais/previstos:
- id
- mandatoId
- nome
- data
- hora
- local
- estado
- documentos
- pontos
- ata

### Ponto da Ordem de Trabalhos

Unidade operacional de preparação e acompanhamento de uma assembleia.

Campos atuais/previstos:
- id
- assembleiaId
- número
- título
- resumo
- estado
- prioridade
- objetivo político
- riscos
- linha de intervenção
- notas internas
- documentos associados
- documentos criados
- compromissos
- sentido de voto

### Documento

Documento recebido ou importado.

Campos previstos:
- id
- assembleiaId
- dossieId
- tipo
- título
- data
- ficheiro
- estado
- notas
- entidades relacionadas
- pessoas relacionadas

### Documento Criado

Documento produzido pelo eleito ou equipa.

Campos atuais/previstos:
- id
- assembleiaId
- pontoId
- tipo
- título
- conteúdo
- estado
- versão
- origem
- perfil institucional usado

### Moção

Tipo de documento criado com proposta política formal.

Relações:
- é um Documento Criado.
- pode ligar-se a ponto, assembleia, dossiê, entidade ou compromisso.

### Recomendação

Tipo de documento criado com proposta/recomendação ao executivo ou entidade.

Relações:
- é um Documento Criado.
- pode gerar compromissos de seguimento.

### Requerimento

Tipo de documento criado para solicitar informação, documentos ou esclarecimentos.

Relações:
- é um Documento Criado.
- pode originar respostas, prazos e compromissos.

### Declaração de voto

Tipo de documento criado para justificar sentido de voto.

Relações:
- é um Documento Criado.
- liga-se a ponto, deliberação e ata.

### Intervenção

Texto ou guião usado em sessão.

Relações:
- pode ser Documento Criado ou objeto próprio.
- liga-se a ponto, sessão e histórico.

### Pessoa

Ator individual relevante para o mandato.

Relações:
- pode ligar-se a entidades, compromissos, eventos, documentos e dossiês.

### Entidade

Organização pública, privada ou comunitária relevante.

Relações:
- pode ligar-se a pessoas, documentos, dossiês, compromissos e eventos.

### Dossiê

Tema ou problema acompanhado ao longo do mandato. É a principal unidade de conhecimento do Tribuno.

Relações:
- agrega assembleias, pontos, documentos, pessoas, entidades, compromissos, eventos e notas.

Exemplos:
- Habitação.
- Centro de Saúde.
- Iluminação Pública.
- Orçamento 2027.

### Compromisso

Promessa, tarefa, pedido ou ação de seguimento.

Campos previstos:
- id
- título
- descrição
- estado
- prazo
- responsável
- origem
- dossieId
- assembleiaId
- pontoId

### Evento

Ocorrência relevante fora ou dentro de assembleias.

Exemplos:
- reunião
- visita
- resposta recebida
- prazo
- deliberação
- contacto

### Nota

Apontamento livre ou estruturado.

Relações:
- pode ligar-se a qualquer objeto relevante.

### Ata

Documento oficial pós-sessão.

Relações:
- liga-se a assembleia.
- pode confirmar deliberações, intervenções, votos e compromissos.

## 4. Relações entre objetos

Relações principais:

- Um Mandato tem muitas Assembleias.
- Um Mandato tem muitos Dossiês.
- Um Mandato tem muitos Documentos, Pessoas, Entidades, Compromissos e Eventos.
- Uma Assembleia tem muitos Pontos da Ordem de Trabalhos.
- Uma Assembleia tem muitos Documentos.
- Uma Assembleia pode ter uma Ata.
- Uma Assembleia alimenta Dossiês através de pontos, documentos, decisões, intervenções, atas e compromissos.
- Um Ponto pertence a uma Assembleia.
- Um Ponto pode ter muitos Documentos associados.
- Um Ponto pode ter muitos Documentos Criados.
- Um Documento Criado pode ser Moção, Recomendação, Requerimento, Declaração de voto ou Intervenção.
- Um Documento Criado pode estar associado a um Ponto ou ser geral da Assembleia.
- Um Dossiê pode agregar Pontos de várias Assembleias.
- Um Dossiê pode agregar Documentos, Documentos Criados, Pessoas, Entidades, Eventos, Notas e Compromissos.
- Um Dossiê acompanha o mandato e preserva o contexto principal para Pesquisa e IA.
- Uma Pessoa pode pertencer ou estar ligada a uma Entidade.
- Pessoas e Entidades podem ser referidas por Documentos, Dossiês, Eventos e Compromissos.
- Um Compromisso pode nascer de uma Assembleia, Ponto, Documento Criado, Ata, Evento ou Nota.
- Uma Nota deve poder ligar-se a qualquer objeto.

Regra conceptual:

Tudo deve poder ligar-se a tudo quando fizer sentido, mas a implementação deve manter relações explícitas e simples. Evitar relações mágicas ou implícitas que dificultem manutenção.

## 5. Fluxo completo

### Antes da assembleia

1. Criar ou selecionar assembleia.
2. Carregar documentos recebidos.
3. Organizar pontos da ordem de trabalhos.
4. Associar documentos aos pontos.
5. Preparar briefing geral da sessão.
6. Preparar cada ponto:
   - resumo
   - objetivo político
   - riscos
   - linha de intervenção
   - notas internas
   - documentos associados
   - documentos a criar
7. Criar rascunhos:
   - moções
   - recomendações
   - requerimentos
   - declarações de voto
   - intervenções
8. Rever dashboard de preparação.

### Durante a assembleia

1. Abrir modo sessão.
2. Consultar pontos, documentos e notas.
3. Registar intervenções realizadas.
4. Atualizar sentido de voto.
5. Registar respostas e compromissos assumidos.
6. Criar notas rápidas.
7. Marcar tarefas pendentes.

### Depois da assembleia

1. Rever o que aconteceu por ponto.
2. Confirmar deliberações e votos.
3. Associar ata quando disponível.
4. Atualizar estado dos documentos criados.
5. Converter respostas e promessas em compromissos.
6. Ligar pontos, documentos, decisões e compromissos aos Dossiês relevantes.
7. Fechar ou manter em acompanhamento os pontos relevantes.

### Acompanhamento ao longo do mandato

1. Acompanhar compromissos pendentes.
2. Atualizar Dossiês permanentes.
3. Pesquisar histórico de decisões, documentos e intervenções.
4. Reutilizar conhecimento acumulado em novas assembleias.
5. Medir evolução de Dossiês e compromissos.
6. Preparar nova ação política com base no histórico.

## 6. Regras de arquitetura

- Rotas simples, cada uma com responsabilidade clara.
- Componentes pequenos e extraíveis quando a rota começa a crescer.
- Stores separadas por domínio:
  - assembleias
  - documentos
  - pontos
  - documentos criados
  - dossiês
  - pessoas/entidades
  - compromissos
  - perfil institucional
- Objetos reutilizáveis e estáveis.
- Tudo deve poder ligar-se a tudo através de relações explícitas.
- Evitar duplicações de fluxos e dados.
- Não criar uma segunda forma de fazer algo que já existe.
- Não reescrever o que já funciona.
- Não misturar IA, PDF, pesquisa e histórico em mudanças pequenas de UI.
- Preferir evolução incremental.
- Manter stores locais simples enquanto não existir backend.
- Preparar os modelos para futura persistência remota.
- Evitar ficheiros gigantes.
- Separar lógica de persistência, componentes de UI e rotas.
- Preservar compatibilidade com Lovable e não reescrever histórico Git publicado.

## 7. Próximas prioridades técnicas recomendadas

1. Consolidar o modelo `Documento Criado`.
   - Suportar documento associado a ponto.
   - Suportar documento geral da assembleia.
   - Preparar ligação futura a dossiê.

2. Extrair componentes grandes das rotas de ponto e editor.
   - Dashboard do ponto.
   - Documentos associados.
   - Documentos a criar.
   - Editor de rascunho.
   - Pré-visualização institucional.

3. Criar stores futuras por domínio.
   - `dossies-store.ts`
   - `pessoas-store.ts`
   - `entidades-store.ts`
   - `compromissos-store.ts`
   - `perfil-institucional-store.ts`

4. Criar módulo de compromissos.
   - Compromissos por ponto.
   - Compromissos por assembleia.
   - Estados e prazos.
   - Dashboard de pendentes.

5. Criar modelo de dossiês.
   - Ligação de documentos, pontos, assembleias, pessoas, entidades e compromissos.
   - Dossiês como principal contexto de Pesquisa e IA.

6. Preparar pesquisa global.
   - Primeiro local e simples.
   - Depois indexada/assistida.

7. Preparar templates de documentos.
   - Moção.
   - Recomendação.
   - Requerimento.
   - Declaração de voto.
   - Intervenção.

8. Preparar perfil institucional.
   - Dados do eleito.
   - Órgão.
   - Grupo/partido.
   - Assinatura.
   - Tom e estilo.

9. Implementar IA apenas depois de consolidar dados e relações.
   - A IA deve consumir contexto estruturado.
   - A IA não deve substituir stores nem criar dados duplicados.

10. Implementar exportação PDF apenas depois de estabilizar templates e pré-visualização.
