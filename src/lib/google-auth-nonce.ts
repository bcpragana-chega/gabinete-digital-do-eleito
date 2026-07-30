export type GoogleAuthNonce = Readonly<{
  rawNonce: string;
  hashedNonce: string;
}>;

type NonceCrypto = Pick<Crypto, "getRandomValues" | "subtle">;

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function criarGoogleAuthNonce(
  cryptoProvider: NonceCrypto = globalThis.crypto,
): Promise<GoogleAuthNonce> {
  const randomBytes = cryptoProvider.getRandomValues(new Uint8Array(32));
  const rawNonce = bytesToHex(randomBytes);
  const digest = await cryptoProvider.subtle.digest("SHA-256", new TextEncoder().encode(rawNonce));

  return Object.freeze({
    rawNonce,
    hashedNonce: bytesToHex(new Uint8Array(digest)),
  });
}

export class GoogleAuthNonceAttemptStore {
  private prepared?: GoogleAuthNonce;
  private active?: { attemptId: string; nonce: GoogleAuthNonce };

  prepare(nonce: GoogleAuthNonce) {
    if (this.active) throw new Error("GOOGLE_NONCE_ATTEMPT_ACTIVE");
    this.prepared = nonce;
  }

  activate(attemptId: string) {
    if (this.active?.attemptId === attemptId) return this.active.nonce;
    if (this.active || !this.prepared) throw new Error("GOOGLE_NONCE_NOT_PREPARED");

    const nonce = this.prepared;
    this.prepared = undefined;
    this.active = { attemptId, nonce };
    return nonce;
  }

  consume(attemptId: string) {
    if (this.active?.attemptId !== attemptId) throw new Error("GOOGLE_NONCE_ATTEMPT_MISMATCH");

    const nonce = this.active.nonce;
    this.active = undefined;
    return nonce;
  }

  discard(attemptId: string) {
    if (this.active?.attemptId === attemptId) this.active = undefined;
  }

  clear() {
    this.prepared = undefined;
    this.active = undefined;
  }

  hasPreparedNonce() {
    return Boolean(this.prepared);
  }

  hasActiveNonce() {
    return Boolean(this.active);
  }
}
