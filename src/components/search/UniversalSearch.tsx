import { Link, useNavigate } from "@tanstack/react-router";
import {
  Building2,
  CalendarDays,
  Clock3,
  FileText,
  History,
  NotebookText,
  PlayCircle,
  Plus,
  ScrollText,
  Search,
  Settings,
  StickyNote,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  pesquisarUniversal,
  type UniversalSearchGroup,
  type UniversalSearchResult,
  type UniversalSearchType,
} from "@/lib/universal-search";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { listarAssembleias } from "@/lib/assembleias-store";
import { cn } from "@/lib/utils";

const searchEvents = [
  "tribuno:assembleias",
  "tribuno:dossies",
  "tribuno:documents",
  "tribuno:dossie-notas",
  "tribuno:dossie-timeline",
];

const icons: Record<UniversalSearchType, LucideIcon> = {
  assembleias: CalendarDays,
  dossies: NotebookText,
  documentos: FileText,
  notas: StickyNote,
  timeline: Clock3,
  pessoas: Users,
  entidades: Building2,
  compromissos: ScrollText,
};

function flattenGroups(groups: UniversalSearchGroup[]) {
  return groups.flatMap((group) => group.results);
}

function normalizar(valor: string) {
  return valor
    .toLocaleLowerCase("pt-PT")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

type QuickAction = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  terms: string[];
};

type PaletteItem =
  | {
      kind: "action";
      action: QuickAction;
    }
  | {
      kind: "result";
      result: UniversalSearchResult;
    };

export function UniversalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [revision, setRevision] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const paletteInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const atualizar = () => setRevision((value) => value + 1);

    searchEvents.forEach((eventName) => window.addEventListener(eventName, atualizar));
    window.addEventListener("storage", atualizar);

    return () => {
      searchEvents.forEach((eventName) => window.removeEventListener(eventName, atualizar));
      window.removeEventListener("storage", atualizar);
    };
  }, []);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setFocused(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const key = event.key.toLowerCase();

      if ((event.metaKey || event.ctrlKey) && key === "k") {
        event.preventDefault();
        setFocused(false);
        setPaletteOpen(true);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!paletteOpen) return;

    window.setTimeout(() => paletteInputRef.current?.focus(), 0);
  }, [paletteOpen]);

  const groups = useMemo(() => pesquisarUniversal(query), [query, revision]);
  const paletteGroups = useMemo(() => pesquisarUniversal(paletteQuery), [paletteQuery, revision]);
  const paletteResults = useMemo(() => flattenGroups(paletteGroups), [paletteGroups]);
  const quickActions = useMemo((): QuickAction[] => {
    const assembleias = listarAssembleias();
    const assembleiaPreparacao =
      assembleias.find((assembleia) => assembleia.estado === "preparacao") ??
      assembleias.find((assembleia) => assembleia.estado !== "concluida" && assembleia.estado !== "arquivada") ??
      assembleias[0];

    return [
      {
        id: "criar-dossie",
        title: "Criar Dossiê",
        description: "Abrir Dossiês para criar um novo tema de acompanhamento.",
        icon: Plus,
        href: "/dossies",
        terms: ["criar dossie", "novo dossie", "dossie"],
      },
      {
        id: "criar-assembleia",
        title: "Criar Assembleia",
        description: "Abrir Assembleias para registar uma nova sessão.",
        icon: Plus,
        href: "/assembleias",
        terms: ["criar assembleia", "nova assembleia", "assembleia"],
      },
      {
        id: "abrir-dossies",
        title: "Abrir Dossiês",
        description: "Ver todos os Dossiês ativos e arquivados.",
        icon: NotebookText,
        href: "/dossies",
        terms: ["abrir dossies", "dossies", "temas"],
      },
      {
        id: "abrir-assembleias",
        title: "Abrir Assembleias",
        description: "Ver a lista de assembleias do mandato.",
        icon: CalendarDays,
        href: "/assembleias",
        terms: ["abrir assembleias", "assembleias", "sessoes"],
      },
      {
        id: "abrir-definicoes",
        title: "Abrir Definições",
        description: "Aceder às preferências e dados do gabinete.",
        icon: Settings,
        href: "/definicoes",
        terms: ["abrir definicoes", "definicoes", "preferencias"],
      },
      {
        id: "abrir-historico",
        title: "Abrir Histórico",
        description: "Consultar atividade e memória histórica.",
        icon: History,
        href: "/historico",
        terms: ["abrir historico", "historico", "atividade"],
      },
      {
        id: "continuar-preparacao",
        title: "Continuar preparação",
        description: assembleiaPreparacao
          ? `Continuar a preparação de ${assembleiaPreparacao.nome}.`
          : "Abrir assembleias para escolher uma preparação.",
        icon: PlayCircle,
        href: assembleiaPreparacao
          ? `/assembleias/${assembleiaPreparacao.id}/preparacao`
          : "/assembleias",
        terms: ["continuar preparacao", "preparacao", "retomar", "proxima assembleia"],
      },
    ];
  }, [revision]);

  const filteredQuickActions = useMemo(() => {
    const trimmed = paletteQuery.trim();
    if (!trimmed) return quickActions;

    const normalizedQuery = normalizar(trimmed);
    return quickActions.filter((action) =>
      [action.title, action.description, ...action.terms].some((term) =>
        normalizar(term).includes(normalizedQuery),
      ),
    );
  }, [paletteQuery, quickActions]);

  const paletteItems = useMemo(
    (): PaletteItem[] => [
      ...filteredQuickActions.map((action) => ({ kind: "action" as const, action })),
      ...paletteResults.map((result) => ({ kind: "result" as const, result })),
    ],
    [filteredQuickActions, paletteResults],
  );
  const showPanel = focused && query.trim().length > 0;
  const hasResults = groups.length > 0;
  const paletteHasItems = paletteItems.length > 0;

  useEffect(() => {
    setActiveIndex(0);
  }, [paletteQuery]);

  function resetPalette() {
    setPaletteQuery("");
    setActiveIndex(0);
  }

  function openResult(result: UniversalSearchResult) {
    setFocused(false);
    setQuery("");
    setPaletteOpen(false);
    resetPalette();
    void navigate({ to: result.href as never });
  }

  function executeQuickAction(action: QuickAction) {
    setFocused(false);
    setQuery("");
    setPaletteOpen(false);
    resetPalette();
    void navigate({ to: action.href as never });
  }

  function executePaletteItem(item: PaletteItem) {
    if (item.kind === "action") {
      executeQuickAction(item.action);
      return;
    }

    openResult(item.result);
  }

  function onPaletteKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setPaletteOpen(false);
      return;
    }

    if (!paletteHasItems) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % paletteItems.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + paletteItems.length) % paletteItems.length);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const item = paletteItems[activeIndex] ?? paletteItems[0];
      if (item) executePaletteItem(item);
    }
  }

  function renderResultContent(result: UniversalSearchResult) {
    const ResultIcon = icons[result.type];

    return (
      <>
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <ResultIcon className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-foreground">{result.title}</span>
          {result.description && (
            <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-muted-foreground">
              {result.description}
            </span>
          )}
          {result.meta && (
            <span className="mt-1 block truncate text-[11px] text-muted-foreground">
              {result.meta}
            </span>
          )}
        </span>
      </>
    );
  }

  function renderQuickActionContent(action: QuickAction) {
    const ActionIcon = action.icon;

    return (
      <>
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <ActionIcon className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-foreground">{action.title}</span>
          <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-muted-foreground">
            {action.description}
          </span>
        </span>
      </>
    );
  }

  return (
    <>
      <div ref={containerRef} className="relative hidden lg:block">
        <div
          className={cn(
            "flex w-64 items-center gap-2 rounded-xl border border-border/60 bg-background px-3 py-1.5 transition-colors",
            focused && "border-ring/40 bg-card",
          )}
        >
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setFocused(true)}
            placeholder="Pesquisar no Tribuno..."
            className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            Cmd K
          </kbd>
        </div>

        {showPanel && (
          <div className="absolute right-0 top-11 z-50 w-[28rem] overflow-hidden rounded-2xl border border-border/70 bg-card/95 shadow-card backdrop-blur">
            {hasResults ? (
              <div className="max-h-[28rem] overflow-y-auto p-2">
                {groups.map((group) => {
                  const GroupIcon = icons[group.type];

                  return (
                    <section key={group.type} className="py-2">
                      <div className="mb-1 flex items-center gap-2 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        <GroupIcon className="h-3.5 w-3.5" />
                        {group.label}
                      </div>
                      <div className="space-y-1">
                        {group.results.map((result) => (
                          <Link
                            key={`${result.type}-${result.id}`}
                            to={result.href as never}
                            onClick={() => {
                              setFocused(false);
                              setQuery("");
                            }}
                            className="flex items-start gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-muted/70"
                          >
                            {renderResultContent(result)}
                          </Link>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-sm">
                <div className="font-medium text-foreground">Sem resultados</div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Tenta pesquisar por titulo, resumo, objetivo politico, descricao ou tag.
                </p>
              </div>
            )}

            <div className="border-t border-border/70 bg-muted/20 px-4 py-2 text-[11px] text-muted-foreground">
              Preparado para incluir Pessoas, Entidades e Compromissos.
            </div>
          </div>
        )}
      </div>

      <Dialog
        open={paletteOpen}
        onOpenChange={(open) => {
          setPaletteOpen(open);
          if (!open) resetPalette();
        }}
      >
        <DialogContent className="top-[16%] max-w-2xl translate-y-0 overflow-hidden rounded-2xl border-border/70 bg-card/95 p-0 shadow-card backdrop-blur">
          <DialogTitle className="sr-only">Command Palette</DialogTitle>
          <DialogDescription className="sr-only">Pesquisa universal do Tribuno.</DialogDescription>

          <div className="flex items-center gap-3 border-b border-border/70 bg-muted/20 px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              ref={paletteInputRef}
              type="search"
              value={paletteQuery}
              onChange={(event) => setPaletteQuery(event.target.value)}
              onKeyDown={onPaletteKeyDown}
              placeholder="Pesquisar assembleias, dossies, documentos, notas..."
              className="h-9 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="rounded-md border border-border/70 bg-muted/70 px-1.5 py-0.5 text-[10px] text-muted-foreground">
              Esc
            </kbd>
          </div>

          <div className="max-h-[28rem] overflow-y-auto p-3">
            {paletteHasItems ? (
              <>
                {filteredQuickActions.length > 0 && (
                  <section className="py-2">
                    <div className="mb-1 flex items-center gap-2 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      <PlayCircle className="h-3.5 w-3.5" />
                      Ações rápidas
                    </div>
                    <div className="space-y-1">
                      {filteredQuickActions.map((action, actionIndex) => {
                        const active = actionIndex === activeIndex;

                        return (
                          <button
                            key={action.id}
                            type="button"
                            onMouseEnter={() => setActiveIndex(actionIndex)}
                            onClick={() => executeQuickAction(action)}
                            className={cn(
                              "flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left transition-colors",
                              active ? "bg-muted/80" : "hover:bg-muted/60",
                            )}
                          >
                            {renderQuickActionContent(action)}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )}

                {paletteGroups.map((group) => {
                const GroupIcon = icons[group.type];

                return (
                  <section key={group.type} className="py-2">
                    <div className="mb-1 flex items-center gap-2 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      <GroupIcon className="h-3.5 w-3.5" />
                      {group.label}
                    </div>
                    <div className="space-y-1">
                      {group.results.map((result) => {
                        const resultIndex = paletteItems.findIndex(
                          (item) =>
                            item.kind === "result" &&
                            item.result.type === result.type &&
                            item.result.id === result.id,
                        );
                        const active = resultIndex === activeIndex;

                        return (
                          <button
                            key={`${result.type}-${result.id}`}
                            type="button"
                            onMouseEnter={() => setActiveIndex(resultIndex)}
                            onClick={() => openResult(result)}
                            className={cn(
                              "flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left transition-colors",
                              active ? "bg-muted/80" : "hover:bg-muted/60",
                            )}
                          >
                            {renderResultContent(result)}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                );
                })}
              </>
            ) : (
              <div className="p-6 text-sm">
                <div className="font-medium text-foreground">Sem resultados</div>
                <p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">
                  Nao encontrei nada para esta pesquisa. Experimenta outro termo, tag ou descricao.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-border/70 bg-muted/20 px-4 py-2 text-[11px] text-muted-foreground">
            <span>Setas para navegar · Enter abrir · Esc fechar</span>
            <span>Preparado para Pessoas, Entidades e Compromissos</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
