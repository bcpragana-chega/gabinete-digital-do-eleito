export const ds = {
  typography: {
    display: "font-display text-2xl font-semibold leading-8 text-foreground sm:text-3xl",
    h1: "font-display text-xl font-semibold leading-7 text-foreground sm:text-2xl",
    h2: "font-display text-lg font-semibold leading-6 text-foreground",
    h3: "text-sm font-semibold leading-5 text-foreground",
    body: "text-sm leading-5 text-muted-foreground",
    small: "text-xs leading-5 text-muted-foreground",
    caption: "text-[11px] font-medium leading-4 text-muted-foreground",
  },
  surface: {
    panel: "overflow-hidden rounded-lg border border-border/90 bg-card shadow-card",
    card: "rounded-lg border border-border/90 bg-card shadow-card transition-colors duration-150 hover:border-border",
    subtle: "rounded-lg border border-border/80 bg-muted/25",
  },
  icon: {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
    tile: "flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground",
  },
  layout: {
    stack: "space-y-4",
    gridCards: "grid gap-3 md:grid-cols-2 xl:grid-cols-3",
  },
};
