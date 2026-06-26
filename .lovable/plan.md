# Fase 3 — Gestão Documental da Assembleia

Aprovado com a restrição: apenas metadados, sem guardar ficheiros reais.

## Modelo de dados (`src/lib/types.ts`)

```ts
export type TipoDocumento =
  | "Convocatória" | "Ata" | "Orçamento"
  | "Execução da Receita" | "Execução da Despesa"
  | "PPI" | "Relatório" | "Regulamento"
  | "Proposta" | "Declaração de voto" | "Outro";

export type EstadoDocumento = "Por rever" | "Revisto" | "Importante" | "Arquivado";

export interface Documento {
  id: string;
  assembleiaId: string;
  titulo: string;           // renomeado de "nome"
  tipo: TipoDocumento;
  data: string;
  estado: EstadoDocumento;  // novo
  ficheiroNome?: string;
  ficheiroTipo?: string;
  paginas?: number;
  notas?: string;
  createdAt: string;        // novo
}
```

Migrar mocks em `src/lib/mock-data.ts`: `nome → titulo`, atribuir `estado` por defeito e `createdAt` derivado da data da assembleia. Manter helpers existentes.

## Persistência local (`src/lib/documentos-store.ts`)

- Chave `tribuno.documents.v1`, valor JSON array de `Documento`.
- `adicionarDocumento(input)` → `crypto.randomUUID()` + `createdAt: new Date().toISOString()`, escreve em localStorage e dispara `window.dispatchEvent(new Event("tribuno:documents"))`.
- Hook `useDocumentosDaAssembleia(id)` → combina mocks + locais, ordena por data desc, subscreve aos eventos `tribuno:documents` e `storage`.
- Hook `useDocumento(docId)` → procura em mocks (hidrata SSR) + locais (no cliente).
- Apenas metadados são guardados — `ficheiroNome` e `ficheiroTipo` do `File` selecionado; o conteúdo binário nunca toca em storage.

## Componentes (`src/components/documentos/`)

- `DocumentoEstadoBadge.tsx` — mapeia estados aos tokens `status-*` existentes.
- `DocumentoCard.tsx` — substitui `src/components/cards/DocumentoCard.tsx`; mostra tipo, badge, título, data, páginas (se houver).
- `DocumentoForm.tsx` — Input/Select/Textarea/Input file (lê só `name` + `type`); validação mínima (título obrigatório).
- `AdicionarDocumentoSheet.tsx` — wrapper `Sheet` lateral com o botão "Adicionar documento" como trigger.
- `DocumentoPreview.tsx` — caixa visual com nome do ficheiro + "Pré-visualização disponível em fase futura". Sem iframe.

## Alterações em rotas

**`/assembleias/:id`** — botão `AdicionarDocumentoSheet` no header da secção; lista combinada via `useDocumentosDaAssembleia`; contagem dinâmica.

**`/assembleias/:id/documentos/:docId`** — loader devolve apenas `assembleia`; o componente usa `useDocumento` (cobre mocks + locais). Adiciona `DocumentoEstadoBadge`, notas (se houver) e `DocumentoPreview`. Mantém as três áreas reservadas (Análise, Alertas, Documentos relacionados).

## Limpeza

Remover `src/components/cards/DocumentoCard.tsx` e atualizar imports.

## Fora de âmbito

IA, OCR, leitura de ficheiros, geração documental, edição/eliminação, importação/exportação, chat, autenticação, backend, Lovable Cloud, página global de documentos, guardar conteúdo de ficheiros.

## Critério de validação

Abrir uma assembleia → "Adicionar documento" → preencher → guardar → cartão aparece → abrir detalhe → ver metadados + preview placeholder → refresh mantém o documento.
