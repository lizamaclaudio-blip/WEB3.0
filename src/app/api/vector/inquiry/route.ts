import { createHmac } from "node:crypto";
import { inquiryConfigured, validateInquiry } from "@/lib/web4/inquiry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
function reply(code: string, status: number) { return Response.json({ ok: status === 201, code }, { status, headers }); }

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  // Next's standalone server can normalise request.url to its internal hostname.
  // The browser Origin must match the actual HTTP Host, not that internal URL.
  let source: URL;
  try { source = new URL(origin || ""); } catch { return reply("ORIGIN_REJECTED", 403); }
  const host = request.headers.get("host") || new URL(request.url).host;
  if (source.host !== host || !["http:", "https:"].includes(source.protocol)) return reply("ORIGIN_REJECTED", 403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return reply("INVALID_CONTENT_TYPE", 415);
  // Read a bounded stream, including when Content-Length is missing or forged.
  const reader = request.body?.getReader();
  if (!reader) return reply("INVALID_INPUT", 400);
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 8192) { await reader.cancel(); return reply("PAYLOAD_TOO_LARGE", 413); } chunks.push(value); }
    const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    let input: unknown;
    try { input = JSON.parse(new TextDecoder().decode(bytes)); } catch { return reply("INVALID_INPUT", 400); }
    const parsed = validateInquiry(input);
    if (!parsed.ok) return reply(parsed.code, 400);
    if (!inquiryConfigured(process.env)) return reply("SERVICE_UNAVAILABLE", 503);
    const endpoint = new URL(process.env.SUPABASE_URL!);
    if (endpoint.protocol !== "https:") return reply("SERVICE_UNAVAILABLE", 503);
    const hash = (value: string) => createHmac("sha256", process.env.VECTOR_FORM_HASH_SECRET!).update(value).digest("hex");
    // Vercel overwrites this header. Outside Vercel use one shared bucket, never trust caller-supplied IPs.
    const address = process.env.VERCEL === "1" ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || "unknown" : "local";
    const { email, name, message, kind, locale } = parsed.value;
    const response = await fetch(new URL("/rest/v1/rpc/vector_submit_inquiry", endpoint), { method: "POST", headers: { "Content-Type": "application/json", apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}` }, body: JSON.stringify({ p_kind: kind, p_email: email, p_name: name, p_message: message, p_locale: locale, p_consent_version: "2026-10-v1", p_ip_hash: hash(address), p_email_hash: hash(email) }), signal: AbortSignal.timeout(8000), cache: "no-store" });
    if (!response.ok) { console.error("[vector/inquiry] storage unavailable", response.status); return reply("SERVICE_UNAVAILABLE", 503); }
    const result: unknown = await response.json();
    if (result === "rate_limited") return reply("RATE_LIMITED", 429);
    if (result !== "accepted") return reply("SERVICE_UNAVAILABLE", 503);
    return reply("ACCEPTED", 201);
  } catch { return reply("SERVICE_UNAVAILABLE", 503); }
  finally { reader.releaseLock(); }
}
