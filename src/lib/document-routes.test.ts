import assert from "node:assert/strict";
import test from "node:test";
import {
  hrefDocumentoCriado,
  rotaDocumentoCriado,
  rotaDocumentoInstitucional,
} from "@/lib/document-routes";

test("documento de assunto abre no editor canónico do assunto", () => {
  assert.equal(rotaDocumentoCriado({ id: "doc 1" }), "/documentos/doc%201");
});

test("documento institucional usa a rota canónica com origem Sessão", () => {
  assert.equal(
    rotaDocumentoInstitucional({ id: "doc-1", assembleiaId: "sessao-1" }),
    "/documentos/doc-1?origem=sessao&sessaoId=sessao-1",
  );
});

test("documento institucional sem sessão usa a rota canónica com origem Biblioteca", () => {
  assert.equal(
    rotaDocumentoInstitucional({ id: "doc-1", assembleiaId: undefined }),
    "/documentos/doc-1?origem=biblioteca",
  );
});

test("documento criado depende apenas do ID", () => {
  assert.equal(hrefDocumentoCriado("doc-1"), "/documentos/doc-1");
  assert.equal(rotaDocumentoCriado({ id: "doc-1" }), "/documentos/doc-1");
});
