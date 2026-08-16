import { createHash, randomBytes } from "node:crypto";

// Token primitives for the email-verification and password-reset flows (Session 3c).
//
// Tokens are stored **hashed at rest**: only the SHA-256 digest lands in the DB
// (`{Email,Password}…Token.token`, which is @unique). The raw token travels in the
// emailed link and is never persisted. SHA-256 (not bcrypt) is correct here — these
// tokens are high-entropy random values, so a fast digest is enough and, being
// deterministic, lets us look the record up by `token` on consume. bcrypt stays
// reserved for low-entropy passwords.

const TOKEN_BYTES = 32;

export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // ~1 hour
export const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // ~24 hours

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Returns the raw token (for the link) and its hash (for the DB). */
export function generateToken(): { raw: string; hash: string } {
  const raw = randomBytes(TOKEN_BYTES).toString("base64url");
  return { raw, hash: hashToken(raw) };
}

export function tokenExpiry(ttlMs: number): Date {
  return new Date(Date.now() + ttlMs);
}
