import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  analiseTemTextoSuficiente,
  analiseDocumentoInstitucionalSchema,
  criarDiagnosticoIssuesZod,
  criarDiagnosticoRespostaSeguro,
  criarInputFilePdfVisual,
  executarAnaliseComFallback,
  extrairTextoRespostaOpenAI,
  INSTITUTIONAL_ANALYSIS_RESPONSE_FORMAT,
  INSTITUTIONAL_ANALYSIS_SYSTEM_PROMPT,
  INSTITUTIONAL_ANALYSIS_USER_PROMPT,
  INSTITUTIONAL_DOCUMENT_ANALYSIS_VERSION,
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

  it("normaliza impacto no mandato com confiança e referências por conclusão", () => {
    const result = normalizarAnaliseDocumentoInstitucional({
      ...base,
      tipoDocumento: "regulamento",
      impactoMandato: {
        relevancia: "alta",
        justificacaoRelevancia: " Altera as regras aplicáveis aos apoios municipais. ",
        referenciaDocumento: "Artigo 4.º",
        confianca: 0.93,
        alteracoesDecisoes: [
          {
            descricao: " O limite máximo foi alterado. ",
            referenciaDocumento: "Artigo 7.º",
            confianca: 0.91,
          },
        ],
        acoes: [
          {
            tipo: "exigida",
            descricao: "Apresentar os elementos em falta.",
            prazo: "no prazo de 10 dias úteis",
            referenciaDocumento: "Artigo 12.º, n.º 2",
            confianca: 0.96,
          },
        ],
        proximaAcao: {
          descricao: "Rever os processos abrangidos pela alteração.",
          referenciaDocumento: "Artigos 4.º e 7.º",
          confianca: 0.82,
        },
      },
    });
    assert.equal(result.impactoMandato?.relevancia, "alta");
    assert.equal(
      result.impactoMandato?.justificacaoRelevancia,
      "Altera as regras aplicáveis aos apoios municipais.",
    );
    assert.equal(
      result.impactoMandato?.alteracoesDecisoes[0].descricao,
      "O limite máximo foi alterado.",
    );
    assert.equal(result.impactoMandato?.acoes[0].prazo, "no prazo de 10 dias úteis");
    assert.equal(result.impactoMandato?.proximaAcao?.confianca, 0.82);
  });

  it("mantém análises antigas e impacto null compatíveis", () => {
    assert.equal(INSTITUTIONAL_DOCUMENT_ANALYSIS_VERSION, 2);
    assert.equal(normalizarAnaliseDocumentoInstitucional(base).impactoMandato, undefined);
    assert.equal(
      normalizarAnaliseDocumentoInstitucional({ ...base, impactoMandato: null }).impactoMandato,
      undefined,
    );
  });

  it("rejeita ações, prazos e confiança fora do contrato", () => {
    const impacto = {
      relevancia: "media",
      justificacaoRelevancia: "Pode exigir acompanhamento.",
      referenciaDocumento: null,
      confianca: 0.8,
      alteracoesDecisoes: [],
      acoes: [],
      proximaAcao: null,
    };
    assert.throws(() =>
      normalizarAnaliseDocumentoInstitucional({
        ...base,
        impactoMandato: {
          ...impacto,
          acoes: [
            {
              tipo: "automatica",
              descricao: "Executar sem confirmação.",
              prazo: "amanhã",
              referenciaDocumento: null,
              confianca: 1.2,
            },
          ],
        },
      }),
    );
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

  it("limita o impacto a conclusões documentadas sem inventar ações ou prazos", () => {
    assert.match(INSTITUTIONAL_ANALYSIS_SYSTEM_PROMPT, /Não inventes ações/i);
    assert.match(INSTITUTIONAL_ANALYSIS_SYSTEM_PROMPT, /prazo quando estiver explicitamente/i);
    assert.match(INSTITUTIONAL_ANALYSIS_SYSTEM_PROMPT, /não calcules nem convertas datas/i);
    assert.match(INSTITUTIONAL_ANALYSIS_SYSTEM_PROMPT, /uma única próxima ação segura/i);
    assert.match(INSTITUTIONAL_ANALYSIS_SYSTEM_PROMPT, /impactoMandato como null/i);
    assert.match(INSTITUTIONAL_ANALYSIS_SYSTEM_PROMPT, /não cries Assuntos/i);
    assert.match(INSTITUTIONAL_ANALYSIS_SYSTEM_PROMPT, /não associes automaticamente/i);
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
    assert.ok(INSTITUTIONAL_ANALYSIS_RESPONSE_FORMAT.schema.required.includes("impactoMandato"));
    assert.ok("impactoMandato" in INSTITUTIONAL_ANALYSIS_RESPONSE_FORMAT.schema.properties);
  });

  it("aceita descricao null do Structured Output e preserva a convocatória", () => {
    const input = {
      tipoDocumento: "convocatoria",
      confiancaGlobal: 0.98,
      sessao: {
        orgao: "Assembleia de Freguesia de Porches",
        entidade: "Freguesia de Porches",
        tipo: "ordinaria",
        data: "2026-04-28",
        hora: "21:30",
        local: "Centro Cultural D. Dinis",
      },
      pontosOrdemTrabalhos: [
        {
          numero: 1,
          titulo: "Apreciação e votação da ata",
          descricao: null,
          confianca: 0.95,
        },
      ],
      informacaoRelevante: [],
      camposIncertos: [],
      resumoCompreensao: "Convocatória para sessão ordinária.",
    };
    const parsed = analiseDocumentoInstitucionalSchema.safeParse(input);
    assert.equal(parsed.success, true);
    const result = normalizarAnaliseDocumentoInstitucional(input);
    assert.equal(result.pontosOrdemTrabalhos[0].descricao, undefined);
    assert.equal(result.pontosOrdemTrabalhos[0].titulo, "Apreciação e votação da ata");
    assert.equal(result.sessao?.local, "Centro Cultural D. Dinis");
    assert.equal(result.confiancaGlobal, 0.98);
  });

  it("normaliza null em todos os campos nullable do JSON Schema", () => {
    const result = normalizarAnaliseDocumentoInstitucional({
      ...base,
      sessao: {
        orgao: null,
        entidade: null,
        tipo: "desconhecida",
        data: null,
        hora: null,
        local: null,
      },
      pontosOrdemTrabalhos: [
        { numero: null, titulo: "Ponto sem detalhe", descricao: null, confianca: 0.8 },
      ],
      informacaoRelevante: [{ titulo: "Nota", descricao: "Informação", referenciaDocumento: null }],
    });
    assert.equal(result.sessao?.tipo, "desconhecida");
    assert.equal(result.sessao?.orgao, undefined);
    assert.equal(result.sessao?.entidade, undefined);
    assert.equal(result.sessao?.data, undefined);
    assert.equal(result.sessao?.hora, undefined);
    assert.equal(result.sessao?.local, undefined);
    assert.deepEqual(result.pontosOrdemTrabalhos[0], {
      numero: 1,
      titulo: "Ponto sem detalhe",
      descricao: undefined,
      confianca: 0.8,
    });
    assert.equal(result.informacaoRelevante[0].referenciaDocumento, undefined);
  });

  it("normaliza sessao null para undefined", () => {
    const result = normalizarAnaliseDocumentoInstitucional({ ...base, sessao: null });
    assert.equal(result.sessao, undefined);
  });

  it("reduz issues Zod a metadados seguros", () => {
    const parsed = analiseDocumentoInstitucionalSchema.safeParse({
      ...base,
      pontosOrdemTrabalhos: [
        { numero: 1, titulo: "Ponto", descricao: { segredo: "privado" }, confianca: 0.8 },
      ],
    });
    assert.equal(parsed.success, false);
    if (parsed.success) return;
    const diagnostic = criarDiagnosticoIssuesZod(parsed.error.issues);
    assert.equal(diagnostic.schemaIssueCount, 1);
    assert.deepEqual(diagnostic.schemaIssues[0], {
      path: "pontosOrdemTrabalhos.0.descricao",
      code: "invalid_type",
      expected: "string",
      received: "object",
    });
    assert.doesNotMatch(JSON.stringify(diagnostic), /segredo|privado/);
  });
});
