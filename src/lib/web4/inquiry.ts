export type Inquiry = { kind: "interest" | "contact"; email: string; name: string; message: string; consent: true; locale: "es" | "en" };
export type InquiryValidation = { ok: true; value: Inquiry } | { ok: false; code: "INVALID_INPUT" | "CONSENT_REQUIRED" | "SPAM" };

export function validateInquiry(input: unknown): InquiryValidation {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, code: "INVALID_INPUT" };
  const data = input as Record<string, unknown>;
  if (data.website) return { ok: false, code: "SPAM" };
  if (data.consent !== true) return { ok: false, code: "CONSENT_REQUIRED" };
  if (data.kind !== "interest" && data.kind !== "contact") return { ok: false, code: "INVALID_INPUT" };
  if (data.locale !== "es" && data.locale !== "en") return { ok: false, code: "INVALID_INPUT" };
  if (typeof data.email !== "string" || typeof data.name !== "string" || typeof data.message !== "string") return { ok: false, code: "INVALID_INPUT" };
  const email = data.email.trim().toLowerCase();
  const name = data.name.trim();
  const message = data.message.trim();
  if (email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) || name.length > 100 || message.length > 2000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(name + message) || (data.kind === "contact" && message.length < 10)) return { ok: false, code: "INVALID_INPUT" };
  return { ok: true, value: { kind: data.kind, email, name, message, locale: data.locale, consent: true } };
}

export function inquiryConfigured(env: Record<string, string | undefined>): boolean {
  return env.VECTOR_FORMS_ENABLED === "true" && Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY && env.VECTOR_FORM_HASH_SECRET && env.VECTOR_FORM_HASH_SECRET.length >= 32);
}
