import assert from "node:assert/strict";
import { it } from "node:test";
import { persistirPreparacaoConfirmadaComDependencias } from "./assembleias-store";
import type { Assembleia } from "./types";

const pronta: Assembleia = {
  id: "s1",
  nome: "Sessão",
  data: "2026-07-13",
  hora: "18:00",
  local: "Sala",
  estado: "preparacao",
  preparacaoEstado: "pronta",
  prontaEm: "agora",
};

it("prontidão só atualiza a cache após confirmação remota", async () => {
  const ordem: string[] = [];
  await persistirPreparacaoConfirmadaComDependencias(
    async () => {
      ordem.push("remoto");
      return pronta;
    },
    (value) => {
      ordem.push("local");
      return value;
    },
  );
  assert.deepEqual(ordem, ["remoto", "local"]);
});

it("falha remota de prontidão não altera a cache", async () => {
  let local = false;
  await assert.rejects(() =>
    persistirPreparacaoConfirmadaComDependencias(
      async () => {
        throw new Error("falha");
      },
      (value) => {
        local = true;
        return value;
      },
    ),
  );
  assert.equal(local, false);
});
