import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { executarLoginSupabaseConfirmado, restaurarSessaoSupabaseComRegisto } from "./auth-store";

const supabaseUser = {
  id: "user-1",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: "2026-01-01T00:00:00.000Z",
};

describe("registo do último acesso autenticado", () => {
  it("atualiza o último acesso depois de o login Google ser confirmado", async () => {
    const atualizacoes: string[] = [];

    await executarLoginSupabaseConfirmado({
      iniciar: async () => supabaseUser,
      registar: (userId) => atualizacoes.push(userId),
      confirmar: () => undefined,
    });

    assert.deepEqual(atualizacoes, ["user-1"]);
  });

  it("atualiza o último acesso quando uma sessão existente é restaurada", async () => {
    const atualizacoes: string[] = [];

    const user = await restaurarSessaoSupabaseComRegisto({
      validar: async () => supabaseUser,
      registar: (userId) => atualizacoes.push(userId),
    });

    assert.equal(user?.id, "user-1");
    assert.deepEqual(atualizacoes, ["user-1"]);
  });

  it("uma falha na atualização não impede a autenticação", async () => {
    let autenticado = false;

    const resultado = await executarLoginSupabaseConfirmado({
      iniciar: async () => supabaseUser,
      registar: () => Promise.reject(new Error("UPDATE_FAILED")),
      confirmar: () => {
        autenticado = true;
        return "autenticado";
      },
    });

    assert.equal(resultado, "autenticado");
    assert.equal(autenticado, true);
  });
});
