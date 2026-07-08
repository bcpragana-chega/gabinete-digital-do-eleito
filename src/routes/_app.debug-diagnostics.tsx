import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Copy, RefreshCw, Trash2 } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import {
  clearDiagnosticEvents,
  getDiagnosticEvents,
  type DiagnosticEvent,
} from "@/lib/debug-diagnostics";

export const Route = createFileRoute("/_app/debug-diagnostics")({
  head: () => ({
    meta: [
      { title: "Debug diagnostics — Tribuno" },
      {
        name: "description",
        content: "Diagnóstico temporário do fluxo de abertura de documentos.",
      },
    ],
  }),
  component: DebugDiagnosticsPage,
});

function prettyJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function formatData(event: DiagnosticEvent) {
  if (event.data === undefined) return "—";
  return prettyJson(event.data);
}

function DebugDiagnosticsPage() {
  const [events, setEvents] = useState<DiagnosticEvent[]>(() => getDiagnosticEvents());

  const orderedEvents = useMemo(
    () => [...events].sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
    [events],
  );

  function refresh() {
    setEvents(getDiagnosticEvents());
  }

  async function copyAll() {
    const payload = prettyJson(orderedEvents);

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(payload);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = payload;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }

  function clearAll() {
    clearDiagnosticEvents();
    setEvents([]);
  }

  return (
    <>
      <TopBar breadcrumb="Debug diagnostics" />
      <main className="min-h-screen bg-transparent">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-xl font-semibold text-foreground">Debug diagnostics</h1>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="secondary" onClick={refresh}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Atualizar
              </Button>
              <Button type="button" variant="secondary" onClick={copyAll}>
                <Copy className="mr-2 h-4 w-4" />
                Copiar JSON
              </Button>
              <Button type="button" variant="danger" onClick={clearAll}>
                <Trash2 className="mr-2 h-4 w-4" />
                Limpar
              </Button>
            </div>
          </div>

          <p className="mb-4 text-sm text-muted-foreground">
            Eventos guardados em <code>localStorage["tribuno_debug_diagnostics"]</code>
          </p>

          {orderedEvents.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
              Sem eventos registados.
            </div>
          ) : (
            <div className="space-y-3">
              {orderedEvents.map((event, index) => (
                <article key={`${event.timestamp}-${event.area}-${event.message}-${index}`} className="rounded-2xl border border-border bg-card p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{event.timestamp}</span>
                    <span>•</span>
                    <span className="font-medium text-foreground">{event.area}</span>
                    <span>•</span>
                    <span>{event.message}</span>
                  </div>
                  <pre className="overflow-x-auto rounded-lg bg-muted/40 p-3 text-xs leading-relaxed text-foreground">
                    {formatData(event)}
                  </pre>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
