import { Link } from "@tanstack/react-router";
import {
  CalendarDays,
  Clock3,
  FileText,
  NotebookText,
  Search,
  StickyNote,
  Users,
  Building2,
  ScrollText,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { pesquisarUniversal, type UniversalSearchType } from "@/lib/universal-search";
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

export function UniversalSearch() {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [revision, setRevision] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const groups = useMemo(() => pesquisarUniversal(query), [query, revision]);
  const showPanel = focused && query.trim().length > 0;
  const hasResults = groups.length > 0;

  return (
    <div ref={containerRef} className="relative hidden lg:block">
      <div
        className={cn(
          "flex w-72 items-center gap-2 rounded-md border border-input bg-card px-3 py-1.5",
          focused && "border-ring",
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
      </div>

      {showPanel && (
        <div className="absolute right-0 top-11 z-50 w-[28rem] overflow-hidden rounded-xl border border-border bg-card shadow-xl">
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
                      {group.results.map((result) => {
                        const ResultIcon = icons[result.type];

                        return (
                          <Link
                            key={`${result.type}-${result.id}`}
                            to={result.href as never}
                            onClick={() => {
                              setFocused(false);
                              setQuery("");
                            }}
                            className="flex items-start gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-accent"
                          >
                            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                              <ResultIcon className="h-4 w-4" strokeWidth={1.75} />
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-foreground">
                                {result.title}
                              </span>
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
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : (
            <div className="p-5 text-sm">
              <div className="font-medium text-foreground">Sem resultados</div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Tenta pesquisar por título, resumo, objetivo político, descrição ou tag.
              </p>
            </div>
          )}

          <div className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
            Preparado para incluir Pessoas, Entidades e Compromissos.
          </div>
        </div>
      )}
    </div>
  );
}
