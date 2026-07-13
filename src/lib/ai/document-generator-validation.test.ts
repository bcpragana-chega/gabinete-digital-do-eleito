import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  guardarDocumentoGeradoRemotamente,
  inputSchema,
  tipoDocumentoCriadoSchema,
} from "@/lib/ai/document-generator.server";

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

  it("devolve exatamente o documento confirmado pelo insert remoto", async () => {
    const fetchOriginal = globalThis.fetch;
    const supabaseUrlOriginal = process.env.SUPABASE_URL;
    const serviceRoleOriginal = process.env.SUPABASE_SERVICE_ROLE_KEY;
    let rowPersistida: Record<string, unknown> | undefined;

    process.env.SUPABASE_URL = "https://supabase.test";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test";
    globalThis.fetch = async (_input, init) => {
      rowPersistida = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(
        JSON.stringify([
          {
            ...rowPersistida,
            resumo: null,
            notas: null,
            tags: [],
            assembleia_id: null,
            ponto_id: null,
            documento_final_id: null,
            archived_at: null,
            finalizado_em: null,
            apresentado_em: null,
          },
        ]),
        { status: 201, headers: { "Content-Type": "application/json" } },
      );
    };

    try {
      const persistido = await guardarDocumentoGeradoRemotamente({
        userId: "user-1",
        assuntoId: "assunto-1",
        tipo: "Recomendação",
        titulo: "Recomendação sobre iluminação",
        conteudo: "Conteúdo substantivo validado",
        modelo: "modelo-test",
        provider: "openai",
        promptOrigem: "",
      });

      assert.ok(rowPersistida);
      assert.equal(rowPersistida.user_id, "user-1");
      assert.equal(rowPersistida.assunto_id, "assunto-1");
      assert.equal(rowPersistida.estado, "rascunho");
      assert.equal(rowPersistida.conteudo, "Conteúdo substantivo validado");
      assert.equal(persistido.id, rowPersistida.id);
      assert.equal(persistido.assuntoId, "assunto-1");
      assert.equal(persistido.estado, "rascunho");
      assert.equal(persistido.conteudo, "Conteúdo substantivo validado");
    } finally {
      globalThis.fetch = fetchOriginal;
      if (supabaseUrlOriginal === undefined) delete process.env.SUPABASE_URL;
      else process.env.SUPABASE_URL = supabaseUrlOriginal;
      if (serviceRoleOriginal === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      else process.env.SUPABASE_SERVICE_ROLE_KEY = serviceRoleOriginal;
    }
  });
});
