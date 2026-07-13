import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { carregarDocumentoParaAnaliseComDependencias } from "./institutional-document-flow";

const component = readFileSync(
  new URL("../components/documentos/InstitutionalDocumentIntake.tsx", import.meta.url),
  "utf8",
);
const migration = readFileSync(
  new URL("../../supabase/migrations/20260713_institutional_document_wow_p0.sql", import.meta.url),
  "utf8",
);
const sessionRoute = readFileSync(
  new URL("../routes/_app.sessoes.$id.tsx", import.meta.url),
  "utf8",
);

describe("confirmação institucional", () => {
  it("PDF válido é carregado diretamente para análise", async () => {
    const file = new File(["%PDF-"], "convocatoria.pdf", { type: "application/pdf" });
    let received: Record<string, unknown> | undefined;
    await carregarDocumentoParaAnaliseComDependencias(file, async (input) => {
      received = input as unknown as Record<string, unknown>;
      return { ...input, id: "doc-1", createdAt: "agora", assembleiaId: "biblioteca" };
    });
    assert.equal(received?.estadoAnalise, "a_analisar");
    assert.equal(received?.ficheiro, file);
    assert.equal(received?.assembleiaId, "biblioteca");
  });
  it("não cria sessão antes da confirmação explícita", () => {
    assert.match(component, /Confirmar e preparar sessão/);
    assert.doesNotMatch(component, /adicionarAssembleia\(/);
  });

  it("confirma sessão, pontos e documento na mesma RPC", () => {
    assert.match(migration, /insert into public\.assembleias/);
    assert.match(migration, /insert into public\.pontos/);
    assert.match(migration, /assembleia_origem_id = v_sessao_id/);
    assert.match(migration, /estado_analise = 'confirmado'/);
  });

  it("possível duplicado não cria silenciosamente", () => {
    assert.match(migration, /'status', 'duplicado'/);
    assert.match(component, /Atualizar sessão existente/);
    assert.match(component, /Criar outra sessão/);
  });

  it("a função SQL é transacional e security invoker", () => {
    assert.match(migration, /language plpgsql security invoker/);
    assert.match(migration, /auth\.uid\(\)/);
  });

  it("a repetição da análise usa o documento existente", () => {
    assert.match(component, /analisarDocumentoCarregado\(documento\.id\)/);
  });

  it("a chegada usa a próxima ação do motor determinístico", () => {
    assert.match(sessionRoute, /flow\.nextAction\.action/);
    assert.match(sessionRoute, /calcularFluxoSessao/);
  });
});
