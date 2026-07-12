import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

function fonte(nome: string) {
  return readFileSync(resolve(process.cwd(), "src/routes", nome), "utf8");
}

describe("composição das rotas de Assunto", () => {
  const layout = fonte("_app.assuntos.$dossieId.tsx");
  const index = fonte("_app.assuntos.$dossieId.index.tsx");
  const editor = fonte("_app.assuntos.$dossieId.documentos.$documentoId.tsx");

  it("rota-pai é exclusivamente um layout com Outlet", () => {
    assert.match(layout, /return <Outlet \/>/);
    assert.doesNotMatch(layout, /DossieDocumentosCriadosSection|WorkspaceLayout|DossieDetalhePage/);
  });

  it("detalhe completo do Assunto está na rota index", () => {
    assert.match(index, /createFileRoute\("\/_app\/assuntos\/\$dossieId\/"\)/);
    assert.match(index, /component: DossieDetalhePage/);
    assert.match(index, /<DossieDocumentosCriadosSection dossieId=\{dossie\.id\}/);
  });

  it("rota documental monta apenas o editor documental", () => {
    assert.match(editor, /component: DocumentoDoAssuntoPage/);
    assert.doesNotMatch(editor, /DossieDocumentosCriadosSection|function DossieDetalhePage/);
  });
});
