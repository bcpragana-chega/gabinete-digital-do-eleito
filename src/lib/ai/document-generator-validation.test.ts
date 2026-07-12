import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { inputSchema, tipoDocumentoCriadoSchema } from "@/lib/ai/document-generator.server";

describe("validação runtime da geração documental", () => {
  it("aceita apenas os seis tipos documentais suportados", () => {
    const permitidos = [
      "Moção",
      "Recomendação",
      "Requerimento",
      "Declaração de voto",
      "Intervenção",
      "Outro documento",
    ];

    permitidos.forEach((tipo) =>
      assert.equal(tipoDocumentoCriadoSchema.safeParse(tipo).success, true),
    );
    assert.equal(tipoDocumentoCriadoSchema.safeParse("Ata inventada").success, false);
  });

  it("rejeita tipo inválido no validator completo da server function", () => {
    const resultado = inputSchema.safeParse({
      accessToken: "token",
      assuntoId: "assunto-1",
      tipo: "Ata inventada",
      titulo: "Título válido",
    });

    assert.equal(resultado.success, false);
  });
});
