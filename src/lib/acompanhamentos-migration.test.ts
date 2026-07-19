import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const migrationUrl = new URL(
  "../../supabase/migrations/20260719_acompanhamentos_politicos.sql",
  import.meta.url,
);
const repositoryUrl = new URL("./acompanhamentos-repository.ts", import.meta.url);
const sectionUrl = new URL(
  "../components/dossies/DossieAcompanhamentoSection.tsx",
  import.meta.url,
);

describe("schema de acompanhamentos políticos", () => {
  it("impõe RLS e políticas isoladas para todas as operações", async () => {
    const sql = await readFile(migrationUrl, "utf8");
    assert.match(sql, /enable row level security/i);
    for (const operation of ["select", "insert", "update", "delete"]) {
      assert.match(sql, new RegExp(`for ${operation}`, "i"));
    }
    assert.match(sql, /auth\.uid\(\) = user_id/i);
  });

  it("rejeita Assunto e Documento Criado de outro utilizador no banco", async () => {
    const sql = await readFile(migrationUrl, "utf8");
    assert.match(sql, /assuntos[\s\S]*id = new\.assunto_id and user_id = new\.user_id/i);
    assert.match(
      sql,
      /documentos_criados[\s\S]*id = new\.documento_criado_id and user_id = new\.user_id/i,
    );
  });

  it("mantém o histórico seguro quando o Documento associado é removido", async () => {
    const sql = await readFile(migrationUrl, "utf8");
    assert.match(sql, /documento_criado_id[\s\S]*on delete set null/i);
  });

  it("limita a edição remota ao acontecimento do utilizador autenticado", async () => {
    const repository = await readFile(repositoryUrl, "utf8");
    assert.match(
      repository,
      /\.update\(paraDetalhesAcompanhamentoRow\(input\)\)[\s\S]*\.eq\("id", eventoId\)[\s\S]*\.eq\("user_id", contexto\.userId\)/,
    );
    assert.match(repository, /data\.user_id !== contexto\.userId \|\| data\.id !== eventoId/);
  });

  it("mantém o registo e a edição de detalhes disponíveis sem expor campos estruturais", async () => {
    const section = await readFile(sectionUrl, "utf8");
    assert.match(section, /!aberto \? \([\s\S]*Registar acontecimento/);
    assert.doesNotMatch(section, /!aberto && !fechado/);
    assert.match(section, /Editar detalhes/);
    assert.match(
      section,
      /O tipo, a data e o estado deste acontecimento não podem ser alterados\./,
    );
  });
});
