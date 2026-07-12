import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  LEGACY_DIAGNOSTICS_STORAGE_KEY,
  limparDiagnosticosLegados,
} from "@/lib/legacy-diagnostics-cleanup";
import {
  documentoIdMascarado,
  logPreviewDocumentoFalhou,
  logSignedUrlDocumentoFalhou,
} from "@/lib/documentos-safe-logging";

describe("remoção do diagnóstico temporário", () => {
  it("remove apenas a chave legada", () => {
    const removidas: string[] = [];
    limparDiagnosticosLegados({ removeItem: (key) => removidas.push(key) });
    assert.deepEqual(removidas, [LEGACY_DIAGNOSTICS_STORAGE_KEY]);
  });

  it("não quebra a aplicação quando localStorage falha", () => {
    assert.doesNotThrow(() =>
      limparDiagnosticosLegados({
        removeItem: () => {
          throw new Error("storage indisponível");
        },
      }),
    );
  });

  it("helper e rota públicos já não existem", () => {
    assert.equal(existsSync("src/lib/debug-diagnostics.ts"), false);
    assert.equal(existsSync("src/routes/_app.debug-diagnostics.tsx"), false);
    const routeTree = readFileSync("src/routeTree.gen.ts", "utf8");
    assert.doesNotMatch(routeTree, /debug-diagnostics/);
  });
});

describe("logging documental seguro", () => {
  it("mascara IDs a oito caracteres", () => {
    assert.equal(documentoIdMascarado("12345678-dado-adicional"), "12345678");
  });

  it("preview não regista path, nome ou erro bruto", () => {
    const chamadas: unknown[][] = [];
    const original = console.warn;
    console.warn = (...args: unknown[]) => chamadas.push(args);
    try {
      logPreviewDocumentoFalhou("12345678-resto", "PDF_URL_INVALIDA");
    } finally {
      console.warn = original;
    }

    const log = JSON.stringify(chamadas);
    assert.match(log, /12345678/);
    assert.doesNotMatch(log, /storagePath|ficheiroNome|segredo|12345678-resto/);
  });

  it("falha de signed URL não regista path nem erro bruto", () => {
    const chamadas: unknown[][] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => chamadas.push(args);
    try {
      logSignedUrlDocumentoFalhou("PDF_URL_INVALIDA");
    } finally {
      console.error = original;
    }

    const log = JSON.stringify(chamadas);
    assert.match(log, /DOCUMENTOS_STORAGE_SIGNED_URL_FALHOU/);
    assert.doesNotMatch(log, /storagePath|signedUrl|SupabaseError|segredo/);
  });
});
