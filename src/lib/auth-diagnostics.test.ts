import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createAuthAttemptId,
  getSafeBrowserAuthContext,
  logAuthDiagnostic,
} from "./auth-diagnostics";
import { SupabaseAuthReturnedError, SupabaseAuthTimeoutError } from "./supabase";

describe("diagnóstico seguro do login Google", () => {
  it("correlaciona tentativas sem usar dados do utilizador", () => {
    const first = createAuthAttemptId();
    const second = createAuthAttemptId();

    assert.match(first, /^auth-\d+$/);
    assert.notEqual(first, second);
  });

  it("remove campos não permitidos e valores potencialmente sensíveis em runtime", () => {
    const calls: unknown[][] = [];
    const original = console.info;
    console.info = (...args: unknown[]) => calls.push(args);
    try {
      logAuthDiagnostic("GOOGLE_CREDENTIAL_PRESENT", {
        attemptId: "auth-1",
        ...({ credential: "header.payload.signature", token: "secret" } as object),
      });
    } finally {
      console.info = original;
    }

    const serialized = JSON.stringify(calls);
    assert.match(serialized, /GOOGLE_CREDENTIAL_PRESENT/);
    assert.doesNotMatch(serialized, /header|payload|signature|secret|"token"/i);
  });

  it("não tenta identificar modo incógnito no contexto seguro", () => {
    const context = getSafeBrowserAuthContext();
    assert.equal("incognito" in context, false);
    assert.equal("userAgent" in context, false);
  });

  it("mantém timeout e erro devolvido pelo Supabase distinguíveis", () => {
    assert.equal(
      new SupabaseAuthTimeoutError("SIGN_IN_WITH_ID_TOKEN").name,
      "SupabaseAuthTimeoutError",
    );
    const returned = new SupabaseAuthReturnedError({
      name: "AuthApiError",
      status: 400,
      code: "bad_jwt",
    });
    assert.equal(returned.status, 400);
    assert.equal(returned.code, "bad_jwt");
  });
});
