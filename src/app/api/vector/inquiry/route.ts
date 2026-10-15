import { createHmac } from "node:crypto";
import { inquiryConfigured, inquiryConsentVersion, newsletterConsentVersion, validateInquiry } from "@/lib/web4/inquiry";
import { inquiryReply, readInquiryJson } from "@/lib/web4/inquiry-http";
import { inquiryAddressHash, inquiryRpc } from "@/lib/web4/inquiry-storage";
import { scheduleMailAfterResponse } from "@/lib/web4/mail-after";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const body = await readInquiryJson(request);
  if (!body.ok) return body.response;
  const parsed = validateInquiry(body.value);
  if (!parsed.ok) return inquiryReply(parsed.code, 400);
  if (!inquiryConfigured(process.env)) return inquiryReply("SERVICE_UNAVAILABLE", 503);
  const hash = (value: string) => createHmac("sha256", process.env.VECTOR_FORM_HASH_SECRET!).update(value).digest("hex");
  const { email, name, message, kind, locale, newsletterConsent } = parsed.value;
  try {
    const result = await inquiryRpc("vector_submit_inquiry", {
      p_kind: kind, p_email: email, p_name: name, p_message: message, p_locale: locale,
      p_consent_version: inquiryConsentVersion, p_ip_hash: inquiryAddressHash(request), p_email_hash: hash(email),
      p_newsletter_consent: newsletterConsent,
      p_newsletter_consent_version: newsletterConsent ? newsletterConsentVersion : null,
    });
    if (result === "rate_limited") return inquiryReply("RATE_LIMITED", 429);
    if (result !== "accepted") return inquiryReply("SERVICE_UNAVAILABLE", 503);
    scheduleMailAfterResponse();
    return inquiryReply("ACCEPTED", 201);
  } catch { return inquiryReply("SERVICE_UNAVAILABLE", 503); }
}
