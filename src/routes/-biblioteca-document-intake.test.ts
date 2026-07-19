import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function fonte(path: string) {
  return readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

const biblioteca = fonte("src/routes/_app.biblioteca.tsx");
const manual = fonte("src/components/biblioteca/AdicionarBibliotecaWizard.tsx");
const intake = fonte("src/components/documentos/InstitutionalDocumentIntake.tsx");

describe("entrada documental principal da Biblioteca", () => {
  it("apresenta a análise de PDF como única ação principal", () => {
    assert.match(biblioteca, /triggerLabel="Adicionar e analisar PDF"\s+triggerVariant="primary"/);
    assert.match(manual, /<Button variant="secondary"[^>]*>[\s\S]*Adicionar manualmente/);
    assert.doesNotMatch(manual, /<Button(?:\s+className="[^"]*")?>[\s\S]*Adicionar manualmente/);
  });

  it("mantém a entrada manual como alternativa secundária", () => {
    assert.match(biblioteca, /<AdicionarBibliotecaWizard \/>/);
    assert.match(manual, /Adicionar manualmente/);
  });

  it("a revisão documental geral não contém linguagem nem campos de Sessão", () => {
    const inicio = intake.indexOf("function DocumentReviewForm");
    const fim = intake.indexOf("export function ReviewForm");
    const formularioDocumental = intake.slice(inicio, fim);
    assert.match(formularioDocumental, /Título do documento/);
    assert.match(formularioDocumental, /Tipo documental/);
    assert.match(formularioDocumental, /organizado na Biblioteca/);
    assert.doesNotMatch(formularioDocumental, /preparar sessão|Título da sessão|Órgão|Hora/);
    assert.match(intake, /Confirmar e guardar documento/);
  });

  it("convocatórias em confirmação continuam ligadas à revisão e confirmação de Sessão", () => {
    assert.match(intake, /destinoPreparaSessao\(destino\)/);
    assert.match(intake, /preparaSessao \? \(/);
    assert.match(intake, /<ReviewForm/);
    assert.match(intake, /preparaSessao[\s\S]*Confirmar e preparar sessão/);
    assert.match(intake, /preparaSessao[\s\S]*confirm\(\)/);
  });

  it("assinala incertezas junto dos campos e mantém o local integralmente editável", () => {
    const inicio = intake.indexOf("export function ReviewForm");
    const formularioSessao = intake.slice(inicio);
    assert.match(formularioSessao, /obterIncertezaCampoSessao\(analise, "orgao"\)/);
    assert.match(formularioSessao, /Confirmar/);
    assert.match(formularioSessao, /border-amber-500/);
    assert.match(formularioSessao, /<Textarea[\s\S]*value=\{sessao\.local \?\? ""\}/);
  });

  it("apresenta uma única instrução introdutória para a revisão de Sessão", () => {
    assert.equal(intake.match(/Reveja os dados assinalados/g)?.length, 1);
    assert.doesNotMatch(intake, /Reveja e corrija o que for necessário/);
    assert.doesNotMatch(intake, /Pode corrigir os dados antes de confirmar/);
  });
});
