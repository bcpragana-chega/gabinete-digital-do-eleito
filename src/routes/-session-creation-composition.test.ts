import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

function fonte(caminho: string) {
  return readFileSync(resolve(process.cwd(), caminho), "utf8");
}

describe("criação e preparação de sessões", () => {
  const wizard = fonte("src/components/assembleias/NovaSessaoWizard.tsx");
  const intake = fonte("src/components/documentos/InstitutionalDocumentIntake.tsx");
  const workspace = fonte("src/routes/_app.sessoes.$id.tsx");
  const dashboard = fonte("src/components/dashboard/DashboardPage.tsx");
  const todayDecision = fonte("src/lib/today-decision.ts");

  it("apresenta convocatória opcional e formulário manual numa única vista", () => {
    assert.match(wizard, /<DialogTitle>Preparar próxima sessão<\/DialogTitle>/);
    assert.match(wizard, /InstitutionalDocumentIntake triggerLabel="Carregar convocatória"/);
    assert.match(wizard, />\s*ou\s*<\/span>/);
    assert.match(wizard, /id="form-criar-sessao-manual"/);
    assert.match(wizard, /Tipo de sessão/);
    assert.match(wizard, /nova-sessao-data/);
    assert.match(wizard, /nova-sessao-hora/);
    assert.match(wizard, /nova-sessao-local/);
    assert.match(wizard, /Título adicional \(opcional\)/);
    assert.match(wizard, /Pode corrigir os dados extraídos antes de confirmar a sessão/);
    assert.match(wizard, /A sessão só será criada quando selecionar “Criar sessão”/);
    assert.doesNotMatch(wizard, /const passos|<Progress|Passo [1-5]|Estratégia|Revisão/);
    assert.doesNotMatch(wizard, /adicionarPonto|adicionarDocumentoConfirmado/);
  });

  it("cria manualmente com título opcional e apenas dados essenciais obrigatórios", () => {
    assert.match(wizard, /const dadosValidos = Boolean\(data && hora && local\.trim\(\)\)/);
    assert.equal((wizard.match(/\brequired\b/g) ?? []).length, 3);
    assert.match(wizard, /gerarTituloSessaoManual\(\{ tipoSessao, data, tituloAdicional \}\)/);
    assert.match(wizard, /nome: nomeSessao/);
    assert.match(wizard, /estado: "preparacao"/);
  });

  it("preserva concorrência, tentativa estável, retry e navegação direta", () => {
    assert.match(wizard, /if \(!dadosValidos \|\| guardarEmCurso\.current\) return/);
    assert.match(wizard, /tentativaRef\.current \?\?/);
    assert.match(wizard, /executarTentativaCriacaoSessao\(\{/);
    assert.match(wizard, /guardarTentativaCriacaoSessao/);
    assert.match(wizard, /Os dados foram mantidos; tente novamente/);
    assert.match(wizard, /navigate\(\{ to: "\/sessoes\/\$id", params: \{ id: sessaoId \} \}\)/);
  });

  it("mantém o fluxo institucional responsável por duplicados e confirmação", () => {
    assert.match(intake, /executarConfirmacaoAnaliseComDependencias/);
    assert.match(intake, /setStep\("duplicate"\)/);
    assert.match(intake, /Atualizar sessão existente/);
    assert.match(intake, /Confirmar e preparar sessão/);
    assert.match(intake, /A sessão só será criada ao selecionar/);
  });

  it("uma sessão vazia mostra a próxima ação no workspace", () => {
    assert.match(
      workspace,
      /documentos\.length === 0 && pontos\.length === 0 && assuntosDaSessao\.length === 0/,
    );
    assert.match(workspace, /Continue a preparar a sessão/);
    assert.match(workspace, /triggerLabel="Carregar convocatória"/);
    assert.match(workspace, /triggerLabel="Adicionar primeiro ponto"/);
    assert.match(workspace, /href="#assuntos">Associar assunto/);
    assert.match(workspace, /if \(!assembleia\)/);
  });

  it("o dashboard recomenda a convocatória sem a tornar obrigatória", () => {
    assert.match(todayDecision, /Preparar a primeira sessão/);
    assert.match(todayDecision, /Carrega a convocatória[\s\S]*ou cria a sessão manualmente/);
    assert.match(dashboard, /triggerLabel="Carregar convocatória"/);
    assert.match(dashboard, /triggerLabel="Criar manualmente"/);
    assert.doesNotMatch(dashboard, /Adicionar a convocatória da próxima sessão/);
  });
});
