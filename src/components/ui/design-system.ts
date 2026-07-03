export const ds = {
  typography: {
    display: "font-display text-3xl font-semibold leading-tight text-foreground sm:text-4xl",
    h1: "font-display text-2xl font-semibold leading-tight text-foreground sm:text-3xl",
    h2: "font-display text-xl font-semibold leading-7 text-foreground",
    h3: "text-base font-semibold leading-6 text-foreground",
    body: "text-sm leading-6 text-muted-foreground",
    small: "text-sm leading-6 text-muted-foreground",
    caption: "text-xs font-medium text-muted-foreground",
  },
  surface: {
    page: "min-h-screen bg-background",
    panel: "overflow-hidden rounded-2xl border border-border bg-card shadow-card",
    card: "rounded-2xl border border-border bg-card shadow-card transition-colors hover:border-border/80",
    subtle: "rounded-2xl border border-border/80 bg-muted/25",
  },
  icon: {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
    tile: "flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground",
  },
  layout: {
    page: "mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10",
    stack: "space-y-6",
    gridCards: "grid gap-4 md:grid-cols-2 xl:grid-cols-3",
  },
};
