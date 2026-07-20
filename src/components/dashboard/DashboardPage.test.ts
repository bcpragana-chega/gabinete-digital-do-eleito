import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const dashboard = readFileSync(new URL("./DashboardPage.tsx", import.meta.url), "utf8");

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
    const inicio = dashboard.indexOf("<WorkspacePage>");
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
    assert.match(dashboard, /border-primary\/35 bg-primary\/\[0\.025\][\s\S]*shadow-md/);
  });

  it("omite painéis vazios e mantém contexto acionável da próxima sessão", () => {
    assert.match(dashboard, /\{proxima && <NextSessionPanel session=\{proxima\} \/>\}/);
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
    const engine = readFileSync(new URL("../../lib/today-decision.ts", import.meta.url), "utf8");
    assert.match(engine, /`\/documentos\/\$\{encodeURIComponent\(documentId\)\}\?origem=sessao/);
    assert.match(engine, /`\/sessoes\/\$\{encodeURIComponent\(sessionId\)\}\/preparacao/);
  });

  it("mantém TopBar e ajuda contextual sem métricas inventadas", () => {
    assert.match(dashboard, /<TopBar showUtilities=\{false\} \/>/);
    assert.match(dashboard, /useProductHelpPageState\(\{/);
    assert.match(dashboard, /decision\.primaryAction/);
    assert.doesNotMatch(dashboard, /progress|metrics|activity|tasks/);
  });
});
