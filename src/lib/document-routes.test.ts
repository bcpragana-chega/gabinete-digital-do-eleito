import assert from "node:assert/strict";
import test from "node:test";
import { rotaDocumentoCriado, rotaDocumentoInstitucional } from "@/lib/document-routes";

test("documento de assunto abre no editor canónico do assunto", () => {
  assert.equal(
    rotaDocumentoCriado({ id: "doc 1", assuntoId: "assunto 1" }),
    "/assuntos/assunto%201/documentos/doc%201",
  );
});

test("documento institucional usa a sessão quando está associado", () => {
  assert.equal(
    rotaDocumentoInstitucional({ id: "doc-1", assembleiaId: "sessao-1" }),
    "/sessoes/sessao-1/documentos/doc-1",
  );
});

test("documento institucional sem sessão abre na Biblioteca", () => {
  assert.equal(
    rotaDocumentoInstitucional({ id: "doc-1", assembleiaId: undefined }),
    "/biblioteca/documentos/doc-1",
  );
});

test("rascunho de ponto preserva sessão, ponto e documento", () => {
  assert.equal(
    rotaDocumentoCriado({
      id: "doc-1",
      assembleiaId: "sessao-1",
      pontoId: "ponto-1",
    }),
    "/sessoes/sessao-1/preparacao/pontos/ponto-1/rascunhos/doc-1",
  );
});
