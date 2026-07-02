# Tribuno 2.0 - Design System

Este documento define a base visual do Tribuno 2.0. O objetivo é tornar a interface mais consistente sem alterar funcionalidades, lógica, stores ou rotas.

O Tribuno deve ter uma linguagem visual institucional, calma e operacional. A aplicação é uma ferramenta de trabalho para mandato, por isso deve privilegiar clareza, densidade moderada, leitura rápida, hierarquia consistente e baixa fricção.

## 1. Cores Principais

As cores atuais estão definidas em `src/styles.css` com tokens CSS e valores `oklch`.

### Base

- `background`: fundo geral da aplicação. Quase branco, ligeiramente frio.
- `foreground`: texto principal.
- `card`: fundo de cartões e superfícies.
- `border`: linhas, divisões e limites de cartões.
- `muted`: fundos secundários.
- `muted-foreground`: texto secundário.

### Ação

- `primary`: cor principal para ações e foco.
- `primary-foreground`: texto sobre `primary`.
- `secondary`: ações secundárias e botões menos prioritários.
- `accent`: fundo de ícones, realces subtis e hover.
- `accent-foreground`: texto/ícone sobre `accent`.
- `destructive`: ações perigosas.

### Sidebar

- `sidebar`: fundo da navegação lateral.
- `sidebar-foreground`: texto principal da sidebar.
- `sidebar-muted`: texto secundário da sidebar.
- `sidebar-border`: separadores.
- `sidebar-accent`: item ativo/hover.
- `sidebar-accent-foreground`: texto sobre item ativo.

### Estados

- `status-preparacao`: preparação/por rever.
- `status-analise`: análise/em análise.
- `status-concluida`: concluído/revisto.
- `status-alerta`: alerta/importante.

### Regra

Evitar criar cores diretas em componentes. Sempre que possível, usar tokens:

- `bg-card`
- `bg-background`
- `bg-muted`
- `bg-accent`
- `text-foreground`
- `text-muted-foreground`
- `border-border`
- `shadow-card`
- `shadow-elevated`

## 2. Tipografia

### Fontes

- Texto geral: `font-sans`, definido como `Inter`.
- Títulos e destaques: `font-display`, definido como `Inter Tight` com fallback para `Inter`.

### Hierarquia recomendada

- Título de página: `font-display text-2xl md:text-3xl font-semibold tracking-tight`
- Título de secção grande: `font-display text-xl font-semibold tracking-tight`
- Título de card/linha importante: `font-display text-base/text-lg font-semibold tracking-tight`
- Texto normal: `text-sm text-foreground`
- Texto secundário: `text-sm text-muted-foreground`
- Eyebrow/metadados: `text-xs font-medium uppercase tracking-wider text-muted-foreground`

### Inconsistência atual

Existe uso global em `styles.css` de `letter-spacing: -0.015em` em todos os headings, além de muitos componentes usarem `tracking-tight`. Isto funciona visualmente, mas pode exagerar a compressão em títulos pequenos.

### Regra

Usar `tracking-tight` apenas em headings reais. Evitar aplicar estilos de hero/título grande dentro de cards compactos.

## 3. Botões

O primitivo principal é `src/components/ui/button.tsx`.

### Variantes atuais

- `default`: ação principal.
- `secondary`: ação secundária.
- `outline`: ação contextual ou alternativa.
- `ghost`: ação discreta.
- `destructive`: ação perigosa.
- `link`: navegação textual.

### Tamanhos atuais

- `default`: `h-9 px-4`
- `sm`: `h-8 px-3 text-xs`
- `lg`: `h-10 px-8`
- `icon`: `h-9 w-9`

### Regras

- Usar ícones `lucide-react` em ações de ferramenta quando existir ícone adequado.
- Usar `default` apenas para ação principal da zona/ecrã.
- Usar `outline` para ações reversíveis como associar/desassociar.
- Usar `ghost` em navegação, tabs ou comandos de baixo peso.
- Evitar botões textuais manuais fora do componente `Button`, salvo links simples.

### Inconsistência atual

Alguns botões/links de navegação são feitos diretamente com classes, por exemplo em rotas e em `TopBar`. Isto é aceitável para links, mas ações clicáveis devem tender para `Button`.

## 4. Cards

### Padrão atual

O padrão mais usado é:

```text
rounded-2xl border border-border bg-card p-5/p-6 shadow-card
```

Para cards mais compactos:

```text
rounded-xl border border-border bg-card p-4/p-5 shadow-card
```

Para superfícies internas:

```text
rounded-xl border border-border bg-background/60 p-4
```

### Regras

- Usar cards para unidades reais de conteúdo: assembleia, documento, ponto, métrica, secção operacional.
- Evitar cards dentro de cards quando uma divisão interna simples resolver.
- Usar `shadow-card` por defeito.
- Usar `shadow-elevated` apenas em hover ou superfícies destacadas.
- Usar `border-primary/40` ou `border-foreground/15` de forma consistente para hover.

### Inconsistência atual

Há mistura entre:

- `rounded-xl`
- `rounded-2xl`
- `rounded-lg`
- `shadow-md`
- `shadow-card`
- `shadow-elevated`

Isto não quebra o design, mas reduz consistência. O padrão deve ser:

- card principal: `rounded-2xl`
- item/list card: `rounded-xl`
- control/input/interior: `rounded-md` ou `rounded-lg`

## 5. Badges

### Padrões atuais

Existem vários badges:

- `src/components/ui/badge.tsx`
- `src/components/ui/StatusBadge.tsx`
- `src/components/documentos/DocumentoEstadoBadge.tsx`
- badges manuais em rotas e componentes de preparação.

### Regra recomendada

Criar um padrão único de badge de domínio:

```text
inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium
```

Para metadados compactos dentro de cards:

```text
rounded-md px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider
```

### Inconsistência atual

Alguns badges usam `rounded-full`, outros `rounded-md`. Alguns têm ponto de estado, outros não. Alguns usam uppercase, outros não.

### Direção

- Estado: `rounded-full` com ponto.
- Tipo/categoria: `rounded-md` sem ponto, uppercase.
- Contador: `rounded-full` simples.

## 6. Inputs

### Padrão atual

O componente `Input` usa:

```text
h-9 rounded-md border border-input bg-transparent px-3 text-base md:text-sm
```

`StrategyField` usa `textarea` manual com:

```text
rounded-md border border-input bg-background px-3 py-2 text-sm
```

### Regras

- Inputs devem usar `Input` quando forem campos de uma linha.
- Textareas devem usar um primitivo comum no futuro, porque hoje há textareas manuais e `Textarea` de UI.
- Labels devem usar `text-xs font-medium text-foreground` em formulários compactos.
- Formulários estratégicos podem usar label com `font-display text-base font-semibold`.

### Inconsistência atual

Há mistura entre `Textarea` de `src/components/ui/textarea.tsx` e textareas manuais, especialmente em `StrategyField`.

## 7. Estados Vazios

### Padrão atual

Estados vazios aparecem normalmente como:

```text
rounded-2xl border border-dashed border-border bg-card p-8 shadow-card
```

ou dentro de secções:

```text
rounded-lg border border-dashed border-border bg-background/50 px-4 py-6 text-center
```

### Regras

- Estado vazio de página/secção principal: `rounded-2xl`, `bg-card`, `p-8`.
- Estado vazio interno: `rounded-lg`, `bg-background/50`, `p-6`.
- Deve ter título claro quando é página inteira.
- Deve ter apenas texto curto quando é vazio interno.
- Evitar explicar funcionalidades longamente dentro da aplicação.

### Inconsistência atual

Vários estados vazios são implementados diretamente em rotas, com diferenças pequenas de padding, título e borda.

## 8. Dashboards

### Padrão atual

O dashboard do ponto usa:

- card principal com `rounded-2xl border bg-card p-5 shadow-card`;
- métricas internas com `rounded-xl border bg-background/60 p-4`;
- título `font-display text-lg`;
- métricas com `font-display text-2xl`;
- barra de progresso com componente `Progress`.

### Regras

- Dashboards devem ser densos e orientados à leitura rápida.
- Métricas devem ter label curto, valor grande e ícone opcional.
- Progresso deve estar abaixo das métricas, não competir com elas.
- Evitar cards decorativos; cada métrica deve responder a uma pergunta útil.

### Inconsistência atual

O padrão do dashboard ainda vive dentro da rota do ponto. Deve ser extraído antes de ser reutilizado noutros módulos.

## 9. Inconsistências Visuais Identificadas

### 9.1 Radius e cartões

Há variações frequentes entre `rounded-lg`, `rounded-xl` e `rounded-2xl`. A aplicação ainda parece coerente, mas precisa de regras mais explícitas.

### 9.2 Badges

Há badges genéricos, badges de assembleia, badges de documento e badges manuais. O significado visual de `rounded-full` vs `rounded-md` ainda não está normalizado.

### 9.3 Estados vazios

Estados vazios são repetidos em várias rotas, com pequenas diferenças de estrutura.

### 9.4 Headers de página

Muitas páginas repetem a combinação de ícone, eyebrow, título e descrição. O padrão visual existe, mas ainda não está componenteizado.

### 9.5 Hover de cards

Alguns cards usam `hover:shadow-elevated`, outros `hover:shadow-md`; alguns usam `hover:border-primary/40`, outros `hover:border-foreground/15`.

### 9.6 Inputs e textareas

Inputs estão centralizados, mas textareas ainda aparecem em padrões diferentes.

### 9.7 Cards internos

Há superfícies internas com `bg-background/60`, `bg-background/50` e `bg-card`. A hierarquia funciona, mas convém documentar quando usar cada uma.

## 10. Primeiras 5 Melhorias Visuais Recomendadas

1. **Criar um componente `PageHeader` reutilizável**  
   Para normalizar ícone, eyebrow, título, descrição e ações no topo das páginas.

2. **Criar um componente `EmptyState` reutilizável**  
   Para eliminar variações pequenas entre estados vazios de páginas, listas e secções internas.

3. **Unificar badges de domínio**  
   Manter `rounded-full` para estados com ponto e `rounded-md` para tipos/categorias.

4. **Normalizar cards e hover states**  
   Definir `rounded-2xl` para secções principais, `rounded-xl` para itens/listas e `shadow-elevated` como hover padrão.

5. **Criar um primitivo comum para `Textarea` estratégico/formulários**  
   Para alinhar `StrategyField`, editor de rascunhos e outros campos longos sem mudar funcionalidades.

## 11. Regra de Evolução Visual

Cada melhoria visual deve:

- preservar funcionalidades existentes;
- evitar alterar stores, rotas ou lógica;
- respeitar os tokens atuais;
- reduzir duplicação visual;
- ser feita por componentes pequenos e reutilizáveis;
- não introduzir uma nova linguagem visual paralela.

