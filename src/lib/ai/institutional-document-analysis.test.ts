import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  analiseTemTextoSuficiente,
  criarDiagnosticoRespostaSeguro,
  criarInputFilePdfVisual,
  executarAnaliseComFallback,
  extrairTextoRespostaOpenAI,
  INSTITUTIONAL_ANALYSIS_RESPONSE_FORMAT,
  INSTITUTIONAL_ANALYSIS_SYSTEM_PROMPT,
  INSTITUTIONAL_ANALYSIS_USER_PROMPT,
  InstitutionalAnalysisError,
  normalizarAnaliseDocumentoInstitucional,
  validarModeloAnaliseVisual,
} from "./institutional-document-analysis";

const base = {
  tipoDocumento: "convocatoria",
  confiancaGlobal: 0.91,
  pontosOrdemTrabalhos: [],
  informacaoRelevante: [],
  camposIncertos: [],
  resumoCompreensao: "Convocatória para uma sessão.",
};

describe("análise institucional de documentos", () => {
  it("normaliza uma análise válida", () => {
    const result = normalizarAnaliseDocumentoInstitucional({
      ...base,
      sessao: { orgao: " Assembleia Municipal ", data: "2026-07-30", hora: "21:30" },
    });
    assert.equal(result.sessao?.orgao, "Assembleia Municipal");
    assert.equal(result.confiancaGlobal, 0.91);
  });

  it("não inventa campos ausentes", () => {
    const result = normalizarAnaliseDocumentoInstitucional(base);
    assert.equal(result.sessao, undefined);
  });

  it("aceita tipo desconhecido", () => {
    const result = normalizarAnaliseDocumentoInstitucional({ ...base, tipoDocumento: "qualquer" });
    assert.equal(result.tipoDocumento, "desconhecido");
  });

  it("preserva a ordem dos pontos e normaliza a numeração", () => {
    const result = normalizarAnaliseDocumentoInstitucional({
      ...base,
      pontosOrdemTrabalhos: [
        { titulo: "Segundo no PDF", confianca: 0.8 },
        { titulo: "Terceiro no PDF", confianca: 0.7 },
      ],
    });
    assert.deepEqual(
      result.pontosOrdemTrabalhos.map((p) => [p.numero, p.titulo]),
      [
        [1, "Segundo no PDF"],
        [2, "Terceiro no PDF"],
      ],
    );
  });

  it("rejeita pontos sem título", () => {
    assert.throws(() =>
      normalizarAnaliseDocumentoInstitucional({
        ...base,
        pontosOrdemTrabalhos: [{ titulo: "", confianca: 0.5 }],
      }),
    );
  });

  it("deteta texto insuficiente sem inventar", () => {
    const result = normalizarAnaliseDocumentoInstitucional({ ...base, resumoCompreensao: "" });
    assert.equal(analiseTemTextoSuficiente(result), false);
  });

  it("envia PDFs com detalhe visual elevado", () => {
    assert.deepEqual(criarInputFilePdfVisual("https://storage.test/document.pdf"), {
      type: "input_file",
      file_url: "https://storage.test/document.pdf",
      detail: "high",
    });
  });

  it("recusa explicitamente um modelo sem capacidade visual validada", () => {
    assert.throws(
      () => validarModeloAnaliseVisual("text-only-model"),
      (error) =>
        error instanceof InstitutionalAnalysisError && error.code === "MODEL_NOT_VISION_CAPABLE",
    );
    assert.equal(validarModeloAnaliseVisual("GPT-5-mini"), "gpt-5-mini");
  });

  it("instrui o modelo a ler visualmente documentos digitalizados", () => {
    const prompt = `${INSTITUTIONAL_ANALYSIS_SYSTEM_PROMPT} ${INSTITUTIONAL_ANALYSIS_USER_PROMPT}`;
    assert.match(prompt, /digitaliza[çc][aã]o/i);
    assert.match(prompt, /visualmente/i);
    assert.match(prompt, /todas as páginas/i);
  });

  it("normaliza uma convocatória digitalizada com seis pontos", () => {
    const result = normalizarAnaliseDocumentoInstitucional({
      ...base,
      sessao: {
        orgao: "Assembleia de Freguesia de Porches",
        tipo: "ordinaria",
        data: "2026-04-28",
        hora: "21:30",
        local: "Sede da Junta de Freguesia de Porches",
      },
      pontosOrdemTrabalhos: Array.from({ length: 6 }, (_, index) => ({
        numero: index + 1,
        titulo: `Ponto ${index + 1}`,
        descricao: index === 1 ? "2.1 Primeiro subponto; 2.2 Segundo subponto" : undefined,
        confianca: 0.9,
      })),
    });
    assert.equal(result.sessao?.data, "2026-04-28");
    assert.equal(result.sessao?.hora, "21:30");
    assert.equal(result.pontosOrdemTrabalhos.length, 6);
    assert.match(result.pontosOrdemTrabalhos[1].descricao ?? "", /2\.1.*2\.2/);
  });

  it("considera suficiente conteúdo visual estruturado sem depender de texto extraído", () => {
    const result = normalizarAnaliseDocumentoInstitucional({
      ...base,
      resumoCompreensao: "",
      sessao: { orgao: "Assembleia Municipal", tipo: "ordinaria" },
    });
    assert.equal(analiseTemTextoSuficiente(result), true);
  });

  it("preserva ambiguidades sem inventar valores", () => {
    const result = normalizarAnaliseDocumentoInstitucional({
      ...base,
      sessao: { orgao: "Assembleia Municipal", tipo: "desconhecida" },
      camposIncertos: [{ campo: "hora", motivo: "Dígitos visualmente ambíguos" }],
    });
    assert.equal(result.sessao?.hora, undefined);
    assert.equal(result.camposIncertos[0].campo, "hora");
  });

  it("executa no máximo um fallback visual após a tentativa PDF", async () => {
    let attempts = 0;
    const result = await executarAnaliseComFallback({
      analisarPdf: async () => {
        attempts += 1;
        throw new Error("primary");
      },
      analisarImagens: async () => {
        attempts += 1;
        return "ok";
      },
    });
    assert.deepEqual(result, { value: "ok", tentativa: "imagens" });
    assert.equal(attempts, 2);
  });

  it("propaga a falha final quando PDF e fallback falham", async () => {
    await assert.rejects(
      executarAnaliseComFallback({
        analisarPdf: async () => {
          throw new Error("primary");
        },
        analisarImagens: async () => {
          throw new Error("fallback");
        },
      }),
      /fallback/,
    );
  });

  it("produz diagnóstico sem incluir URLs, tokens ou corpo textual", () => {
    const diagnostic = criarDiagnosticoRespostaSeguro({
      code: "OPENAI_HTTP_ERROR",
      documentId: "12345678-secret-document-id",
      model: "gpt-5-mini",
      httpStatus: 400,
      requestId: "req_safe",
      payload: {
        id: "resp_safe",
        status: "failed",
        output_text: "conteúdo institucional privado",
        signed_url: "https://secret.test/token=abc",
        api_key: "sk-secret",
      },
    });
    const serialized = JSON.stringify(diagnostic);
    assert.match(serialized, /12345678/);
    assert.doesNotMatch(serialized, /secret\.test|sk-secret|conteúdo institucional privado/);
  });

  it("extrai e normaliza JSON de um message realista sem concatenar reasoning", () => {
    const json = JSON.stringify({
      ...base,
      sessao: {
        orgao: "Assembleia de Freguesia de Porches",
        entidade: null,
        tipo: "ordinaria",
        data: "2026-04-28",
        hora: "21:30",
        local: "Sede da Junta",
      },
    });
    const payload = {
      status: "completed",
      output: [
        { type: "reasoning", content: [{ type: "reasoning_text", text: "não deve entrar" }] },
        {
          type: "message",
          role: "assistant",
          status: "completed",
          content: [{ type: "output_text", annotations: [], text: json }],
        },
      ],
    };
    const extracted = extrairTextoRespostaOpenAI(payload);
    assert.equal(extracted.kind, "text");
    if (extracted.kind !== "text") return;
    assert.doesNotMatch(extracted.text, /não deve entrar/);
    const result = normalizarAnaliseDocumentoInstitucional(JSON.parse(extracted.text));
    assert.equal(result.sessao?.orgao, "Assembleia de Freguesia de Porches");
    assert.equal(result.sessao?.entidade, undefined);
  });

  it("deteta refusal sem o tratar como texto", () => {
    const extracted = extrairTextoRespostaOpenAI({
      output: [
        {
          type: "message",
          content: [{ type: "refusal", refusal: "Não posso ajudar com este pedido." }],
        },
      ],
    });
    assert.deepEqual(extracted, { kind: "refusal" });
  });

  it("classifica message sem texto nem refusal como resposta vazia", () => {
    const extracted = extrairTextoRespostaOpenAI({
      output: [{ type: "message", content: [{ type: "output_text", annotations: [] }] }],
    });
    assert.deepEqual(extracted, { kind: "empty" });
  });

  it("diagnostica conteúdo de message sem expor o texto", () => {
    const diagnostic = criarDiagnosticoRespostaSeguro({
      code: "OPENAI_EMPTY_RESPONSE",
      documentId: "2b525b94-private",
      payload: {
        output: [
          { type: "reasoning", content: [] },
          {
            type: "message",
            content: [
              { type: "output_text", text: "texto confidencial" },
              { type: "refusal", refusal: "recusa confidencial" },
            ],
          },
        ],
      },
    });
    assert.deepEqual(diagnostic.outputTypes[1], {
      type: "message",
      content: [
        { type: "output_text", hasText: true, textLength: 18, hasRefusal: false },
        { type: "refusal", hasText: false, textLength: 0, hasRefusal: true },
      ],
    });
    assert.doesNotMatch(JSON.stringify(diagnostic), /confidencial/);
  });

  it("define Structured Outputs estrito para a análise institucional", () => {
    assert.equal(INSTITUTIONAL_ANALYSIS_RESPONSE_FORMAT.type, "json_schema");
    assert.equal(INSTITUTIONAL_ANALYSIS_RESPONSE_FORMAT.strict, true);
    assert.equal(INSTITUTIONAL_ANALYSIS_RESPONSE_FORMAT.schema.additionalProperties, false);
  });
});
