import { inquiryConfigured } from "@/lib/web4/inquiry";
import { inquiryReply, readInquiryJson } from "@/lib/web4/inquiry-http";
import { inquiryAddressHash, inquiryRpc } from "@/lib/web4/inquiry-storage";
import { hashUnsubscribeToken, validUnsubscribeToken } from "@/lib/web4/newsletter";
import { scheduleMailAfterResponse } from "@/lib/web4/mail-after";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// A page visit / email scanner cannot confirm an address. Explicit POST only.
export async function POST(request: Request) {
  const body = await readInquiryJson(request, 1024);
  if (!body.ok) return body.response;
  if (!body.value || typeof body.value !== "object" || Array.isArray(body.value)) return inquiryReply("INVALID_INPUT", 400);
  const { token } = body.value as Record<string, unknown>;
  if (!validUnsubscribeToken(token)) return inquiryReply("INVALID_INPUT", 400);
  if (!inquiryConfigured(process.env)) return inquiryReply("SERVICE_UNAVAILABLE", 503);
  try {
    const result = await inquiryRpc("vector_confirm_newsletter", { p_token_hash: hashUnsubscribeToken(token), p_ip_hash: inquiryAddressHash(request) });
    if (result === "rate_limited") return inquiryReply("RATE_LIMITED", 429);
    if (result === "invalid_or_expired") return inquiryReply("INVALID_OR_EXPIRED", 410);
    if (result !== "confirmed") return inquiryReply("SERVICE_UNAVAILABLE", 503);
    scheduleMailAfterResponse();
    return inquiryReply("CONFIRMED", 200);
  } catch { return inquiryReply("SERVICE_UNAVAILABLE", 503); }
}
