
# Fase 2 — Preparação da Assembleia com dados simulados

> Nota: este plano corresponde ao que já foi implementado no turno anterior. Aprovar este plano confirma o âmbito; nenhuma alteração adicional é necessária se aceitares o resultado atual em `/assembleias/:id/preparacao`.

## Objetivo

Tornar `/assembleias/:id/preparacao` o centro visual de preparação da Assembleia, com simulação realista de como funcionará no futuro com IA. Sem IA, sem upload, sem persistência, sem CRUD, sem geração de documentos.

## Secções

1. **Prioridades** — cartões com título, nível (Alta/Média/Baixa), descrição, documentos relacionados, estado (Por preparar / Preparado / Acompanhar).
2. **Perguntas sugeridas** — cartões com tema, pergunta, prioridade, documentos relacionados, botão visual "Selecionar pergunta" / "Marcar como escolhida".
3. **Ações pendentes** — cartões com tarefa, estado (Pendente / Em curso / Concluída), prazo opcional, botão visual "Marcar".
4. **Documentos a criar** — cartões com tipo (Moção, Recomendação, Requerimento, Declaração de voto, Intervenção), motivo, prioridade, botão `disabled` "Criar futuramente".

## Dados mock

Ficheiro `src/lib/mock-preparacao.ts` com arrays tipados, em pt-PT, usando temas autárquicos realistas: Execução do PPI, Transferências correntes, Novas instalações da Junta, Centro Cultural D. Dinis, Transferências de capital, Aquisição de terrenos para estacionamento.

Os mesmos mocks aplicam-se a qualquer `:id` (fallback universal) — a página nunca aparece vazia.

## Componentes

Em `src/components/preparacao/`:

- `badges.tsx` — `PrioridadeBadge`, `EstadoPrioridadeBadge`, `EstadoAcaoBadge`, `TipoDocumentoBadge`.
- `SecaoPreparacao.tsx` — wrapper de secção (ícone, título, descrição, contador, grid responsiva).
- `PrioridadeCard.tsx`, `PerguntaCard.tsx`, `AcaoCard.tsx`, `DocumentoACriarCard.tsx`.

Todos sem estado, usando apenas os tokens semânticos da Fase 1 e o componente `Badge` / `Button` do shadcn já presentes.

## Alterações na rota

`src/routes/_app.assembleias.$id.preparacao.tsx` deixa de mostrar placeholders e passa a renderizar as quatro secções com os mocks. Header da assembleia (título, data, hora, local, breadcrumb) mantém-se.

## Fora de âmbito

CRUD, edição, persistência, localStorage, importação/exportação, geração de documentos, IA, chat, upload, autenticação, backend.

## Critério de validação

Abrir `/assembleias/:id/preparacao` (qualquer id) mostra uma página densa e profissional com as quatro secções preenchidas, suficiente para validar se o layout serve um eleito local antes de avançar para funcionalidades reais.
