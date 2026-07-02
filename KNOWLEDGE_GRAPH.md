# Tribuno 2.0 - Knowledge Graph

Este documento define como as entidades do Tribuno se relacionam.

O Knowledge Graph do Tribuno é a camada conceptual que transforma dados dispersos em conhecimento navegável. Não deve ser entendido como uma visualização decorativa, mas como a estrutura que permite contexto automático, pesquisa universal, timeline universal, cartões inteligentes e futura IA.

## 1. Conceito de entidade

Uma entidade é qualquer objeto do mandato com identidade própria, contexto e relações.

Cada entidade deve ter:

- `id`;
- tipo;
- título ou nome;
- estado, quando aplicável;
- data ou período, quando aplicável;
- relações por IDs;
- histórico;
- origem da informação.

### Entidades principais

- Mandato;
- Órgão;
- Assembleia;
- Ponto;
- Dossiê;
- Documento;
- Documento Criado;
- Compromisso;
- Projeto;
- Pessoa;
- Entidade;
- Evento;
- Nota;
- Ata;
- Intervenção.

### Regra

Uma entidade não deve duplicar outra. Se dois objetos precisam estar ligados, devem relacionar-se por ID.

```text
Entidade = identidade + contexto + relações + histórico
```

## 2. Dossiê como nó central

O Dossiê é a principal unidade de conhecimento do Tribuno.

Um Dossiê representa um tema ou problema acompanhado pelo eleito ao longo do mandato, reunindo documentos, decisões, pessoas, entidades, compromissos, projetos e histórico relacionado.

As Assembleias alimentam os Dossiês. Os Dossiês acompanham o mandato. Pesquisa e IA usam Dossiês como principal contexto de conhecimento.

```text
                 ┌───────────────┐
                 │    Mandato    │
                 └───────┬───────┘
                         │
                         v
┌────────────┐     ┌───────────────┐     ┌────────────┐
│ Assembleia │────▶│    Dossiê     │◀────│ Documento  │
└─────┬──────┘     │ conhecimento  │     └────────────┘
      │            │ do mandato    │
      v            └───────┬───────┘
┌────────────┐             │
│   Ponto    │─────────────┤
└────────────┘             │
                           v
        ┌──────────┬────────────┬─────────────┬──────────┐
        v          v            v             v          v
   Pessoa     Entidade     Compromisso     Projeto     Nota
```

## 3. Relações

Uma relação descreve uma ligação com significado entre duas entidades.

Relações devem responder:

- que entidades estão ligadas;
- qual é o tipo de relação;
- de onde veio a relação;
- quando foi criada;
- se foi criada pelo utilizador, por importação ou futuramente por IA;
- se precisa de validação.

### Exemplos de relações

- Assembleia `tem ponto`.
- Ponto `pertence a assembleia`.
- Ponto `alimenta dossiê`.
- Documento `suporta ponto`.
- Documento `está associado a dossiê`.
- Pessoa `representa entidade`.
- Entidade `é responsável por compromisso`.
- Compromisso `nasce de ponto`.
- Compromisso `pertence a dossiê`.
- Projeto `faz parte de dossiê`.
- Nota `contextualiza documento`.
- Ata `confirma decisão`.

### Tipos de relação

- pertença;
- origem;
- suporte;
- responsabilidade;
- participação;
- referência;
- consequência;
- histórico;
- contexto;
- seguimento.

## 4. Ligações

Uma ligação é a forma prática de representar uma relação.

No modelo do Tribuno, ligações devem ser explícitas, simples e baseadas em IDs.

### Exemplo conceptual

```text
Compromisso
  id: compromisso-123
  dossieId: dossie-iluminacao-publica
  assembleiaId: assembleia-2027-03-15
  pontoId: ponto-04
  responsavelEntidadeId: entidade-camara
```

### Regras das ligações

- Uma ligação deve apontar para uma entidade existente.
- Uma entidade pode ter várias ligações.
- Ligações não devem copiar conteúdo da entidade relacionada.
- Ligações devem poder ser usadas por pesquisa, timeline e IA.
- Ligações importantes devem ser visíveis no Workspace.

```text
Documento ── documentoIds ──▶ Dossiê
Ponto     ── pontoIds     ──▶ Dossiê
Pessoa    ── pessoaIds    ──▶ Dossiê
Entidade  ── entidadeIds  ──▶ Dossiê
```

## 5. Grafo geral do mandato

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                                  MANDATO                                     │
└───────┬──────────────┬──────────────┬──────────────┬────────────────────────┘
        │              │              │              │
        v              v              v              v
┌────────────┐   ┌────────────┐  ┌────────────┐  ┌────────────┐
│Assembleias │   │  Dossiês   │  │Documentos  │  │ Pessoas    │
└─────┬──────┘   └─────┬──────┘  └─────┬──────┘  └─────┬──────┘
      │                │               │               │
      v                v               v               v
┌────────────┐   ┌────────────┐  ┌────────────┐  ┌────────────┐
│  Pontos    │──▶│Compromissos│◀─│Documentos  │  │ Entidades  │
└─────┬──────┘   └─────┬──────┘  │ Criados    │  └─────┬──────┘
      │                │         └─────┬──────┘        │
      v                v               v               v
┌────────────┐   ┌────────────┐  ┌────────────┐  ┌────────────┐
│   Atas     │   │  Eventos   │  │Intervenções│  │ Projetos   │
└─────┬──────┘   └─────┬──────┘  └─────┬──────┘  └─────┬──────┘
      │                │               │               │
      └────────────────┴───────┬───────┴───────────────┘
                               v
                         ┌────────────┐
                         │   Notas    │
                         └────────────┘

Regra: qualquer entidade pode ligar-se a um Dossiê quando ajuda a construir conhecimento do mandato.
```

## 6. Timeline universal

A timeline universal é a sequência cronológica de acontecimentos relevantes do mandato.

Ela não pertence apenas a uma entidade. Deve poder ser filtrada por:

- mandato;
- Dossiê;
- assembleia;
- pessoa;
- entidade;
- compromisso;
- documento;
- projeto;
- tipo de evento;
- período temporal.

### O que entra na timeline

- assembleias criadas;
- pontos discutidos;
- documentos recebidos;
- documentos criados;
- compromissos criados;
- compromissos atualizados;
- atas associadas;
- decisões registadas;
- eventos;
- notas importantes;
- alterações de estado;
- ligações criadas entre entidades.

### Diagrama

```text
Tempo ───────────────────────────────────────────────────────────────────────▶

Jan        Fev             Mar                    Abr                  Mai
│          │               │                      │                    │
│          │               │                      │                    │
▼          ▼               ▼                      ▼                    ▼
Doc        Assembleia      Compromisso            Ata                  Reunião
recebido   Ponto discutido criado                 associada            registada
│          │               │                      │                    │
└──────────┴───────────────┴──────────────┬───────┴────────────────────┘
                                          ▼
                                  Dossiê Habitação
```

### Regra

Cada Workspace deve poder mostrar uma timeline filtrada ao seu contexto.

Exemplos:

- Timeline do Dossiê Habitação.
- Timeline da Assembleia de 15 de março.
- Timeline da Pessoa `Presidente da Junta`.
- Timeline do Compromisso `Enviar cronograma`.

## 7. Pesquisa universal

A pesquisa universal deve encontrar entidades, relações e contexto.

Não deve devolver apenas texto. Deve devolver respostas navegáveis dentro do grafo.

### Deve pesquisar por

- título;
- texto;
- tipo de entidade;
- Dossiê;
- pessoa;
- entidade;
- data;
- estado;
- origem;
- relação;
- documento;
- compromisso;
- assembleia.

### Tipos de resultado

- entidade direta;
- relação relevante;
- timeline filtrada;
- documento associado;
- compromisso pendente;
- pessoa ou entidade relacionada;
- Dossiê sugerido;
- histórico de decisões.

### Diagrama

```text
Pesquisa: "iluminação escola"

        ┌────────────────────────┐
        │   Pesquisa Universal   │
        └───────────┬────────────┘
                    │
        ┌───────────┼───────────┬───────────────┐
        v           v           v               v
   Dossiês      Documentos   Compromissos     Pessoas
        │           │           │               │
        v           v           v               v
 Iluminação   Relatório     Pedido sem       Presidente
 Pública      técnico       resposta         da Junta
        │           │           │               │
        └───────────┴───────────┴───────┬───────┘
                                        v
                              Contexto relacionado
```

## 8. Cartões inteligentes

Cartões inteligentes são resumos compactos de entidades ou relações.

Devem aparecer em Home, Pesquisa, Dossiês, Assembleias, Compromissos e Histórico. O objetivo é mostrar contexto suficiente para decidir se o utilizador deve abrir o Workspace completo.

### Um cartão inteligente deve mostrar

- tipo de entidade;
- título;
- estado;
- relação principal;
- Dossiê associado;
- data ou prazo;
- próxima ação;
- indicador de risco ou urgência, quando aplicável.

### Exemplos

```text
┌──────────────────────────────────────────────┐
│ Dossiê · Iluminação Pública                  │
│ Estado: Crítico · 2 compromissos pendentes   │
│ Última atualização: Pedido sem resposta      │
│ Próxima ação: Preparar requerimento          │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ Compromisso · Enviar cronograma              │
│ Dossiê: Centro de Saúde                      │
│ Responsável: Câmara Municipal                │
│ Prazo: amanhã · Estado: A aguardar resposta  │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ Documento · Relatório execução orçamental    │
│ Dossiê: Orçamento 2027                       │
│ Ligado a: Assembleia 15 março · Ponto 3      │
│ Estado: Por analisar                         │
└──────────────────────────────────────────────┘
```

### Regra

Um cartão inteligente deve ser uma porta para um Workspace, não um substituto do Workspace.

## 9. Contexto automático

Contexto automático é a capacidade do Tribuno de mostrar relações relevantes sem obrigar o utilizador a procurá-las manualmente.

Quando o utilizador abre uma entidade, o sistema deve conseguir mostrar:

- Dossiês relacionados;
- documentos relevantes;
- compromissos pendentes;
- pessoas e entidades associadas;
- assembleias onde o tema apareceu;
- decisões anteriores;
- notas recentes;
- histórico filtrado;
- próximas ações.

### Exemplos

Ao abrir um Ponto:

- mostrar documentos associados;
- mostrar Dossiês relacionados;
- mostrar decisões anteriores do mesmo Dossiê;
- mostrar compromissos pendentes.

Ao abrir um Documento:

- mostrar Dossiê associado;
- mostrar assembleia e ponto relacionados;
- mostrar pessoas e entidades mencionadas;
- mostrar ações possíveis.

Ao abrir um Dossiê:

- mostrar timeline;
- mostrar documentos;
- mostrar compromissos;
- mostrar pessoas, entidades e projetos;
- mostrar próxima ação.

### Diagrama

```text
Abrir entidade
      │
      v
Ler relações por ID
      │
      v
Construir contexto
      │
      ├── Dossiês relacionados
      ├── Documentos relevantes
      ├── Compromissos pendentes
      ├── Pessoas e entidades
      ├── Timeline
      └── Próximas ações
```

## 10. Preparação para IA

A IA futura deve operar sobre o Knowledge Graph, não sobre texto solto sem estrutura.

Isto significa que a IA deve receber:

- entidade atual;
- Dossiê principal;
- relações relevantes;
- documentos associados;
- histórico filtrado;
- compromissos pendentes;
- pessoas e entidades relacionadas;
- fontes usadas;
- nível de confiança ou incerteza.

### A IA deve conseguir

- resumir um Dossiê;
- explicar relações entre entidades;
- identificar pendentes;
- sugerir próximas ações;
- preparar briefings;
- gerar perguntas;
- apoiar criação de documentos;
- recuperar decisões anteriores;
- indicar fontes.

### A IA não deve

- inventar relações;
- decidir pelo eleito;
- alterar entidades sem confirmação;
- esconder incerteza;
- usar contexto sem indicar fonte;
- tratar texto gerado como facto.

### Diagrama de contexto para IA

```text
                 ┌──────────────────────┐
                 │  Entidade atual       │
                 │  ponto/documento/etc. │
                 └───────────┬──────────┘
                             │
                             v
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│   Dossiê     │────▶│ Context Builder  │◀────│  Timeline    │
│  principal   │     └────────┬─────────┘     │  filtrada    │
└──────────────┘              │               └──────────────┘
                              v
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│ Documentos   │────▶│ Pacote de        │◀────│ Compromissos │
│ relacionados │     │ contexto para IA │     │ pendentes    │
└──────────────┘     └────────┬─────────┘     └──────────────┘
                              │
                              v
                     ┌──────────────────┐
                     │ Resposta assistida│
                     │ com fontes        │
                     └──────────────────┘
```

## 11. Regras de desenho do grafo

- Dossiês são o principal contexto de conhecimento.
- Assembleias alimentam Dossiês.
- Relações devem ser explícitas e baseadas em IDs.
- Pesquisa deve devolver entidades e relações, não apenas texto.
- Timeline deve poder ser universal e filtrada.
- Cartões inteligentes devem resumir contexto acionável.
- IA deve receber contexto estruturado e indicar fontes.
- Nenhuma entidade deve depender da IA para ser compreensível.
- O grafo deve ajudar a decidir, não apenas mostrar ligações.

## 12. Resultado esperado

O Knowledge Graph deve permitir que o Tribuno responda rapidamente:

- onde apareceu este tema;
- que documentos existem;
- que decisões foram tomadas;
- que compromissos estão pendentes;
- quem está envolvido;
- que Dossiê dá contexto;
- que aconteceu antes;
- qual é o próximo passo.

Quando esta camada estiver bem definida, cada Workspace deixa de ser uma página isolada e passa a ser uma janela para a memória ligada do mandato.
