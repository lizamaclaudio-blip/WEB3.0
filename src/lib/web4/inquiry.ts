export const inquiryConsentVersion = "2026-10-v1";
export const newsletterConsentVersion = "2026-10-news-v1";
export type Inquiry = { kind: "interest" | "contact"; email: string; name: string; message: string; consent: true; newsletterConsent: boolean; locale: "es" | "en" | "fr" };
export type InquiryValidation = { ok: true; value: Inquiry } | { ok: false; code: "INVALID_INPUT" | "CONSENT_REQUIRED" | "SPAM" };

export function validateInquiry(input: unknown): InquiryValidation {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, code: "INVALID_INPUT" };
  const data = input as Record<string, unknown>;
  if (data.website) return { ok: false, code: "SPAM" };
  if (data.consent !== true) return { ok: false, code: "CONSENT_REQUIRED" };
  // Omitted means no opt-in. Reject truthy strings/numbers instead of subscribing.
  if (data.newsletterConsent !== undefined && typeof data.newsletterConsent !== "boolean") return { ok: false, code: "INVALID_INPUT" };
  if (data.kind !== "interest" && data.kind !== "contact") return { ok: false, code: "INVALID_INPUT" };
  if (data.locale !== "es" && data.locale !== "en" && data.locale !== "fr") return { ok: false, code: "INVALID_INPUT" };
  if (typeof data.email !== "string" || (data.name !== undefined && typeof data.name !== "string") || (data.message !== undefined && typeof data.message !== "string")) return { ok: false, code: "INVALID_INPUT" };
  const email = data.email.trim().toLowerCase();
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const message = typeof data.message === "string" ? data.message.trim() : "";
  if (email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) || name.length > 100 || message.length > 2000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(email + name + message) || (data.kind === "contact" && message.length < 10)) return { ok: false, code: "INVALID_INPUT" };
  return { ok: true, value: { kind: data.kind, email, name, message, locale: data.locale, consent: true, newsletterConsent: data.newsletterConsent === true } };
}

export function inquiryConfigured(env: Record<string, string | undefined>): boolean {
  const serverKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  if (env.VECTOR_FORMS_ENABLED !== "true" || !env.SUPABASE_URL || !serverKey || serverKey.startsWith("sb_publishable_") || !env.VECTOR_FORM_HASH_SECRET || env.VECTOR_FORM_HASH_SECRET.length < 32) return false;
  try {
    const url = new URL(env.SUPABASE_URL);
    return url.protocol === "https:" && !url.username && !url.password && url.pathname === "/" && !url.search && !url.hash;
  } catch { return false; }
}
