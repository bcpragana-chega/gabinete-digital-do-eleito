import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  GENERATION_PIPELINE,
  persistirRespostaGeracaoCanonica,
} from "@/lib/ai/document-generation-pipeline";
import { obterPromptSistemaTribuno } from "@/lib/ai/prompts/system";

const conteudoSubstantivo = `## ENQUADRAMENTO

Na Rua da Igreja, em Porches, estão apagados três candeeiros há dois meses.

## FUNDAMENTAÇÃO

A falta de iluminação reduz a segurança do percurso pedonal durante a noite.

## RECOMENDAÇÃO

1. Reparar os três candeeiros identificados.
2. Comunicar o calendário da intervenção.`;

describe("pipeline canónico usado antes do insert de documentos_criados", () => {
  it("o system prompt real delega a apresentação no Motor Documental", () => {
    const prompt = obterPromptSistemaTribuno();
    assert.match(prompt, /gera apenas as secções substantivas/i);
    assert.match(prompt, /Motor Documental acrescenta cabeçalho/i);
    assert.doesNotMatch(
      prompt,
      /padrão oficial do Tribuno: cabeçalho institucional, título, ENQUADRAMENTO/i,
    );
  });

  it("entrega ao repositório apenas conteúdo substantivo e metadata do pipeline v2", async () => {
    let persistivel: { conteudo: string; metadata: Record<string, unknown> } | undefined;

    const resultado = await persistirRespostaGeracaoCanonica(
      {
        tipo: "Recomendação",
        conteudo: conteudoSubstantivo,
        metadata: { provider: "teste" },
      },
      async (dados) => {
        persistivel = dados;
        return { id: "documento-remoto", ...dados };
      },
    );

    assert.equal(resultado.id, "documento-remoto");
    assert.ok(persistivel);
    assert.doesNotMatch(persistivel.conteudo, /^Chega!/i);
    assert.doesNotMatch(persistivel.conteudo, /Texto por preencher/i);
    assert.doesNotMatch(persistivel.conteudo, /___ de __________/);
    assert.doesNotMatch(persistivel.conteudo, /^Proponente:/im);
    assert.doesNotMatch(persistivel.conteudo, /^Grupo político/im);
    assert.doesNotMatch(
      persistivel.conteudo,
      /^[\p{L} .'-]+,\s*\d{1,2}\s+de\s+[\p{L}]+\s+de\s+\d{4}$/imu,
    );
    assert.match(persistivel.conteudo, /Rua da Igreja/);
    assert.deepEqual(persistivel.metadata.generationPipeline, GENERATION_PIPELINE);
  });

  it("não chama o repositório se a resposta regressar ao compositor legado", async () => {
    let chamadasPersistencia = 0;
    const legado = `Chega!
Recomendação
Recomendação sobre iluminação
ENQUADRAMENTO
Texto por preencher.
Porches, 13 de julho de 2026
Proponente:
Benjamin Cruz Pragana
Grupo político`;

    await assert.rejects(
      persistirRespostaGeracaoCanonica(
        { tipo: "Recomendação", conteudo: legado, metadata: {} },
        async () => {
          chamadasPersistencia += 1;
          return undefined;
        },
      ),
      (error: unknown) => error instanceof Error && error.name === "AI_INVALID_DOCUMENT_CONTENT",
    );
    assert.equal(chamadasPersistencia, 0);
  });
});
