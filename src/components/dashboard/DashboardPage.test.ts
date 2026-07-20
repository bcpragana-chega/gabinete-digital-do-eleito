import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const dashboard = readFileSync(new URL("./DashboardPage.tsx", import.meta.url), "utf8");
const decisionEngine = readFileSync(
  new URL("../../lib/today-decision.ts", import.meta.url),
  "utf8",
);
const appLayout = readFileSync(new URL("../../routes/_app.tsx", import.meta.url), "utf8");

describe("composição da página Hoje", () => {
  it("combina a decisão central com módulos operacionais baseados em dados existentes", () => {
    assert.match(dashboard, /<PrimaryActionCard/);
    assert.match(dashboard, /<AlertsSection/);
    assert.match(dashboard, /<PendingSection/);
    assert.match(dashboard, /<ClearState/);
    assert.match(dashboard, /<NextSessionPanel/);
    assert.doesNotMatch(dashboard, /AgendaPanel|title="Agenda"/);
    assert.match(dashboard, /<SubjectsPanel/);
    assert.match(dashboard, /<RecentDocumentsPanel/);
    assert.doesNotMatch(
      dashboard,
      /MetricsCard|ActivityCard|QuickAccessCard|O teu mandato em números|Acessos rápidos/,
    );
    assert.doesNotMatch(dashboard, /radial-gradient|linear-gradient|shadow-\[0_18px_55px/);
  });

  it("impõe a hierarquia Próxima ação, Próxima sessão, alertas e conteúdo secundário", () => {
    const inicio = dashboard.indexOf("<WorkspacePage");
    const fim = dashboard.indexOf("</WorkspacePage>", inicio);
    const composition = dashboard.slice(inicio, fim);

    const primary = composition.indexOf("<PrimaryActionCard");
    const nextSession = composition.indexOf("<NextSessionPanel");
    const alerts = composition.indexOf("<AlertsSection");
    const pending = composition.indexOf("<PendingSection");
    const subjects = composition.indexOf("<SubjectsPanel");
    const documents = composition.indexOf("<RecentDocumentsPanel");

    assert.ok(primary >= 0 && primary < nextSession);
    assert.ok(nextSession < alerts && alerts < pending);
    assert.ok(pending < subjects && subjects < documents);
    assert.match(dashboard, /md:border-primary\/35 md:bg-primary\/\[0\.025\][\s\S]*md:shadow-md/);
  });

  it("omite painéis vazios e mantém contexto acionável da próxima sessão", () => {
    assert.match(dashboard, /\{proxima && \([\s\S]*<NextSessionPanel session=\{proxima\} \/>/);
    assert.match(dashboard, /assuntosAtivos\.length > 0/);
    assert.match(dashboard, /documentosRecentes\.length > 0/);
    assert.doesNotMatch(dashboard, /CompactEmptyState/);
    assert.match(dashboard, /Preparação concluída/);
    assert.match(dashboard, /Preparação em curso/);
    assert.match(dashboard, /to="\/sessoes\/\$id\/preparacao"/);
  });

  it("não duplica o onboarding de sessão e preserva as duas formas de a criar", () => {
    assert.match(dashboard, /action\.id === "onboarding-session"/);
    assert.equal((dashboard.match(/<NovaSessaoWizard/g) ?? []).length, 1);
    assert.match(dashboard, /triggerLabel="Carregar convocatória"/);
    assert.match(dashboard, /triggerLabel="Criar manualmente"/);
    assert.doesNotMatch(dashboard, /Começar por aqui/);
  });

  it("reutiliza os fluxos existentes para iniciar uma conta vazia", () => {
    assert.match(dashboard, /action\.id === "onboarding-subject"/);
    assert.equal((dashboard.match(/<NovoDossieDialog/g) ?? []).length, 1);
    assert.match(dashboard, /triggerLabel="Analisar documentos"/);
    assert.match(dashboard, /triggerVariant="secondary"/);
    assert.match(dashboard, /documentoInicial=\{documentToAnalyze\}/);
  });

  it("faz a composição depender exclusivamente da decisão central", () => {
    assert.match(dashboard, /decideToday\(\{/);
    assert.match(dashboard, /decision\.state === "clear"/);
    assert.match(dashboard, /decision\.alerts\.length > 0/);
    assert.match(dashboard, /decision\.pendingItems\.length > 0/);
    assert.match(dashboard, /\.filter\(documentoGeraPendenciaHoje\)/);
  });

  it("preserva destinos funcionais e a rota canónica de Documento", () => {
    assert.match(dashboard, /href=\{action\.href\}/);
    assert.match(dashboard, /href=\{alert\.href\}/);
    assert.match(dashboard, /href=\{item\.href\}/);
    assert.match(dashboard, /to="\/assuntos\/\$dossieId"/);
    assert.match(dashboard, /to="\/documentos\/\$documentoId"/);
    assert.match(dashboard, /search=\{\{ origem: "biblioteca" \}\}/);
    assert.match(
      decisionEngine,
      /`\/documentos\/\$\{encodeURIComponent\(documentId\)\}\?origem=sessao/,
    );
    assert.match(decisionEngine, /`\/sessoes\/\$\{encodeURIComponent\(sessionId\)\}\/preparacao/);
  });

  it("mantém TopBar e ajuda contextual sem métricas inventadas", () => {
    assert.match(dashboard, /<TopBar showUtilities=\{false\} \/>/);
    assert.match(dashboard, /useProductHelpPageState\(\{/);
    assert.match(dashboard, /decision\.primaryAction/);
    assert.doesNotMatch(dashboard, /progress|metrics|activity|tasks/);
  });

  it("apresenta exatamente uma ação principal e distingue criticidade também por texto", () => {
    assert.equal((dashboard.match(/<PrimaryActionCard/g) ?? []).length, 1);
    assert.match(dashboard, /decision\.primaryAction && \(/);
    assert.match(dashboard, /data-today-primary-action/);
    assert.match(dashboard, /critical=\{decision\.state === "critical"\}/);
    assert.match(dashboard, /critical \? "Ação prioritária" : "Próxima ação"/);
    assert.match(dashboard, /min-h-11 w-full sm:w-auto/);
  });

  it("mostra alertas e pendências apenas quando existem e respeita os limites do motor", () => {
    assert.match(dashboard, /decision\.alerts\.length > 0 && <AlertsSection/);
    assert.match(dashboard, /decision\.pendingItems\.length > 0 && \(/);
    assert.match(dashboard, /alerts\.map/);
    assert.match(dashboard, /pendingItems\.map/);
    assert.match(decisionEngine, /const MAX_ALERTS = 2/);
    assert.match(decisionEngine, /const MAX_PENDING_ITEMS = 3/);
    assert.match(decisionEngine, /return alerts\.slice\(0, MAX_ALERTS\)/);
    assert.match(decisionEngine, /pendingItems\.length === MAX_PENDING_ITEMS/);
  });

  it("mantém clear exclusivo e não inventa trabalho", () => {
    assert.match(dashboard, /decision\.state === "clear" \? \(/);
    assert.match(dashboard, /Não tens nada urgente neste momento/);
    assert.match(dashboard, /O mandato está em dia/);
    assert.match(dashboard, /to="\/assuntos"/);
    assert.match(
      decisionEngine,
      /return \{ state: "clear", primaryAction: null, alerts: \[\], pendingItems: \[\] \}/,
    );
  });

  it("mantém cada onboarding dentro da única ação principal sem duplicar fluxos", () => {
    assert.equal((dashboard.match(/action\.id === "onboarding-subject"/g) ?? []).length, 1);
    assert.equal((dashboard.match(/action\.id === "onboarding-session"/g) ?? []).length, 1);
    assert.equal((dashboard.match(/<NovoDossieDialog/g) ?? []).length, 1);
    assert.equal((dashboard.match(/<NovaSessaoWizard/g) ?? []).length, 1);
    assert.equal((dashboard.match(/triggerLabel="Carregar convocatória"/g) ?? []).length, 1);
    assert.equal((dashboard.match(/triggerLabel="Criar manualmente"/g) ?? []).length, 1);
    assert.match(dashboard, /\[&_button\]:w-full sm:\[&_button\]:w-auto/);
  });

  it("mobile segue contexto, ação, alertas e pendências sem módulos concorrentes", () => {
    const workspaceStart = dashboard.indexOf(
      '<WorkspacePage contentClassName="overflow-x-hidden">',
    );
    const workspaceEnd = dashboard.indexOf("</WorkspacePage>", workspaceStart);
    const mobileComposition = dashboard.slice(workspaceStart, workspaceEnd);

    const context = mobileComposition.indexOf("<MobileTodayContext");
    const primary = mobileComposition.indexOf("<PrimaryActionCard");
    const alerts = mobileComposition.indexOf("<AlertsSection");
    const pending = mobileComposition.indexOf("<PendingSection");

    assert.ok(context >= 0 && context < primary);
    assert.ok(primary < alerts && alerts < pending);
    assert.match(dashboard, /max-w-prose[\s\S]*md:hidden[\s\S]*data-mobile-today-context/);
    assert.match(dashboard, /hidden min-w-0 md:block[\s\S]*<NextSessionPanel/);
    assert.match(dashboard, /<aside className="hidden min-w-0 space-y-4 md:block">/);
    assert.match(dashboard, /contentClassName="overflow-x-hidden"/);
  });

  it("preserva a composição informativa desktop e o espaço da navegação mobile", () => {
    assert.match(dashboard, /md:block[\s\S]*<NextSessionPanel/);
    assert.match(dashboard, /md:block[\s\S]*<SubjectsPanel/);
    assert.match(dashboard, /md:block[\s\S]*<RecentDocumentsPanel/);
    assert.match(appLayout, /pb-\[calc\(4rem\+env\(safe-area-inset-bottom\)\)\]/);
    assert.match(appLayout, /md:ml-56 md:p-2 md:pl-0/);
  });

  it("não reintroduz métricas, checklist, atividade, atalhos ou scroll lateral", () => {
    assert.doesNotMatch(
      dashboard,
      /Metric|Checklist|Activity|Recent activity|Acessos rápidos|QuickAccess|carousel|overflow-x-auto/i,
    );
    assert.match(dashboard, /overflow-x-hidden/);
  });
});
