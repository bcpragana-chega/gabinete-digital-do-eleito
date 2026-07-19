import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  MENSAGEM_ERRO_AJUDA,
  podeEnviarMensagemAjuda,
  SUGESTOES_AJUDA,
} from "./HelpAssistantPanel";

const panel = readFileSync(new URL("./HelpAssistantPanel.tsx", import.meta.url), "utf8");
const sidebar = readFileSync(new URL("../layout/AppSidebar.tsx", import.meta.url), "utf8");
const topBar = readFileSync(new URL("../layout/TopBar.tsx", import.meta.url), "utf8");
const sidebarConfig = readFileSync(new URL("../layout/sidebar-config.ts", import.meta.url), "utf8");
const sheet = readFileSync(new URL("../ui/sheet.tsx", import.meta.url), "utf8");
const helpApi = readFileSync(new URL("../../lib/ai/product-help-api.ts", import.meta.url), "utf8");
const pageStateConsumers = [
  "../dashboard/DashboardPage.tsx",
  "../../routes/_app.assuntos.index.tsx",
  "../../routes/_app.sessoes.index.tsx",
  "../preparacao/PreparationGuidancePanel.tsx",
  "../../routes/_app.biblioteca.tsx",
  "../../routes/_app.agenda.tsx",
].map((path) => readFileSync(new URL(path, import.meta.url), "utf8"));

describe("painel do Assistente Tribuno", () => {
  it("coloca Ajuda no fundo da sidebar e fora da navegação principal", () => {
    assert.match(sidebar, /border-t[\s\S]*<HelpAssistantPanel/);
    assert.match(sidebar, /pathname=\{pathname\}/);
    assert.doesNotMatch(sidebarConfig, /Ajuda|CircleHelp|HelpAssistantPanel/);
  });

  it("reutiliza exatamente a variante visual dos itens de navegação", () => {
    const trigger = panel.slice(panel.indexOf("<SheetTrigger"), panel.indexOf("</SheetTrigger>"));
    assert.match(sidebar, /className=\{sidebarItemClassName\(active, "desktop"\)\}/);
    assert.match(sidebar, /triggerClassName=\{sidebarItemClassName\(false, "desktop"\)\}/);
    assert.match(topBar, /className=\{sidebarItemClassName\(active, "mobile"\)\}/);
    assert.match(topBar, /triggerClassName=\{sidebarItemClassName\(false, "mobile"\)\}/);
    assert.match(trigger, /className=\{triggerClassName\}/);
    assert.doesNotMatch(trigger, /hover:bg-muted|rounded-xl px-3 py-2\.5/);
  });

  it("abre e fecha com Sheet, overlay e Escape acessíveis", () => {
    assert.match(panel, /<Sheet open=\{open\} onOpenChange=\{alterarAbertura\}>/);
    assert.match(panel, /aria-label="Abrir Assistente Tribuno"/);
    assert.match(panel, /overlayClassName="bg-black\/25"/);
    assert.match(panel, /closeLabel="Fechar Assistente Tribuno"/);
    assert.match(sheet, /@radix-ui\/react-dialog/);
    assert.doesNotMatch(panel, /onEscapeKeyDown/);
  });

  it("apresenta e envia as sugestões como mensagens normais", () => {
    assert.deepEqual(SUGESTOES_AJUDA, [
      "O que posso fazer aqui?",
      "Qual é o próximo passo?",
      "Como funciona o Tribuno?",
    ]);
    assert.match(panel, /onClick=\{\(\) => void enviarMensagem\(suggestion\)\}/);
  });

  it("bloqueia mensagens vazias e envios concorrentes", () => {
    assert.equal(podeEnviarMensagemAjuda("   ", false), false);
    assert.equal(podeEnviarMensagemAjuda("Ajuda", true), false);
    assert.equal(podeEnviarMensagemAjuda("Ajuda", false), true);
    assert.match(panel, /envioEmCurso\.current = true/);
    assert.match(panel, /envioEmCurso\.current = false/);
  });

  it("apresenta erro seguro e permite tentar novamente", () => {
    assert.equal(
      MENSAGEM_ERRO_AJUDA,
      "Não foi possível obter uma resposta do assistente. Tente novamente.",
    );
    assert.match(panel, /role="alert"/);
    assert.match(panel, /Tentar novamente/);
    assert.doesNotMatch(MENSAGEM_ERRO_AJUDA, /stack|OpenAI|Supabase|token/i);
  });

  it("implementa Enter, Shift+Enter e scroll automático", () => {
    assert.match(panel, /event\.key === "Enter" && !event\.shiftKey/);
    assert.match(panel, /scrollIntoView/);
  });

  it("fechado não pede sessão, não chama OpenAI e não importa código server-only", () => {
    const enviar = panel.slice(
      panel.indexOf("async function enviarMensagem"),
      panel.indexOf("return ("),
    );
    assert.match(enviar, /getSession\(\)/);
    assert.doesNotMatch(
      panel.slice(0, panel.indexOf("async function enviarMensagem")),
      /getSession/,
    );
    assert.doesNotMatch(panel, /product-help\.server/);
    assert.match(panel, /product-help-api/);
    assert.match(helpApi, /await import\("@\/lib\/ai\/product-help\.server"\)/);
  });

  it("inclui o estado seguro atual no pedido quando está disponível", () => {
    assert.match(panel, /const pageState = useCurrentProductHelpPageState\(\)/);
    assert.match(panel, /messages: nextMessages\.slice\(-8\), pageState/);
    for (const consumer of pageStateConsumers) {
      assert.match(consumer, /useProductHelpPageState\(\{/);
    }
  });
});
