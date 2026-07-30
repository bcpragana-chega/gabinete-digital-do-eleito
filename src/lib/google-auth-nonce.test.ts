import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { criarGoogleAuthNonce, GoogleAuthNonceAttemptStore } from "./google-auth-nonce";

describe("nonce do login Google", () => {
  it("envia à Google o SHA-256 hexadecimal do nonce raw", async () => {
    const store = new GoogleAuthNonceAttemptStore();
    const nonce = await criarGoogleAuthNonce();
    store.prepare(nonce);
    store.activate("auth-hash");
    const rawNonceSentToSupabase = store.consume("auth-hash").rawNonce;
    const expectedHash = createHash("sha256").update(rawNonceSentToSupabase).digest("hex");

    assert.equal(nonce.hashedNonce, expectedHash);
    assert.match(nonce.rawNonce, /^[a-f0-9]{64}$/);
    assert.match(nonce.hashedNonce, /^[a-f0-9]{64}$/);
  });

  it("gera um nonce criptograficamente independente para cada tentativa", async () => {
    const first = await criarGoogleAuthNonce();
    const second = await criarGoogleAuthNonce();

    assert.notEqual(first.rawNonce, second.rawNonce);
    assert.notEqual(first.hashedNonce, second.hashedNonce);
  });

  it("consome o nonce da tentativa atual e impede reutilização", async () => {
    const store = new GoogleAuthNonceAttemptStore();
    const nonce = await criarGoogleAuthNonce();
    store.prepare(nonce);
    store.activate("auth-1");

    assert.equal(store.consume("auth-1"), nonce);
    assert.equal(store.hasActiveNonce(), false);
    assert.throws(() => store.consume("auth-1"), /GOOGLE_NONCE_ATTEMPT_MISMATCH/);
  });

  it("uma falha descarta o nonce e exige um novo antes do retry", async () => {
    const store = new GoogleAuthNonceAttemptStore();
    const first = await criarGoogleAuthNonce();
    const second = await criarGoogleAuthNonce();
    store.prepare(first);
    store.activate("auth-1");
    store.discard("auth-1");

    assert.equal(store.hasActiveNonce(), false);
    assert.throws(() => store.activate("auth-2"), /GOOGLE_NONCE_NOT_PREPARED/);

    store.prepare(second);
    assert.equal(store.activate("auth-2"), second);
    assert.notEqual(second.rawNonce, first.rawNonce);
  });

  it("a limpeza remove nonces preparados e ativos", async () => {
    const store = new GoogleAuthNonceAttemptStore();
    store.prepare(await criarGoogleAuthNonce());
    assert.equal(store.hasPreparedNonce(), true);

    store.clear();

    assert.equal(store.hasPreparedNonce(), false);
    assert.equal(store.hasActiveNonce(), false);
  });

  it("a integração usa o hash no GIS, o raw no Supabase e não desativa a validação", () => {
    const loginSource = readFileSync(new URL("../routes/login.tsx", import.meta.url), "utf8");
    const supabaseSource = readFileSync(new URL("./supabase.ts", import.meta.url), "utf8");

    assert.match(loginSource, /nonce:\s*nonce\.hashedNonce/);
    assert.match(loginSource, /loginComGoogle\([\s\S]*?rawNonce,[\s\S]*?attemptId/);
    assert.match(supabaseSource, /nonce:\s*rawNonce/);
    assert.doesNotMatch(`${loginSource}\n${supabaseSource}`, /skip_nonce_check/);
  });
});
