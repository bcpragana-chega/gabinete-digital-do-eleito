import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const dashboard = readFileSync(new URL("./DashboardPage.tsx", import.meta.url), "utf8");

describe("composição da página Hoje", () => {
  it("renderiza apenas decisão, alertas, pendências ou estado tranquilo", () => {
    assert.match(dashboard, /<PrimaryActionCard/);
    assert.match(dashboard, /<AlertsSection/);
    assert.match(dashboard, /<PendingSection/);
    assert.match(dashboard, /<ClearState/);
    assert.doesNotMatch(
      dashboard,
      /MetricsCard|ActivityCard|RecentDocumentsCard|QuickAccessCard|O teu mandato em números|Atividade recente|Documentos recentes|Acessos rápidos/,
    );
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
    const engine = readFileSync(new URL("../../lib/today-decision.ts", import.meta.url), "utf8");
    assert.match(engine, /`\/documentos\/\$\{encodeURIComponent\(documentId\)\}\?origem=sessao/);
    assert.match(engine, /`\/sessoes\/\$\{encodeURIComponent\(sessionId\)\}\/preparacao/);
  });

  it("mantém TopBar e ajuda contextual sem métricas antigas", () => {
    assert.match(dashboard, /<TopBar \/>/);
    assert.match(dashboard, /useProductHelpPageState\(\{/);
    assert.match(dashboard, /decision\.primaryAction/);
    assert.doesNotMatch(dashboard, /progress|metrics|activity|tasks/);
  });
});
