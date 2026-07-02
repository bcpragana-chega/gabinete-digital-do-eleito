# Tribuno 2.0 - Domain Objects

Este documento define os objetos fundamentais do Tribuno. Estes objetos devem orientar o modelo mental do produto, a organização dos dados e a construção dos Workspaces.

O Tribuno deve tratar o mandato como uma rede de conhecimento e ação. Cada objeto existe para capturar uma parte essencial dessa rede: temas, responsabilidades, iniciativas, pessoas e instituições.

## 1. Dossiê

### Porque existe

Um Dossiê existe para representar um tema ou problema acompanhado pelo eleito ao longo do mandato.

É a principal unidade de conhecimento do Tribuno. Reúne informação, decisões, documentos, pessoas, entidades, compromissos, projetos e histórico relacionados com uma matéria relevante do mandato.

Um Dossiê não é uma pasta nem uma etiqueta. É um workspace de memória, acompanhamento e decisão.

### Que problema resolve

Sem Dossiês, a informação fica presa ao momento em que apareceu:

- um ponto fica fechado numa assembleia;
- um documento fica isolado;
- um compromisso perde contexto;
- uma pessoa aparece sem histórico relacionado;
- uma decisão anterior não é recuperada quando volta a ser relevante.

O Dossiê resolve este problema ao ligar acontecimentos dispersos numa mesma linha de conhecimento e acompanhamento.

As Assembleias alimentam os Dossiês através dos seus pontos, documentos, atas, intervenções, decisões e compromissos. Os Dossiês acompanham o mandato e acumulam memória ao longo do tempo.

### Relações possíveis

Um Dossiê pode ligar-se a:

- assembleias;
- pontos da ordem de trabalhos;
- documentos;
- documentos criados;
- notas;
- compromissos;
- projetos;
- pessoas;
- entidades;
- eventos;
- intervenções;
- atas;
- outros dossiês relacionados.

### Exemplos reais

- Habitação.
- Centro de Saúde.
- Iluminação Pública.
- Orçamento 2027.
- Mobilidade urbana.
- Saneamento numa freguesia.
- Apoio ao associativismo.
- Proteção civil.

### Como será apresentado num Workspace

O Workspace de Dossiê deve funcionar como uma página de memória, acompanhamento e decisão.

Deve mostrar:

- resumo do dossiê;
- estado atual;
- importância política ou institucional;
- documentos relacionados;
- pontos de assembleia onde surgiu;
- compromissos em aberto;
- projetos associados;
- pessoas e entidades relevantes;
- histórico cronológico;
- notas do eleito;
- perguntas em aberto;
- próximas ações;
- Assistente contextual.

Exemplo de estrutura:

- Contexto: nome do dossiê, descrição, território e origem.
- Estado: ativo, em acompanhamento, crítico, resolvido ou arquivado.
- Próximas ações: preparar intervenção, pedir esclarecimento, associar documento, criar compromisso.
- Workspace: timeline, notas, documentos e relações.
- Assistente: resumo do histórico, riscos, argumentos e pendentes.
- Histórico: assembleias, decisões, documentos e alterações relevantes.

## 2. Compromisso

### Porque existe

Um Compromisso existe para transformar afirmações, pedidos, promessas, respostas esperadas e tarefas de seguimento em objetos acompanháveis.

No trabalho autárquico, muita responsabilidade nasce de frases ditas em reunião, respostas prometidas, documentos pedidos ou decisões que exigem acompanhamento. O Compromisso dá forma a essa continuidade.

### Que problema resolve

Sem Compromissos, o eleito perde facilmente:

- quem ficou de responder;
- qual era o prazo;
- onde nasceu o pedido;
- que dossiê ou tema motivou a ação;
- se a resposta chegou;
- que seguimento ainda falta.

O Compromisso resolve a passagem entre decisão, responsabilidade e acompanhamento.

### Relações possíveis

Um Compromisso pode ligar-se a:

- dossiê;
- assembleia;
- ponto;
- documento;
- documento criado;
- ata;
- intervenção;
- projeto;
- pessoa responsável;
- entidade responsável;
- evento;
- nota;
- histórico de seguimento.

### Exemplos reais

- Executivo comprometeu-se a enviar o cronograma de uma obra.
- Pedido de esclarecimento sobre execução orçamental.
- Recomendação aprovada que exige resposta da câmara.
- Promessa de reunião com moradores.
- Pedido de envio de relatório técnico.
- Acompanhamento de uma intervenção sobre iluminação pública.

### Como será apresentado num Workspace

O Workspace de Compromisso deve ser operacional e orientado para seguimento.

Deve mostrar:

- título e descrição;
- origem do compromisso;
- estado;
- prazo;
- responsável;
- dossiê ou projeto relacionado;
- documentos e evidências;
- notas de acompanhamento;
- próximas ações;
- histórico de alterações.

Exemplo de estrutura:

- Contexto: de onde nasceu, em que dossiê se insere e quem está envolvido.
- Estado: aberto, a aguardar resposta, em curso, concluído ou arquivado.
- Próximas ações: atualizar estado, registar resposta, adicionar nota, marcar como concluído.
- Workspace: descrição, evidências, notas e ligações.
- Assistente: identificar pendentes, sugerir mensagem de seguimento, resumir histórico.
- Histórico: criação, alterações de estado, respostas e contactos.

## 3. Projeto

### Porque existe

Um Projeto existe para representar uma iniciativa concreta com evolução própria.

Pode ser uma obra, política pública, programa, equipamento, processo administrativo ou medida que tenha fases, responsáveis, documentos, prazos e impacto no território.

### Que problema resolve

Sem Projetos, iniciativas concretas ficam misturadas com dossiês amplos.

Por exemplo, `Mobilidade` pode ser um Dossiê, mas `Requalificação da EN125 no concelho` ou `Novo plano de transportes escolares` são Projetos. O Projeto permite acompanhar execução, prazos, entidades responsáveis e evidências.

### Relações possíveis

Um Projeto pode ligar-se a:

- dossiê;
- assembleias;
- pontos;
- documentos;
- compromissos;
- pessoas;
- entidades;
- eventos;
- notas;
- intervenções;
- atas;
- território;
- outros projetos relacionados.

### Exemplos reais

- Construção de um centro de saúde.
- Requalificação de uma escola.
- Plano municipal de mobilidade.
- Obra de saneamento numa freguesia.
- Criação de um regulamento municipal.
- Reabilitação de um mercado.
- Programa de apoio ao associativismo.

### Como será apresentado num Workspace

O Workspace de Projeto deve mostrar evolução, responsabilidade e evidência.

Deve mostrar:

- objetivo do projeto;
- estado de execução;
- fase atual;
- prazos;
- entidade responsável;
- pessoas envolvidas;
- documentos técnicos;
- compromissos ligados;
- eventos ou reuniões;
- riscos;
- histórico;
- próximos passos.

Exemplo de estrutura:

- Contexto: objetivo, território, dossiê associado e entidade responsável.
- Estado: planeado, em curso, atrasado, concluído, suspenso ou arquivado.
- Próximas ações: pedir ponto de situação, associar documento, criar compromisso, preparar intervenção.
- Workspace: fases, documentos, notas, compromissos e riscos.
- Assistente: resumir evolução, comparar promessas com execução, levantar perguntas.
- Histórico: reuniões, decisões, documentos e alterações de estado.

## 4. Pessoa

### Porque existe

Uma Pessoa existe para representar um ator individual relevante para o mandato.

O trabalho autárquico depende de relações humanas: eleitos, técnicos, presidentes de junta, representantes associativos, cidadãos, membros do executivo, assessores e responsáveis por serviços.

### Que problema resolve

Sem Pessoas como objetos próprios, o Tribuno perde a dimensão relacional do mandato.

Informação importante fica dispersa:

- quem participou numa reunião;
- quem assumiu uma responsabilidade;
- quem representa uma entidade;
- quem aparece recorrentemente num dossiê;
- que histórico de interações existe com essa pessoa.

### Relações possíveis

Uma Pessoa pode ligar-se a:

- entidades;
- cargos;
- dossiês;
- projetos;
- compromissos;
- assembleias;
- pontos;
- documentos;
- eventos;
- notas;
- intervenções;
- histórico de interações.

### Exemplos reais

- Presidente da Câmara.
- Vereador responsável pelo urbanismo.
- Presidente de junta.
- Técnico municipal.
- Diretor de escola.
- Representante de associação local.
- Morador que apresentou uma exposição.
- Responsável de empresa municipal.

### Como será apresentado num Workspace

O Workspace de Pessoa deve mostrar identidade, papel e histórico de relação.

Deve mostrar:

- nome;
- cargo;
- entidade associada;
- contactos, quando aplicável;
- dossiês relacionados;
- projetos ligados;
- compromissos onde é responsável ou participante;
- documentos onde é mencionada;
- eventos e reuniões;
- notas;
- histórico de interações.

Exemplo de estrutura:

- Contexto: quem é, que cargo tem e a que entidade pertence.
- Estado: relação ativa, contacto pendente, responsável por compromisso ou apenas referência.
- Próximas ações: registar contacto, associar a dossiê, criar compromisso, adicionar nota.
- Workspace: perfil, relações, notas e documentos.
- Assistente: resumir histórico de interação e temas associados.
- Histórico: reuniões, documentos, compromissos e contactos.

## 5. Entidade

### Porque existe

Uma Entidade existe para representar uma organização relevante para o mandato.

Pode ser um órgão autárquico, serviço municipal, junta de freguesia, associação, escola, IPSS, empresa municipal, organismo público ou empresa externa envolvida em dossiês do território.

### Que problema resolve

Sem Entidades, o Tribuno não consegue organizar responsabilidade institucional.

Fica difícil perceber:

- quem é responsável por uma resposta;
- que documentos vieram de que organização;
- que pessoas pertencem a cada entidade;
- que compromissos dependem de uma instituição;
- que histórico existe entre o eleito e uma organização.

### Relações possíveis

Uma Entidade pode ligar-se a:

- pessoas;
- dossiês;
- projetos;
- compromissos;
- assembleias;
- pontos;
- documentos;
- documentos criados;
- eventos;
- notas;
- território;
- outras entidades.

### Exemplos reais

- Câmara Municipal.
- Assembleia Municipal.
- Junta de Freguesia.
- Associação de moradores.
- Associação desportiva.
- Escola pública.
- Empresa municipal.
- IPSS local.
- Comissão de coordenação regional.
- Serviço municipal de proteção civil.

### Como será apresentado num Workspace

O Workspace de Entidade deve mostrar papel institucional, relações e responsabilidades.

Deve mostrar:

- nome;
- tipo;
- território;
- pessoas associadas;
- dossiês relacionados;
- projetos sob responsabilidade ou influência;
- documentos emitidos ou recebidos;
- compromissos pendentes;
- eventos e reuniões;
- notas;
- histórico de interação.

Exemplo de estrutura:

- Contexto: tipo de entidade, território e papel no mandato.
- Estado: relação ativa, pendências, documentos recentes ou compromissos em aberto.
- Próximas ações: contactar, associar documento, criar compromisso, registar reunião.
- Workspace: perfil institucional, pessoas, documentos e relações.
- Assistente: resumir pendências, documentos recentes e histórico da entidade.
- Histórico: reuniões, respostas, documentos, compromissos e decisões.

## Porque o Dossiê é a unidade principal de conhecimento

O Dossiê deve ser considerado a unidade principal de conhecimento do Tribuno porque é o objeto que melhor representa a continuidade real do mandato.

Assembleias são momentos. Documentos são evidências. Compromissos são ações. Projetos são iniciativas concretas. Pessoas e Entidades são atores. O Dossiê é a camada que liga tudo isto numa memória utilizável.

Um mesmo Dossiê pode atravessar:

- várias assembleias;
- vários documentos;
- vários compromissos;
- vários projetos;
- várias pessoas;
- várias entidades;
- várias decisões;
- vários meses ou anos de mandato.

Isto torna o Dossiê essencial para:

- recuperar contexto quando um tema volta a aparecer;
- evitar repetição de análise;
- ligar decisões antigas a problemas atuais;
- preparar intervenções com memória acumulada;
- perceber relações entre documentos, pessoas, projetos e compromissos;
- alimentar Pesquisa e IA com o principal contexto de conhecimento;
- transformar informação dispersa em conhecimento político.

### Diferença entre Dossiê, Projeto e Compromisso

- Dossiê: tema ou problema contínuo de conhecimento e acompanhamento.
- Projeto: iniciativa concreta com execução própria.
- Compromisso: ação, promessa, pedido ou responsabilidade acompanhável.

Exemplo:

- Dossiê: `Mobilidade urbana`.
- Projeto: `Plano municipal de mobilidade`.
- Compromisso: `Executivo envia cronograma do plano até ao fim do mês`.

O Dossiê é principal porque organiza o significado, o histórico e a ação. Ele permite que o Tribuno deixe de ser apenas um arquivo de documentos ou uma lista de tarefas e passe a ser uma memória ativa do mandato.
