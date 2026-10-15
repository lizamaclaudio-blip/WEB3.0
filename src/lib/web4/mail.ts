import { createHmac, timingSafeEqual } from "node:crypto";
import { inquiryConfigured } from "./inquiry";
import type { InquiryEnvironment } from "./inquiry-storage";

export type MailKind = "contact_receipt" | "internal_contact" | "newsletter_confirm" | "newsletter_welcome";
export type MailLocale = "es" | "en" | "fr";
export type MailJob = {
  id: string; kind: MailKind; locale: MailLocale; email: string; email_hash: string;
  name: string; message: string; created_at: string; first_attempt_at: string; attempts: number;
};
export type MailConfiguration = {
  host: string; port: 465 | 587; user: string; password: string; from: string; internalTo: string;
  origin: string; tokenSecret: string; workerSecret: string; preview: boolean; recipients: string[];
};
export type MailMessage = { to: string; from: string; replyTo?: string; subject: string; html: string; text: string; messageId: string };
export type MailResult = { result: "sent" | "retry" | "delivery_unknown" | "failed"; providerId: string | null; errorCode: string | null };

export function validMailAddress(address: unknown): address is string {
  return typeof address === "string" && address.length <= 254 && /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,63}$/.test(address);
}

export function reservedMailAddress(address: string): boolean {
  const domain = address.split("@")[1]?.toLowerCase() || "";
  return !domain || /(?:^|\.)(?:test|example|invalid|localhost)$/.test(domain)
    || /(?:^|\.)example\.(?:com|net|org)$/.test(domain);
}

// No network activity or secret values are exposed while checking readiness.
export function mailConfiguration(env: InquiryEnvironment = process.env): MailConfiguration | null {
  if (env.VECTOR_MAIL_ENABLED !== "true" || !inquiryConfigured(env)) return null;
  const host = env.VECTOR_SMTP_HOST || "";
  const port = Number(env.VECTOR_SMTP_PORT);
  const user = env.VECTOR_SMTP_USER || "";
  const password = env.VECTOR_SMTP_PASSWORD || "";
  const from = env.VECTOR_MAIL_FROM || "";
  const internalTo = env.VECTOR_MAIL_INTERNAL_TO || "";
  const tokenSecret = env.VECTOR_MAIL_TOKEN_SECRET || "";
  const workerSecret = env.VECTOR_MAIL_WORKER_SECRET || "";
  if (!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,63}$/i.test(host) || reservedMailAddress(`smtp@${host}`)
    || ![465, 587].includes(port) || !user || !password || /[\r\n\0]/.test(user + password)
    || !validMailAddress(from) || !validMailAddress(internalTo) || reservedMailAddress(from) || reservedMailAddress(internalTo)
    || tokenSecret.length < 32 || workerSecret.length < 32 || tokenSecret === workerSecret) return null;
  let origin: URL;
  try { origin = new URL(env.VECTOR_MAIL_PUBLIC_ORIGIN || ""); } catch { return null; }
  if (origin.protocol !== "https:" || origin.username || origin.password || origin.search || origin.hash
    || origin.pathname !== "/" || reservedMailAddress(`web@${origin.hostname}`) || !origin.hostname.includes(".")) return null;
  const preview = env.VERCEL_ENV !== "production" || env.VECTOR_MAIL_MODE !== "public";
  const recipients = (env.VECTOR_MAIL_PREVIEW_RECIPIENTS || "").split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
  if (preview && (!recipients.length || recipients.some(value => !validMailAddress(value) || reservedMailAddress(value)))) return null;
  return { host, port: port as 465 | 587, user, password, from, internalTo, origin: origin.origin, tokenSecret, workerSecret, preview, recipients };
}

export function mailWorkerAuthorized(request: Request, secret: string): boolean {
  if (secret.length < 32) return false;
  const authorization = request.headers.get("authorization") || "";
  const supplied = Buffer.from(authorization);
  const expected = Buffer.from(`Bearer ${secret}`);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function mailRecipientAllowed(address: string, configuration: MailConfiguration): boolean {
  return validMailAddress(address) && !reservedMailAddress(address)
    && (!configuration.preview || configuration.recipients.includes(address.toLowerCase()));
}

// Stable across retries; the database receives SHA-256 only. Rotate this secret
// only after draining pending jobs, otherwise existing mail tokens are invalidated.
export function mailActionToken(job: Pick<MailJob, "id" | "kind">, secret: string): string {
  return createHmac("sha256", secret).update(`v1:${job.kind}:${job.id}`).digest("base64url");
}

export function mailActionLink(job: MailJob, configuration: MailConfiguration): { url: string; expiresAt: string } {
  const prefix = job.locale === "es" ? "" : `/${job.locale}`;
  const action = job.kind === "newsletter_confirm" ? "confirmar-novedades" : "cancelar-novedades";
  const duration = job.kind === "newsletter_confirm" ? 24 : 30 * 24;
  const expiresAt = new Date(Date.parse(job.first_attempt_at) + duration * 60 * 60 * 1000).toISOString();
  // A fragment is never sent as part of the HTTP request or referrer.
  return { url: `${configuration.origin}${prefix}/${action}#token=${mailActionToken(job, configuration.tokenSecret)}`, expiresAt };
}

export function validMailJob(value: unknown): value is MailJob {
  if (!value || typeof value !== "object") return false;
  const job = value as MailJob;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(job.id)
    && ["contact_receipt", "internal_contact", "newsletter_confirm", "newsletter_welcome"].includes(job.kind)
    && ["es", "en", "fr"].includes(job.locale) && validMailAddress(job.email)
    && /^[a-f0-9]{64}$/.test(job.email_hash) && typeof job.name === "string" && job.name.length <= 100
    && typeof job.message === "string" && job.message.length <= 2000
    && Number.isFinite(Date.parse(job.created_at)) && Number.isFinite(Date.parse(job.first_attempt_at))
    && Number.isInteger(job.attempts) && job.attempts >= 1 && job.attempts <= 5;
}
