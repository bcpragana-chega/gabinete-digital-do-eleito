# Tribuno 2.0 - Data Model

Este documento define o modelo de dados alvo do Tribuno 2.0 como plataforma completa de mandato. O modelo deve evoluir de forma incremental, mantendo compatibilidade com os dados e stores locais já existentes.

## 1. Princípios gerais

- Usar IDs para relações entre objetos.
- Evitar duplicação de dados.
- Permitir ligações múltiplas entre objetos.
- Manter compatibilidade com o que já existe.
- Preparar futura base de dados real.
- Preparar futura IA e pesquisa semântica.
- Tratar Dossiês como principal unidade de conhecimento do mandato.
- Separar objetos permanentes de estados temporários de UI.
- Guardar metadados suficientes para histórico, auditoria e pesquisa.

## 2. Entidades principais

### Mandato

Representa um ciclo político completo.

Campos principais:
- `id`
- `titulo`
- `dataInicio`
- `dataFim`
- `orgaoId`
- `eleitoPrincipalId`
- `territorio`
- `estado`
- `prioridades`

Relações:
- Tem muitas assembleias.
- Tem muitos dossiês.
- Tem muitas pessoas e entidades relacionadas.
- Tem muitos documentos, compromissos, eventos e notas.

Exemplos práticos:
- Mandato 2025-2029 na Assembleia Municipal.
- Mandato 2021-2025 na Assembleia de Freguesia.

### Órgão

Representa o órgão autárquico ou institucional.

Campos principais:
- `id`
- `nome`
- `tipo`
- `territorio`
- `morada`
- `contactos`

Relações:
- Pode ter vários mandatos.
- Tem assembleias.
- Relaciona-se com pessoas e entidades.

Exemplos práticos:
- Assembleia Municipal de Lagoa.
- Assembleia de Freguesia de Porches.
- Câmara Municipal.

### Assembleia

Representa uma sessão formal.

Campos principais:
- `id`
- `mandatoId`
- `orgaoId`
- `nome`
- `data`
- `hora`
- `local`
- `estado`
- `ataId`

Relações:
- Pertence a um mandato.
- Pertence a um órgão.
- Tem muitos pontos da ordem de trabalhos.
- Tem muitos documentos.
- Pode ter uma ata.
- Pode gerar compromissos, eventos e notas.

Exemplos práticos:
- Assembleia Municipal Ordinária de 15 de julho.
- Sessão extraordinária sobre orçamento.

### Ponto da Ordem de Trabalhos

Representa um ponto específico de uma assembleia.

Campos principais:
- `id`
- `assembleiaId`
- `numero`
- `titulo`
- `resumo`
- `estado`
- `prioridade`
- `objetivoPolitico`
- `riscos`
- `linhaIntervencao`
- `notasInternas`
- `sentidoVoto`

Relações:
- Pertence a uma assembleia.
- Pode ter documentos associados.
- Pode gerar documentos criados.
- Pode ligar-se a dossiês.
- Pode gerar compromissos.
- Pode ter notas e eventos.

Exemplos práticos:
- Ponto 3: Discussão e votação do orçamento.
- Ponto 7: Regulamento municipal de apoio ao associativismo.

### Documento

Representa um documento recebido, carregado ou referenciado.

Campos principais:
- `id`
- `titulo`
- `tipo`
- `data`
- `estado`
- `ficheiroNome`
- `ficheiroTipo`
- `paginas`
- `notas`

Relações:
- Pode pertencer a uma assembleia.
- Pode estar associado a pontos.
- Pode ligar-se a dossiês.
- Pode referir pessoas e entidades.
- Pode originar documentos criados ou compromissos.

Exemplos práticos:
- Convocatória.
- Ata da sessão anterior.
- Relatório de execução orçamental.
- Proposta do executivo.

### Documento Criado

Representa um documento produzido pelo eleito ou equipa.

Campos principais:
- `id`
- `tipo`
- `titulo`
- `conteudo`
- `estado`
- `assembleiaId`
- `pontoId`
- `dossieIds`
- `pessoaIds`
- `entidadeIds`
- `createdAt`
- `updatedAt`

Relações:
- Pode estar ligado a ponto, assembleia, dossiê, pessoa ou entidade.
- Pode originar compromissos.
- Pode ter versões futuras.

Exemplos práticos:
- Rascunho de moção sobre mobilidade.
- Requerimento para pedir documentação técnica.
- Declaração de voto sobre orçamento.

### Moção

Especialização de Documento Criado.

Campos principais:
- Campos de Documento Criado.
- `fundamentacao`
- `propostaDeliberacao`

Relações:
- Liga-se a assembleia e, opcionalmente, a ponto.
- Pode ligar-se a dossiês, pessoas e entidades.
- Pode originar compromissos.

Exemplos práticos:
- Moção pela transparência na execução do PPI.

### Recomendação

Especialização de Documento Criado.

Campos principais:
- Campos de Documento Criado.
- `destinatario`
- `recomendacao`

Relações:
- Pode gerar compromissos de seguimento.
- Pode ligar-se a entidade destinatária.

Exemplos práticos:
- Recomendação para reforço da iluminação pública.

### Requerimento

Especialização de Documento Criado.

Campos principais:
- Campos de Documento Criado.
- `pedido`
- `prazoResposta`
- `destinatario`

Relações:
- Pode gerar compromisso de resposta.
- Pode ligar-se a documentos recebidos posteriormente.

Exemplos práticos:
- Requerimento para acesso a parecer técnico.

### Declaração de Voto

Especialização de Documento Criado.

Campos principais:
- Campos de Documento Criado.
- `sentidoVoto`
- `fundamentacao`

Relações:
- Liga-se a ponto e ata.
- Pode ligar-se a deliberação.

Exemplos práticos:
- Declaração de voto contra determinada proposta.

### Intervenção

Texto de intervenção ou guião de fala.

Campos principais:
- `id`
- `titulo`
- `conteudo`
- `assembleiaId`
- `pontoId`
- `estado`
- `createdAt`
- `updatedAt`

Relações:
- Pode estar ligada a ponto e assembleia.
- Pode ligar-se a documentos, dossiês, pessoas e entidades.
- Pode originar evento ou compromisso.

Exemplos práticos:
- Intervenção sobre execução do orçamento.

### Nota

Apontamento livre ou estruturado.

Campos principais:
- `id`
- `titulo`
- `conteudo`
- `tipo`
- `createdAt`
- `updatedAt`
- `links`

Relações:
- Pode ligar-se a qualquer entidade principal.
- Pode estar associada a assembleia, ponto, dossiê, pessoa, entidade, documento ou compromisso.

Exemplos práticos:
- Nota interna sobre risco político.
- Nota de reunião com associação local.

### Dossiê

Principal unidade de conhecimento do Tribuno. Representa um tema ou problema acompanhado pelo eleito ao longo do mandato, reunindo informação, decisões, documentos, pessoas, entidades, compromissos, projetos e histórico relacionados.

Campos principais:
- `id`
- `mandatoId`
- `titulo`
- `descricao`
- `estado`
- `prioridade`
- `tags`

Relações:
- Pode agrupar documentos, pontos, pessoas, entidades, compromissos e eventos.
- Pode estar ligado a várias assembleias.
- É alimentado por assembleias, pontos, atas, documentos, intervenções, decisões e compromissos.
- Serve de principal contexto de conhecimento para Pesquisa e IA.
- Pode gerar documentos criados.

Exemplos práticos:
- Dossiê Habitação.
- Dossiê Centro de Saúde.
- Dossiê Iluminação Pública.
- Dossiê Orçamento 2027.
- Dossiê Mobilidade.

### Pessoa

Ator individual relevante.

Campos principais:
- `id`
- `nome`
- `cargo`
- `contactos`
- `entidadeIds`
- `notas`

Relações:
- Pode estar ligada a entidades.
- Pode estar ligada a assembleias, documentos, dossiês e compromissos.
- Pode participar em eventos.

Exemplos práticos:
- Presidente da Câmara.
- Técnico municipal.
- Representante de associação.

### Entidade

Organização relevante.

Campos principais:
- `id`
- `nome`
- `tipo`
- `territorio`
- `contactos`
- `notas`

Relações:
- Pode ter pessoas associadas.
- Pode estar ligada a assembleias, documentos, dossiês e compromissos.
- Pode ser destinatária de requerimento ou recomendação.

Exemplos práticos:
- Câmara Municipal.
- Junta de Freguesia.
- Associação local.
- Empresa municipal.

### Compromisso

Promessa, tarefa, pedido, resposta esperada ou ação de seguimento.

Campos principais:
- `id`
- `titulo`
- `descricao`
- `estado`
- `prazo`
- `responsavelPessoaId`
- `responsavelEntidadeId`
- `origem`
- `createdAt`
- `updatedAt`

Relações:
- Pode nascer de recomendação, requerimento, moção ou ata.
- Pode ligar-se a assembleia, ponto, dossiê, pessoa, entidade e evento.

Exemplos práticos:
- Executivo comprometeu-se a enviar cronograma.
- Pedido de resposta a requerimento até determinada data.

### Evento

Ocorrência relevante no mandato.

Campos principais:
- `id`
- `titulo`
- `tipo`
- `data`
- `descricao`
- `local`
- `participantesPessoaIds`
- `entidadeIds`

Relações:
- Pode ligar-se a assembleias, pontos, dossiês, documentos e compromissos.
- Pode gerar notas ou compromissos.

Exemplos práticos:
- Reunião com moradores.
- Visita a obra.
- Resposta recebida de entidade.

### Ata

Documento oficial pós-sessão.

Campos principais:
- `id`
- `assembleiaId`
- `documentoId`
- `estado`
- `resumo`
- `deliberacoes`

Relações:
- Pertence a uma assembleia.
- Pode confirmar deliberações e compromissos.
- Pode ligar-se a pontos e declarações de voto.

Exemplos práticos:
- Ata aprovada da Assembleia Municipal de 15 de julho.

## 3. Relações obrigatórias

- Assembleia tem muitos pontos.
- Assembleia tem muitos documentos.
- Ponto pertence a uma Assembleia.
- Ponto pode ter documentos associados.
- Ponto pode gerar documentos criados.
- Documento Criado pode estar ligado a ponto, assembleia, dossiê, pessoa ou entidade.
- Dossiê pode agrupar documentos, pontos, pessoas, entidades, compromissos e eventos.
- Assembleias alimentam Dossiês através de pontos, documentos, atas, intervenções, decisões e compromissos.
- Pesquisa e IA usam Dossiês como principal contexto de conhecimento.
- Compromisso pode nascer de recomendação, requerimento, moção ou ata.
- Pessoa/Entidade pode estar ligada a assembleias, documentos, dossiês e compromissos.

## 4. Tipos TypeScript sugeridos

```ts
type ID = string;

type EstadoAssembleia = "preparacao" | "sessao" | "pos-assembleia" | "concluida" | "arquivada";
type EstadoPonto = "Por preparar" | "Em preparação" | "Preparado" | "Concluído";
type EstadoDocumentoCriado = "rascunho" | "em revisão" | "final";
type TipoDocumentoCriado =
  | "Moção"
  | "Recomendação"
  | "Requerimento"
  | "Declaração de voto"
  | "Intervenção";

interface Mandato {
  id: ID;
  titulo: string;
  dataInicio: string;
  dataFim?: string;
  orgaoId: ID;
  eleitoPrincipalId?: ID;
  territorio?: string;
  estado: "ativo" | "concluido" | "arquivado";
  prioridades: string[];
}

interface Orgao {
  id: ID;
  nome: string;
  tipo: "Assembleia Municipal" | "Assembleia de Freguesia" | "Câmara Municipal" | "Outro";
  territorio?: string;
  morada?: string;
  contactos?: string;
}

interface Assembleia {
  id: ID;
  mandatoId?: ID;
  orgaoId?: ID;
  nome: string;
  data: string;
  hora?: string;
  local?: string;
  estado: EstadoAssembleia;
  ataId?: ID;
  documentoIds: ID[];
  pontoIds: ID[];
}

interface PontoOrdemTrabalhos {
  id: ID;
  assembleiaId: ID;
  numero: number;
  titulo: string;
  resumo: string;
  estado: EstadoPonto;
  prioridade?: "Alta" | "Média" | "Baixa";
  objetivoPolitico?: string;
  riscos?: string;
  linhaIntervencao?: string;
  notasInternas?: string;
  sentidoVoto?: "A favor" | "Contra" | "Abstenção" | "Livre" | "Por decidir";
  documentoIds: ID[];
  documentoCriadoIds: ID[];
  compromissoIds: ID[];
  dossieIds: ID[];
}

interface Documento {
  id: ID;
  titulo: string;
  tipo: string;
  data?: string;
  estado?: string;
  ficheiroNome?: string;
  ficheiroTipo?: string;
  paginas?: number;
  notas?: string;
  assembleiaIds: ID[];
  pontoIds: ID[];
  dossieIds: ID[];
  pessoaIds: ID[];
  entidadeIds: ID[];
}

interface DocumentoCriado {
  id: ID;
  tipo: TipoDocumentoCriado;
  titulo: string;
  conteudo: string;
  estado: EstadoDocumentoCriado;
  assembleiaId?: ID;
  pontoId?: ID;
  dossieIds: ID[];
  pessoaIds: ID[];
  entidadeIds: ID[];
  compromissoIds: ID[];
  createdAt: string;
  updatedAt?: string;
}

interface Nota {
  id: ID;
  titulo?: string;
  conteudo: string;
  tipo?: "interna" | "sessao" | "seguimento" | "livre";
  links: EntityLink[];
  createdAt: string;
  updatedAt?: string;
}

interface Dossie {
  id: ID;
  mandatoId?: ID;
  titulo: string;
  descricao?: string;
  estado: "ativo" | "em acompanhamento" | "concluido" | "arquivado";
  prioridade?: "Alta" | "Média" | "Baixa";
  tags: string[];
  documentoIds: ID[];
  pontoIds: ID[];
  pessoaIds: ID[];
  entidadeIds: ID[];
  compromissoIds: ID[];
  projetoIds?: ID[];
  eventoIds: ID[];
  resumoConhecimento?: string;
  historicoIds?: ID[];
}

interface Pessoa {
  id: ID;
  nome: string;
  cargo?: string;
  contactos?: string;
  entidadeIds: ID[];
  assembleiaIds: ID[];
  documentoIds: ID[];
  dossieIds: ID[];
  compromissoIds: ID[];
  notas?: string;
}

interface Entidade {
  id: ID;
  nome: string;
  tipo?: string;
  territorio?: string;
  contactos?: string;
  pessoaIds: ID[];
  assembleiaIds: ID[];
  documentoIds: ID[];
  dossieIds: ID[];
  compromissoIds: ID[];
  notas?: string;
}

interface Compromisso {
  id: ID;
  titulo: string;
  descricao?: string;
  estado: "pendente" | "em curso" | "concluido" | "cancelado";
  prazo?: string;
  responsavelPessoaId?: ID;
  responsavelEntidadeId?: ID;
  origem: EntityLink;
  assembleiaId?: ID;
  pontoId?: ID;
  dossieId?: ID;
  documentoCriadoId?: ID;
  eventoIds: ID[];
  createdAt: string;
  updatedAt?: string;
}

interface Evento {
  id: ID;
  titulo: string;
  tipo: "reuniao" | "visita" | "resposta" | "prazo" | "deliberacao" | "outro";
  data: string;
  descricao?: string;
  local?: string;
  participantePessoaIds: ID[];
  entidadeIds: ID[];
  links: EntityLink[];
}

interface Ata {
  id: ID;
  assembleiaId: ID;
  documentoId?: ID;
  estado: "por rever" | "revista" | "aprovada" | "arquivada";
  resumo?: string;
  deliberacoes: string[];
  pontoIds: ID[];
  compromissoIds: ID[];
}

type EntityType =
  | "mandato"
  | "orgao"
  | "assembleia"
  | "ponto"
  | "documento"
  | "documentoCriado"
  | "nota"
  | "dossie"
  | "pessoa"
  | "entidade"
  | "compromisso"
  | "evento"
  | "ata";

interface EntityLink {
  type: EntityType;
  id: ID;
  label?: string;
}
```

## 5. Regras de modelação

### Evitar duplicação de dados

Guardar uma entidade uma vez e referenciá-la por ID. Por exemplo, um documento associado a vários pontos não deve ser duplicado; os pontos devem guardar `documentoIds`.

### Usar IDs para relações

Relações persistentes devem ser feitas por IDs. Evitar guardar cópias completas de objetos dentro de outros objetos.

### Permitir ligações múltiplas entre objetos

Um documento pode estar ligado a assembleia, ponto, dossiê, pessoa e entidade. Um compromisso pode nascer de um requerimento, mas também estar ligado a uma entidade responsável e a um dossiê.

### Manter compatibilidade com o que já existe

O modelo atual já tem:
- Assembleias.
- Documentos.
- Pontos.
- Estratégia.
- Preparação.
- Documentos criados/rascunhos.

A evolução deve adaptar os stores atuais gradualmente, sem migração agressiva nem reescrita.

### Preparar futura base de dados real

Cada entidade deve ter:
- `id` estável.
- campos próprios.
- relações por IDs.
- timestamps quando relevante.
- estados controlados por enums/types.

Isto facilitará migração futura de `localStorage` para base de dados real.

### Preparar futura IA/pesquisa semântica

Cada entidade deve poder fornecer contexto estruturado:
- título
- conteúdo/resumo
- tipo
- data
- relações
- tags
- estado

No futuro, estes dados podem alimentar pesquisa textual, pesquisa semântica, embeddings e geração assistida por IA.

### Objetos gerais e objetos especializados

`DocumentoCriado` deve ser o objeto base para documentos produzidos. Moção, Recomendação, Requerimento, Declaração de Voto e Intervenção podem começar como `tipo` e evoluir depois para especializações com campos próprios.

### Documento geral da assembleia

Um Documento Criado pode ter `assembleiaId` sem `pontoId`. Isto representa um documento geral da assembleia.

### Documento ligado a ponto

Um Documento Criado pode ter `assembleiaId` e `pontoId`. Isto representa um documento preparado para um ponto específico.

### Dossiês como agregadores

Dossiês não devem duplicar conteúdos. Devem agregar relações para documentos, pontos, pessoas, entidades, compromissos, projetos, eventos e notas.

Dossiês são a principal unidade de conhecimento do Tribuno. As Assembleias alimentam os Dossiês; os Dossiês acompanham o mandato. A Pesquisa e a IA devem usar os Dossiês como principal contexto para recuperar histórico, explicar relações e apoiar decisões.

### Notas como objeto transversal

Notas devem poder ligar-se a qualquer objeto através de `EntityLink[]`. Isto evita criar campos de notas inconsistentes em todos os modelos, embora campos de notas simples possam continuar a existir onde já são úteis.
