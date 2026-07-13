import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  executarLoginSupabaseConfirmado,
  resolverDestinoAcesso,
  resolverEstadoComSessaoValidada,
} from "./auth-store";
import { executarMutacaoConfirmada } from "./confirmed-mutation";

describe("autoridade remota de autenticação", () => {
  it("não confirma login quando signInWithIdToken falha", async () => {
    let confirmado = false;
    await assert.rejects(
      executarLoginSupabaseConfirmado({
        iniciar: async () => {
          throw new Error("SIGN_IN_FAILED");
        },
        confirmar: () => {
          confirmado = true;
        },
      }),
      /SIGN_IN_FAILED/,
    );
    assert.equal(confirmado, false);
  });

  it("um utilizador falso local não sobrevive sem sessão Supabase", () => {
    const result = resolverEstadoComSessaoValidada({
      user: { id: "falso", nome: "Falso", email: "", provider: "google" },
    });
    assert.equal(result.user, undefined);
    assert.equal(
      resolverDestinoAcesso({
        initialized: true,
        isAuthenticated: Boolean(result.user),
        hasCompleteProfile: false,
        onboardingResolved: true,
        onboardingRequired: false,
      }),
      "login",
    );
  });

  it("uma sessão Supabase válida define a identidade autenticada", () => {
    const result = resolverEstadoComSessaoValidada(
      {},
      { id: "user-1", email: "eleito@example.test", user_metadata: { name: "Eleito" } },
    );
    assert.equal(result.user?.id, "user-1");
    assert.equal(result.user?.supabaseUserId, "user-1");
  });
});

describe("persistência confirmada de sessões, assuntos e pontos", () => {
  for (const entidade of ["sessão", "assunto", "ponto"]) {
    it(`${entidade}: confirma localmente apenas depois do remoto`, async () => {
      const ordem: string[] = [];
      await executarMutacaoConfirmada({
        persistirRemoto: async () => {
          ordem.push("remoto");
        },
        confirmarLocal: () => ordem.push("local"),
      });
      assert.deepEqual(ordem, ["remoto", "local"]);
    });

    it(`${entidade}: mantém o estado anterior quando o remoto falha`, async () => {
      let cacheAlterada = false;
      await assert.rejects(
        executarMutacaoConfirmada({
          persistirRemoto: async () => {
            throw new Error("REMOTE_FAILED");
          },
          confirmarLocal: () => {
            cacheAlterada = true;
          },
        }),
      );
      assert.equal(cacheAlterada, false);
    });
  }

  it("os consumidores ativos aguardam as mutações e apresentam loading", () => {
    const files = [
      "../components/assembleias/NovaSessaoWizard.tsx",
      "../components/dossies/NovoAssuntoWizard.tsx",
      "../components/dossies/EditarDossieDialog.tsx",
      "../components/preparacao/AdicionarPontoDialog.tsx",
    ].map((path) => readFileSync(new URL(path, import.meta.url), "utf8"));
    files.forEach((source) => assert.match(source, /await /));
    const feedbackComponents = [
      "../components/dossies/DossieForm.tsx",
      "../components/preparacao/AdicionarItemPreparacao.tsx",
    ].map((path) => readFileSync(new URL(path, import.meta.url), "utf8"));
    assert.match([...files, ...feedbackComponents].join("\n"), /A guardar…/);
  });

  it("os fluxos de criação bloqueiam submissões concorrentes por duplo clique", () => {
    const creationFlows = [
      "../components/assembleias/NovaSessaoWizard.tsx",
      "../components/dossies/NovoAssuntoWizard.tsx",
      "../components/preparacao/AdicionarItemPreparacao.tsx",
    ].map((path) => readFileSync(new URL(path, import.meta.url), "utf8"));

    creationFlows.forEach((source) => {
      assert.match(source, /guardarEmCurso\.current/);
      assert.match(source, /if \([^\n]*guardarEmCurso\.current\) return;/);
    });
  });
});
