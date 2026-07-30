import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createAuthAttemptId,
  getSafeBrowserAuthContext,
  logAuthDiagnostic,
} from "./auth-diagnostics";
import { classificarErroSupabaseAuth } from "./auth-errors";
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
    assert.equal(returned.reason, "token_rejected");
  });

  it("classifica causas Supabase sem expor a mensagem original", () => {
    assert.equal(
      classificarErroSupabaseAuth({ status: 400, message: "Unacceptable audience in id_token" }),
      "audience_mismatch",
    );
    assert.equal(
      classificarErroSupabaseAuth({ status: 400, message: "Issuer does not match" }),
      "issuer_mismatch",
    );
    assert.equal(
      classificarErroSupabaseAuth({ status: 400, message: "Provider is not enabled" }),
      "provider_disabled",
    );
    assert.equal(classificarErroSupabaseAuth({ status: 429 }), "rate_limited");
    assert.equal(classificarErroSupabaseAuth({ status: 503 }), "server_error");
  });

  it("regista apenas a categoria segura do erro remoto", () => {
    const calls: unknown[][] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => calls.push(args);
    try {
      logAuthDiagnostic("SUPABASE_ERROR_RETURNED", {
        attemptId: "auth-2",
        authFailureReason: "audience_mismatch",
        ...({ message: "token e email privados" } as object),
      });
    } finally {
      console.error = original;
    }

    const serialized = JSON.stringify(calls);
    assert.match(serialized, /audience_mismatch/);
    assert.doesNotMatch(serialized, /token e email privados/);
  });
});
