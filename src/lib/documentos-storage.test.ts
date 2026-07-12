import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DocumentoStorageErro,
  PDF_MAX_BYTES,
  uploadDocumentoPDF,
  validarDocumentoPDF,
} from "@/lib/documentos-storage";

const assinaturaPDF = "%PDF-1.7";

function ficheiro(nome: string, tipo = "application/pdf", conteudo = assinaturaPDF) {
  return new File([conteudo], nome, { type: tipo });
}

async function rejeitaComCodigo(file: File, codigo: DocumentoStorageErro["codigo"]) {
  await assert.rejects(
    validarDocumentoPDF(file),
    (error: unknown) => error instanceof DocumentoStorageErro && error.codigo === codigo,
  );
}

describe("validação de uploads PDF", () => {
  for (const nome of ["documento.pdf", "DOCUMENTO.PDF", "documento.final.pdf"]) {
    it(`aceita ${nome} com MIME e assinatura válidos`, async () => {
      await validarDocumentoPDF(ficheiro(nome));
    });
  }

  it("rejeita .pdf com conteúdo HTML", async () => {
    await rejeitaComCodigo(
      ficheiro("documento.pdf", "application/pdf", "<html>"),
      "PDF_ASSINATURA_INVALIDA",
    );
  });

  it("rejeita .pdf com bytes aleatórios", async () => {
    await rejeitaComCodigo(
      ficheiro("documento.pdf", "application/pdf", "ABCDE"),
      "PDF_ASSINATURA_INVALIDA",
    );
  });

  it("rejeita MIME vazio", async () => {
    await rejeitaComCodigo(ficheiro("documento.pdf", ""), "PDF_MIME_INVALIDO");
  });

  it("rejeita application/octet-stream", async () => {
    await rejeitaComCodigo(
      ficheiro("documento.pdf", "application/octet-stream"),
      "PDF_MIME_INVALIDO",
    );
  });

  it("rejeita ficheiro sem extensão", async () => {
    await rejeitaComCodigo(ficheiro("documento"), "PDF_EXTENSAO_INVALIDA");
  });

  it("rejeita extensão final .exe", async () => {
    await rejeitaComCodigo(ficheiro("documento.pdf.exe"), "PDF_EXTENSAO_INVALIDA");
  });

  it("rejeita ficheiro vazio", async () => {
    await rejeitaComCodigo(new File([], "documento.pdf", { type: "application/pdf" }), "PDF_VAZIO");
  });

  it("rejeita ficheiro superior a 20 MB", async () => {
    const demasiadoGrande = new File([new Uint8Array(PDF_MAX_BYTES + 1)], "documento.pdf", {
      type: "application/pdf",
    });
    await rejeitaComCodigo(demasiadoGrande, "PDF_DEMASIADO_GRANDE");
  });

  it("valida antes de tentar aceder ao Storage", async () => {
    await assert.rejects(
      uploadDocumentoPDF("documento-id", ficheiro("documento.pdf", "text/html", "<html>")),
      (error: unknown) =>
        error instanceof DocumentoStorageErro && error.codigo === "PDF_MIME_INVALIDO",
    );
  });
});
