import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { resolverContextoNavegacaoDocumento } from "@/components/documentos/DocumentoContextoNavegacao";

function fonte(caminho: string) {
  return readFileSync(resolve(process.cwd(), caminho), "utf8");
}

describe("detalhe canónico de Documento", () => {
  const rotaCanonica = fonte("src/routes/_app.documentos.$documentoId.tsx");
  const detalheCriado = fonte("src/components/documentos/DocumentoCriadoDetalhe.tsx");
  const detalheRecebido = fonte("src/components/documentos/DocumentoRecebidoDetalhe.tsx");
  const biblioteca = fonte("src/routes/_app.biblioteca.documentos.$docId.tsx");
  const sessao = fonte("src/routes/_app.sessoes.$id.documentos.$docId.tsx");
  const assembleia = fonte("src/routes/_app.assembleias.$id.documentos.$docId.tsx");
  const assunto = fonte("src/routes/_app.assuntos.$dossieId.documentos.$documentoId.tsx");
  const dossie = fonte("src/routes/_app.dossies.$dossieId.documentos.$documentoId.tsx");

  it("mantém uma única rota funcional para documentos criados, carregados e recebidos", () => {
    assert.match(rotaCanonica, /component: DocumentoDetalhePage/);
    assert.match(rotaCanonica, /useDocumento\(documentoId\)/);
    assert.match(rotaCanonica, /<DocumentoRecebidoDetalhe/);
    assert.match(rotaCanonica, /<DocumentoCriadoDetalhe/);
    assert.match(detalheCriado, /guardarDocumentoCriadoConfirmado/);
    assert.match(detalheCriado, /exportarDocumentoCriadoPDF/);
    assert.match(detalheCriado, /exportarDocumentoCriadoWord/);
    assert.match(detalheRecebido, /<DocumentoPreview/);
    assert.match(detalheRecebido, /criarRelacaoTribuno/);
  });

  it("transforma as rotas paralelas e antigas em redirects finos e diretos", () => {
    for (const source of [biblioteca, sessao, assembleia, assunto, dossie]) {
      assert.match(source, /<LegacyRedirect/);
      assert.match(source, /to="\/documentos\//);
      assert.doesNotMatch(source, /DocumentoPreview|DocumentoEstadoBadge|DocumentoCriadoDetalhe/);
    }
    assert.match(biblioteca, /origem=biblioteca/);
    assert.match(sessao, /origem=sessao&sessaoId=\$id/);
    assert.match(assembleia, /origem=sessao&sessaoId=\$id/);
    assert.match(assunto, /origem=assunto&assuntoId=\$dossieId/);
    assert.match(dossie, /origem=assunto&assuntoId=\$dossieId/);
    assert.doesNotMatch(assembleia, /to="\/sessoes\//);
  });

  it("usa a origem apenas no contexto visual de navegação", () => {
    assert.match(rotaCanonica, /const origem = Route\.useSearch\(\)/);
    assert.match(rotaCanonica, /useDocumento\(documentoId\)/);
    assert.doesNotMatch(rotaCanonica, /useDocumento\([^)]*origem/);
    assert.match(detalheCriado, /obterDocumentoCriadoPorId\(documentoId\)/);
    assert.doesNotMatch(detalheCriado, /obterDocumentoCriadoPorId\([^)]*origem/);
  });

  it("faz os links internos normais evitarem os redirects de compatibilidade", () => {
    for (const caminho of [
      "src/routes/_app.biblioteca.tsx",
      "src/routes/_app.sessoes.$id.tsx",
      "src/components/documentos/DocumentoCard.tsx",
      "src/components/dashboard/DashboardPage.tsx",
      "src/components/dossies/DossieDocumentosCriadosSection.tsx",
      "src/components/preparacao/DocumentosACriarSection.tsx",
      "src/components/assembleias/SessaoPreparacaoWizard.tsx",
      "src/lib/document-routes.ts",
      "src/lib/documentos-store.ts",
    ]) {
      const source = fonte(caminho);
      assert.doesNotMatch(source, /\/biblioteca\/documentos\//);
      assert.doesNotMatch(source, /\/sessoes\/[^\s"`]*\/documentos\//);
      assert.doesNotMatch(source, /\/assembleias\/[^\s"`]*\/documentos\//);
      assert.doesNotMatch(source, /\/dossies\/[^\s"`]*\/documentos\//);
    }
  });
});

describe("origem validada do Documento", () => {
  const relacoes = { sessaoIds: ["sessao-1"], assuntoIds: ["assunto-1"] };

  it("altera apenas o regresso para Biblioteca, Sessão ou Assunto quando a relação existe", () => {
    assert.deepEqual(resolverContextoNavegacaoDocumento({ origem: "biblioteca" }, relacoes), {
      origem: "biblioteca",
      hrefRegresso: "/biblioteca",
      labelRegresso: "Voltar à Biblioteca",
    });
    assert.deepEqual(
      resolverContextoNavegacaoDocumento({ origem: "sessao", sessaoId: "sessao-1" }, relacoes),
      {
        origem: "sessao",
        sessaoId: "sessao-1",
        hrefRegresso: "/sessoes/sessao-1",
        labelRegresso: "Voltar à sessão",
      },
    );
    assert.deepEqual(
      resolverContextoNavegacaoDocumento({ origem: "assunto", assuntoId: "assunto-1" }, relacoes),
      {
        origem: "assunto",
        assuntoId: "assunto-1",
        hrefRegresso: "/assuntos/assunto-1",
        labelRegresso: "Voltar ao assunto",
      },
    );
  });

  it("ignora origens desconhecidas, incompletas, contraditórias ou sem relação real", () => {
    for (const search of [
      {},
      { origem: "desconhecida" },
      { origem: "sessao" },
      { origem: "sessao", sessaoId: "outra-sessao" },
      { origem: "assunto", assuntoId: "outro-assunto" },
      { origem: "biblioteca", sessaoId: "sessao-1" },
    ]) {
      assert.deepEqual(resolverContextoNavegacaoDocumento(search, relacoes), {
        origem: "padrao",
        hrefRegresso: "/biblioteca",
        labelRegresso: "Voltar à Biblioteca",
      });
    }
  });

  it("codifica IDs válidos sem permitir que alterem a identidade do documento", () => {
    assert.equal(
      resolverContextoNavegacaoDocumento(
        { origem: "sessao", sessaoId: "sessão/1" },
        { sessaoIds: ["sessão/1"] },
      ).hrefRegresso,
      "/sessoes/sess%C3%A3o%2F1",
    );
  });
});
