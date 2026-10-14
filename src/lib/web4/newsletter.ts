import { createHash, randomBytes } from "node:crypto";
import { inquiryRpc, type InquiryEnvironment } from "./inquiry-storage";

export function hashUnsubscribeToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function validUnsubscribeToken(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
}

// Future verified mail delivery calls this server-only helper immediately before
// sending. Only the hash is persisted; the bearer token stays in server memory.
export async function issueUnsubscribeToken(emailHash: string, env: InquiryEnvironment = process.env): Promise<{ token: string; expiresAt: string }> {
  if (!/^[a-f0-9]{64}$/.test(emailHash)) throw new Error("Invalid subscription reference");
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const result = await inquiryRpc("vector_register_unsubscribe_token", { p_email_hash: emailHash, p_token_hash: hashUnsubscribeToken(token), p_expires_at: expiresAt }, env);
  if (result !== "registered") throw new Error("Unsubscribe token was not registered");
  return { token, expiresAt };
}
