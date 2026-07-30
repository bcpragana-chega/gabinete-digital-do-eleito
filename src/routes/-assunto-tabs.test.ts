import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const detalhe = readFileSync(
  new URL("./_app.assuntos.$dossieId.index.tsx", import.meta.url),
  "utf8",
);

function painel(id: string) {
  const inicio = detalhe.indexOf(`id="tabpanel-${id}"`);
  assert.ok(inicio >= 0, `Painel ${id} não encontrado`);
  const proximo = detalhe.indexOf('id="tabpanel-', inicio + 1);
  return detalhe.slice(inicio, proximo >= 0 ? proximo : undefined);
}

describe("tabs do detalhe do Assunto", () => {
  it("abre Visão geral por defeito e mantém apenas o painel ativo visível", () => {
    assert.match(detalhe, /const tabAtiva = tab \?\? "visao-geral"/);
    for (const id of ["visao-geral", "trabalho", "relacoes", "historico"]) {
      assert.match(detalhe, new RegExp(`hidden=\\{tabAtiva !== "${id}"\\}`));
    }
    assert.equal((detalhe.match(/role="tabpanel"/g) ?? []).length, 4);
  });

  it("liga cada trigger ao painel e atualiza a tab sem recarregar a página", () => {
    assert.match(detalhe, /onClick=\{\(\) => selecionarTab\(id\)\}/);
    assert.match(detalhe, /void navigate\(\{ search: \{ tab: novaTab \} \}\)/);
    assert.doesNotMatch(
      detalhe,
      /href="#(?:visao-geral|trabalho-assunto|relacoes-assunto|atividade-assunto)"/,
    );
    assert.match(detalhe, /aria-controls=\{`tabpanel-\$\{id\}`\}/);
    assert.match(detalhe, /aria-labelledby="tab-visao-geral"/);
    assert.match(detalhe, /aria-labelledby="tab-trabalho"/);
    assert.match(detalhe, /aria-labelledby="tab-relacoes"/);
    assert.match(detalhe, /aria-labelledby="tab-historico"/);
  });

  it("mostra documentos, acompanhamento e notas apenas em Trabalho", () => {
    const trabalho = painel("trabalho");
    assert.match(trabalho, /DossieDocumentosCriadosSection/);
    assert.match(trabalho, /DossieAcompanhamentoSection/);
    assert.match(trabalho, /DossieNotasSection/);
    assert.doesNotMatch(painel("visao-geral"), /DossieDocumentosCriadosSection/);
    assert.doesNotMatch(painel("relacoes"), /DossieDocumentosCriadosSection/);
    assert.doesNotMatch(painel("historico"), /DossieDocumentosCriadosSection/);
  });

  it("isola Relações e Histórico nos respetivos painéis", () => {
    const relacoes = painel("relacoes");
    const historico = painel("historico");
    assert.match(relacoes, /DossieRelacionadosSection/);
    assert.doesNotMatch(relacoes, /DossieTimelineSection|Marcos do assunto/);
    assert.match(historico, /DossieTimelineSection/);
    assert.match(historico, /title="Marcos do assunto"/);
    assert.doesNotMatch(historico, /DossieRelacionadosSection/);
  });

  it("valida e restaura as quatro tabs através da query string", () => {
    assert.match(detalhe, /validateSearch:/);
    assert.match(detalhe, /tab: isAssuntoTab\(search\.tab\) \? search\.tab : undefined/);
    for (const id of ["visao-geral", "trabalho", "relacoes", "historico"]) {
      assert.match(detalhe, new RegExp(`\\{ id: "${id}", label:`));
    }
    assert.match(detalhe, /const \{ tab \} = Route\.useSearch\(\)/);
  });

  it("oferece semântica, teclado e navegação horizontal responsiva", () => {
    assert.match(detalhe, /role="tablist"/);
    assert.match(detalhe, /role="tab"/);
    assert.match(detalhe, /aria-selected=\{tabAtiva === id\}/);
    assert.match(detalhe, /tabIndex=\{tabAtiva === id \? 0 : -1\}/);
    for (const key of ["ArrowRight", "ArrowLeft", "Home", "End"]) {
      assert.match(detalhe, new RegExp(`event\\.key === "${key}"`));
    }
    assert.match(detalhe, /tabRefs\.current\[proximaTab\]\?\.focus\(\)/);
    assert.match(detalhe, /className="mt-3 overflow-x-auto"/);
    assert.match(detalhe, /md:flex-wrap/);
  });

  it("mantém os componentes montados para preservar o seu estado interno", () => {
    assert.doesNotMatch(detalhe, /tabAtiva === "[^"]+"\s*&&\s*\(/);
    for (const componente of [
      "DossieDocumentosCriadosSection",
      "DossieAcompanhamentoSection",
      "DossieNotasSection",
      "DossieRelacionadosSection",
      "DossieTimelineSection",
    ]) {
      assert.equal((detalhe.match(new RegExp(`<${componente}\\b`, "g")) ?? []).length, 1);
    }
  });
});
