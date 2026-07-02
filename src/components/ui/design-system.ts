export const ds = {
  typography: {
    display: "font-display text-5xl font-semibold leading-tight text-foreground",
    h1: "font-display text-4xl font-semibold leading-tight text-foreground",
    h2: "font-display text-2xl font-semibold leading-8 text-foreground",
    h3: "text-lg font-semibold leading-7 text-foreground",
    body: "text-base leading-8 text-muted-foreground",
    small: "text-sm leading-7 text-muted-foreground",
    caption: "text-xs font-medium text-muted-foreground",
  },
  surface: {
    page: "min-h-screen bg-background",
    panel: "overflow-hidden rounded-2xl border border-border/70 bg-card shadow-none",
    card: "rounded-2xl border border-border/70 bg-card shadow-none transition-colors hover:border-border",
    subtle: "rounded-2xl border border-border/60 bg-card",
  },
  icon: {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
    tile: "flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground",
  },
  layout: {
    page: "mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10",
    stack: "space-y-6",
    gridCards: "grid gap-6 md:grid-cols-2 xl:grid-cols-3",
  },
};
