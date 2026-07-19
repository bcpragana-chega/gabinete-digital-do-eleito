import { CircleHelp, LoaderCircle, RotateCcw, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { pedirAjudaTribuno } from "@/lib/ai/product-help-api";
import type { MensagemAjuda } from "@/lib/ai/product-help";
import { useCurrentProductHelpPageState } from "@/components/help/ProductHelpPageState";
import { getSupabaseClient } from "@/lib/supabase";

export const SUGESTOES_AJUDA = [
  "O que posso fazer aqui?",
  "Qual é o próximo passo?",
  "Como funciona o Tribuno?",
] as const;

export const MENSAGEM_ERRO_AJUDA =
  "Não foi possível obter uma resposta do assistente. Tente novamente.";

export function podeEnviarMensagemAjuda(texto: string, envioEmCurso: boolean) {
  return Boolean(texto.trim()) && !envioEmCurso;
}

type HelpAssistantPanelProps = {
  pathname: string;
  triggerClassName: string;
};

export function HelpAssistantPanel({ pathname, triggerClassName }: HelpAssistantPanelProps) {
  const pageState = useCurrentProductHelpPageState();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<MensagemAjuda[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();
  const [lastFailedQuestion, setLastFailedQuestion] = useState<string>();
  const envioEmCurso = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, sending, error]);

  function alterarAbertura(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setMessages([]);
      setDraft("");
      setError(undefined);
      setLastFailedQuestion(undefined);
    }
  }

  async function enviarMensagem(texto: string, retry = false) {
    const content = texto.trim();
    if (!podeEnviarMensagemAjuda(content, envioEmCurso.current)) return;

    envioEmCurso.current = true;
    setSending(true);
    setError(undefined);
    setDraft("");
    const nextMessages: MensagemAjuda[] = retry
      ? messages
      : [...messages, { role: "user", content }];
    if (!retry) setMessages(nextMessages);

    try {
      const supabase = getSupabaseClient();
      const { data, error: authError } = supabase
        ? await supabase.auth.getSession()
        : { data: { session: null }, error: new Error("AUTH_REQUIRED") };
      const accessToken = data.session?.access_token;
      if (authError || !accessToken) throw new Error("AUTH_REQUIRED");

      const result = await pedirAjudaTribuno({
        data: { accessToken, pathname, messages: nextMessages.slice(-8), pageState },
      });
      if (!result.ok) throw new Error(result.code);

      setMessages((current) => [...current, { role: "assistant", content: result.answer }]);
      setLastFailedQuestion(undefined);
    } catch {
      setError(MENSAGEM_ERRO_AJUDA);
      setLastFailedQuestion(content);
    } finally {
      envioEmCurso.current = false;
      setSending(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={alterarAbertura}>
      <SheetTrigger asChild>
        <button type="button" aria-label="Abrir Assistente Tribuno" className={triggerClassName}>
          <CircleHelp className="h-4 w-4 shrink-0 opacity-90" strokeWidth={1.75} />
          <span>Ajuda</span>
        </button>
      </SheetTrigger>

      <SheetContent
        side="right"
        overlayClassName="bg-black/25"
        closeLabel="Fechar Assistente Tribuno"
        className="flex h-full w-[96vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[420px]"
      >
        <SheetHeader className="shrink-0 border-b border-border/70 px-5 py-5 pr-12 text-left">
          <SheetTitle>Assistente Tribuno</SheetTitle>
          <SheetDescription>Ajuda para perceber onde está e o que fazer a seguir.</SheetDescription>
          <p className="text-xs text-muted-foreground">Não altera os seus dados.</p>
        </SheetHeader>

        <div
          className="flex-1 space-y-4 overflow-y-auto px-5 py-5"
          aria-live="polite"
          aria-busy={sending}
        >
          {messages.length === 0 && (
            <div className="space-y-4">
              <p className="rounded-2xl rounded-tl-md bg-muted/70 px-4 py-3 text-sm leading-6 text-foreground">
                Olá, sou o assistente do Tribuno. Posso explicar esta página, ajudar a encontrar uma
                função ou indicar o próximo passo.
              </p>
              <div className="space-y-2" aria-label="Sugestões de perguntas">
                {SUGESTOES_AJUDA.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    disabled={sending}
                    onClick={() => void enviarMensagem(suggestion)}
                    className="w-full rounded-xl border border-border/70 bg-card px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <p
                className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${
                  message.role === "user"
                    ? "rounded-tr-md bg-primary text-primary-foreground"
                    : "rounded-tl-md bg-muted/70 text-foreground"
                }`}
              >
                {message.content}
              </p>
            </div>
          ))}

          {sending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />A preparar uma
              resposta…
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-destructive/20 bg-destructive/5 p-3"
            >
              <p className="text-sm text-destructive">{error}</p>
              {lastFailedQuestion && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  disabled={sending}
                  onClick={() => void enviarMensagem(lastFailedQuestion, true)}
                >
                  <RotateCcw />
                  Tentar novamente
                </Button>
              )}
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form
          className="shrink-0 border-t border-border/70 bg-background px-4 py-4"
          onSubmit={(event) => {
            event.preventDefault();
            void enviarMensagem(draft);
          }}
        >
          <label htmlFor="tribuno-help-message" className="sr-only">
            Pergunta sobre o Tribuno
          </label>
          <div className="flex items-end gap-2">
            <Textarea
              id="tribuno-help-message"
              value={draft}
              maxLength={1000}
              rows={2}
              disabled={sending}
              placeholder="Pergunte como utilizar o Tribuno…"
              className="max-h-32 min-h-11 resize-none"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void enviarMensagem(draft);
                }
              }}
            />
            <Button
              type="submit"
              size="icon"
              aria-label="Enviar mensagem"
              disabled={!draft.trim() || sending}
            >
              {sending ? <LoaderCircle className="animate-spin" /> : <Send />}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
