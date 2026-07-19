import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function fonte(path: string) {
  return readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

const biblioteca = fonte("src/routes/_app.biblioteca.tsx");
const manual = fonte("src/components/biblioteca/AdicionarBibliotecaWizard.tsx");
const intake = fonte("src/components/documentos/InstitutionalDocumentIntake.tsx");
const detalhe = fonte("src/components/documentos/DocumentoRecebidoDetalhe.tsx");
const formularioSessao = fonte("src/components/documentos/DocumentoForm.tsx");

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

  it("cria manualmente por rever, ativo e não importante sem seletor misturado", () => {
    assert.match(manual, /estado: "Por rever"/);
    assert.match(manual, /importante: false/);
    assert.doesNotMatch(manual, /Estado inicial|setEstado|EstadoInicial/);
    assert.match(formularioSessao, /estado: "Por rever"/);
    assert.match(formularioSessao, /importante: false/);
    assert.doesNotMatch(formularioSessao, /<Label>Estado<\/Label>|setEstado/);
  });

  it("apresenta tratamento, importância e arquivo como badges e ações independentes", () => {
    assert.match(detalhe, /<DocumentoEstadoBadge estado=\{documento\.estado\}/);
    assert.match(detalhe, /documento\.importante[\s\S]*Importante/);
    assert.match(detalhe, /documento\.archivedAt[\s\S]*Arquivado/);
    assert.match(detalhe, /Marcar como revisto/);
    assert.match(detalhe, /Marcar como por rever/);
    assert.match(detalhe, /Marcar como importante/);
    assert.match(detalhe, /Deixar de marcar importante/);
    assert.match(detalhe, /Restaurar/);
    assert.match(detalhe, /Arquivar/);
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
